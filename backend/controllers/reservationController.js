const mongoose = require('mongoose');
const crypto = require('crypto');
const Reservation = require('../models/Reservation');
const Service = require('../models/Service');
const User = require('../models/User');
const Pago = require('../models/Pago');
const Notificacion = require('../models/Notificacion');
const INSURANCE_PRICE = 15000;
const populate = [{ path: 'usuario', select: 'nombre email telefono' }, { path: 'servicio', select: 'nombre precio duracion imageUrl' }];
const ticketCode = async () => {
  let code;
  do { code = `#SAN-GIL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; }
  while (await Reservation.exists({ ticketCode: code }));
  return code;
};
const reservationResponse = (reservation, pagoAprobado, reembolsoPendiente = false) => {
  const item = reservation.toObject();
  return { ...item, ...(pagoAprobado === undefined ? {} : { pagoAprobado }), reembolsoPendiente, id: reservation._id, fechaHora: reservation.fecha, clienteNombre: reservation.usuario?.nombre || reservation.clienteSnapshot?.nombre || 'Cliente de oficina', clienteEmail: reservation.usuario?.email || reservation.clienteSnapshot?.email || '', clienteTelefono: reservation.usuario?.telefono || reservation.clienteSnapshot?.telefono || '', servicioNombre: reservation.servicio?.nombre || '' };
};
const paymentMethods = {
  tarjeta: 'Tarjeta de Crédito',
  pse: 'PSE',
  nequi: 'Nequi',
  daviplata: 'DaviPlata',
  efectivo: 'Efectivo',
  transferencia: 'Transferencia Bancaria'
};
const transactionReference = () => `TXN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

async function createNotification(data) {
  try { await Notificacion.create(data); } catch (error) { console.error('No se pudo registrar una notificacion:', error.message); }
}

async function notifyAdmins(payment, reservation) {
  return createNotification({
    destinatarioRol: 'admin', tipo: 'pago_recibido', titulo: 'Nuevo movimiento de pago',
    mensaje: `${reservation.clienteSnapshot?.nombre || 'Un cliente'} registro ${payment.metodoPago} por $${payment.monto.toLocaleString('es-CO')} COP.`,
    pagoId: payment._id, reservaId: reservation._id
  });
}

async function notifyCustomerPaymentApproved(payment, reservation, ticket) {
  if (!reservation.usuario) return;
  return createNotification({
    destinatarioRol: 'cliente', destinatarioUsuario: reservation.usuario, tipo: 'pago_aprobado',
    titulo: 'Pago aprobado y ticket listo',
    mensaje: `Tu pago fue aprobado. La reserva está confirmada y tu ticket QR ${ticket} está listo.`,
    pagoId: payment._id, reservaId: reservation._id
  });
}

async function createPendingPayment(reservation, metodo, comprobanteReferencia, reservationFilter) {
  const methodLabel = paymentMethods[metodo];
  if (!methodLabel) { const error = new Error('Metodo de pago no valido.'); error.status = 400; throw error; }
  if (metodo === 'transferencia' && (!comprobanteReferencia || String(comprobanteReferencia).trim().length < 4)) {
    const error = new Error('Indique una referencia valida del comprobante de transferencia.'); error.status = 400; throw error;
  }
  const paymentState = metodo === 'efectivo' ? 'Pendiente de Validación en Oficina' : metodo === 'transferencia' ? 'Pendiente de Aprobación' : 'Pendiente';
  const reservationPaymentState = metodo === 'efectivo' ? 'pendiente_validacion_oficina' : 'pendiente_aprobacion';
  const payment = await Pago.create({
    reservaId: reservation._id, clienteId: reservation.usuario || null, monto: reservation.precioTotal,
    metodoPago: methodLabel, referenciaTransaccion: transactionReference(), estadoPago: paymentState,
    fechaPago: new Date(), comprobanteReferencia: String(comprobanteReferencia || '').trim()
  });
  const updated = await Reservation.findOneAndUpdate(reservationFilter, {
    $set: { estado: 'pendiente', estadoPago: reservationPaymentState, metodoPago: metodo }
  }, { new: true, runValidators: true });
  if (!updated) {
    await payment.deleteOne();
    const error = new Error('La reserva ya no esta pendiente o fue modificada por otra operacion.'); error.status = 409; throw error;
  }
  await notifyAdmins(payment, reservation);
  return { payment, reservation: updated };
}

async function confirmWithPayment(reservation, metodo, reservationFilter = { _id: reservation._id, estado: 'pendiente' }) {
  const approvedPayment = await Pago.findOne({ reservaId: reservation._id, estadoPago: 'Aprobado' });
  const paymentMethodToUse = metodo || Object.keys(paymentMethods).find(key => paymentMethods[key] === approvedPayment?.metodoPago);
  const canonicalMethod = paymentMethods[paymentMethodToUse];
  if (!canonicalMethod) {
    const error = new Error('Seleccione un método de pago válido.');
    error.status = 400;
    throw error;
  }
  const now = new Date();
  const ticket = reservation.ticketCode || await ticketCode();
  const updates = {
    estado: 'confirmada', estadoPago: 'aprobado', metodoPago: paymentMethodToUse,
    pagadoEn: reservation.pagadoEn || now, ticketCode: ticket
  };
  const paymentData = {
    reservaId: reservation._id,
    clienteId: reservation.usuario || null,
    monto: reservation.precioTotal,
    metodoPago: canonicalMethod,
    referenciaTransaccion: transactionReference(),
    estadoPago: 'Aprobado',
    fechaPago: now
  };
  const commit = async session => {
    if (!approvedPayment) await Pago.create([paymentData], session ? { session } : undefined);
    const updated = await Reservation.findOneAndUpdate(
      reservationFilter,
      { $set: updates },
      { new: true, runValidators: true, ...(session ? { session } : {}) }
    );
    if (!updated) {
      const error = new Error('La reserva ya no está pendiente o fue modificada por otra operación.');
      error.status = 409;
      throw error;
    }
    return updated;
  };

  const topology = mongoose.connection.client?.topology?.description?.type;
  if (topology === 'ReplicaSetWithPrimary' || topology === 'Sharded') {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => { result = await commit(session); });
      if (!approvedPayment) {
        const payment = await Pago.findOne({ reservaId: reservation._id, estadoPago: 'Aprobado' });
        if (payment) await Promise.all([notifyAdmins(payment, reservation), notifyCustomerPaymentApproved(payment, reservation, ticket)]);
      }
      return result;
    } finally { await session.endSession(); }
  }

  // Standalone MongoDB does not support multi-document transactions; compensate on failure.
  let createdPayment = null;
  try {
    if (!approvedPayment) createdPayment = await Pago.create(paymentData);
    const updated = await commitWithoutPaymentCreate();
    if (createdPayment) await Promise.all([notifyAdmins(createdPayment, reservation), notifyCustomerPaymentApproved(createdPayment, reservation, ticket)]);
    return updated;
  } catch (error) {
    if (createdPayment) {
      const currentReservation = await Reservation.findById(reservation._id).select('estado').catch(() => null);
      if (!['confirmada', 'completada'].includes(currentReservation?.estado)) await createdPayment.deleteOne().catch(() => {});
    }
    throw error;
  }

  async function commitWithoutPaymentCreate() {
    const updated = await Reservation.findOneAndUpdate(reservationFilter, { $set: updates }, { new: true, runValidators: true });
    if (!updated) {
      const error = new Error('La reserva ya no está pendiente o fue modificada por otra operación.');
      error.status = 409;
      throw error;
    }
    return updated;
  }
}

const listReservations = async (req, res) => {
  try {
    const query = req.user.rol === 'admin' ? {} : { usuario: req.user._id };
    if (req.query.estado && req.query.estado !== 'todos') query.estado = req.query.estado;
    const items = await Reservation.find(query).populate(populate).sort({ fecha: 1 });
    const relatedPayments = await Pago.find({ estadoPago: { $in: ['Aprobado', 'Pendiente de Reembolso'] }, reservaId: { $in: items.map(item => item._id) } }).select('reservaId estadoPago').lean();
    const paidReservationIds = relatedPayments.filter(payment => payment.estadoPago === 'Aprobado').map(payment => String(payment.reservaId));
    const refundPendingIds = new Set(relatedPayments.filter(payment => payment.estadoPago === 'Pendiente de Reembolso').map(payment => String(payment.reservaId)));
    const approvedIds = new Set(paidReservationIds.map(id => String(id)));
    res.json(items.map(item => reservationResponse(item, approvedIds.has(String(item._id)), refundPendingIds.has(String(item._id)))));
  } catch (error) { res.status(500).json({ mensaje: 'No se pudieron consultar las reservas', error: error.message }); }
};
const createReservation = async (req, res) => {
  try {
    const { servicio } = req.body;
    const date = new Date(req.body.fechaHora ?? req.body.fecha);
    if (!mongoose.isValidObjectId(servicio) || Number.isNaN(date.getTime()) || date <= new Date()) return res.status(400).json({ mensaje: 'Seleccione un servicio y una fecha futura válida.' });
    const activeService = await Service.findOne({ _id: servicio, estado: 'activo' });
    if (!activeService) return res.status(400).json({ mensaje: 'El servicio seleccionado no está disponible.' });
    const participantes = Number(req.body.participantes || 1);
    const nivelExperiencia = req.body.nivelExperiencia || 'Principiante';
    const seguroMedico = req.body.seguroMedico === true;
    if (!Number.isInteger(participantes) || participantes < 1 || participantes > 20 || !['Principiante', 'Intermedio', 'Avanzado', 'Experto'].includes(nivelExperiencia)) {
      return res.status(400).json({ mensaje: 'Verifique el número de participantes y el nivel de experiencia.' });
    }
    let cliente = null;
    let clienteSnapshot;
    if (req.user.rol === 'admin') {
      if (req.body.usuario) {
        cliente = await User.findOne({ _id: req.body.usuario, rol: 'cliente', estado: 'activo' }).select('nombre email telefono');
        if (!cliente) return res.status(400).json({ mensaje: 'Seleccione un cliente activo válido.' });
        clienteSnapshot = { nombre: cliente.nombre, email: cliente.email, telefono: cliente.telefono || '' };
      } else {
        const guest = req.body.clienteInvitado || {};
        const nombre = String(guest.nombre || '').trim();
        const email = String(guest.email || '').trim().toLowerCase();
        const telefono = String(guest.telefono || '').trim();
        if (!nombre || (!email && !telefono) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return res.status(400).json({ mensaje: 'Para una venta de oficina indique nombre y al menos correo o teléfono válidos.' });
        clienteSnapshot = { nombre, email, telefono };
      }
    } else {
      cliente = req.user;
      clienteSnapshot = { nombre: cliente.nombre, email: cliente.email, telefono: cliente.telefono || '' };
    }

    const pagoDirecto = req.user.rol === 'admin' && req.body.pagoDirecto === true;
    const metodoPago = pagoDirecto ? req.body.metodoPago : '';
    if (pagoDirecto && !['efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata', 'pse'].includes(metodoPago)) return res.status(400).json({ mensaje: 'Seleccione un método válido para registrar el pago presencial.' });
    let reservation = await Reservation.create({
      usuario: cliente?._id || null, clienteSnapshot, servicio, fecha: date, observaciones: req.body.observaciones || '',
      participantes, nivelExperiencia, seguroMedico, precioUnitario: activeService.precio,
      precioTotal: (activeService.precio + (seguroMedico ? INSURANCE_PRICE : 0)) * participantes,
      estado: 'pendiente', estadoPago: 'pendiente_pago'
    });
    if (pagoDirecto) {
      try { reservation = await confirmWithPayment(reservation, metodoPago); }
      catch (error) {
        const currentReservation = await Reservation.findById(reservation._id).catch(() => null);
        const approvedPayment = await Pago.exists({ reservaId: reservation._id, estadoPago: 'Aprobado' }).catch(() => false);
        if (currentReservation?.estado === 'pendiente' && !approvedPayment) await currentReservation.deleteOne();
        throw error;
      }
    } else if (req.user.rol === 'cliente') {
      await createNotification({
        destinatarioRol: 'admin', tipo: 'reserva_pendiente', titulo: 'Nueva reserva pendiente',
        mensaje: `${clienteSnapshot.nombre} solicitó ${activeService.nombre} para ${date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}.`,
        reservaId: reservation._id
      });
    }
    await reservation.populate(populate);
    res.status(201).json(reservationResponse(reservation, pagoDirecto));
  } catch (error) { res.status(400).json({ mensaje: 'No se pudo crear la reserva', error: error.message }); }
};
const updateReservation = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ mensaje: 'Solo un administrador puede actualizar el estado de una reserva.' });
    const allowedFields = ['estado', 'registrarPago', 'metodoPago', 'asistenciaConfirmada'];
    if (Object.keys(req.body || {}).some(field => !allowedFields.includes(field))) return res.status(403).json({ mensaje: 'Los datos de la reserva son de solo lectura.' });
    const nextState = req.body.estado;
    if (!['pendiente', 'confirmada', 'completada', 'cancelada'].includes(nextState)) return res.status(400).json({ mensaje: 'Estado de reserva invalido.' });
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ mensaje: 'Reserva no encontrada.' });
    const currentState = reservation.estado;
    if (['completada', 'cancelada'].includes(currentState)) return res.status(409).json({ mensaje: 'Las reservas completadas o canceladas son estados finales.' });
    if (nextState === currentState) return res.status(400).json({ mensaje: 'La reserva ya se encuentra en ese estado.' });
    const validTransition = currentState === 'pendiente'
      ? ['confirmada', 'cancelada'].includes(nextState)
      : currentState === 'confirmada' && ['completada', 'cancelada'].includes(nextState);
    if (!validTransition) return res.status(409).json({ mensaje: `No se permite pasar de ${currentState} a ${nextState}.` });

    if (nextState === 'confirmada') {
      const approvedPayment = await Pago.findOne({ reservaId: reservation._id, estadoPago: 'Aprobado' });
      if (!approvedPayment && req.body.registrarPago !== true) return res.status(400).json({ mensaje: 'No se puede confirmar: esta reserva no tiene un pago aprobado registrado.' });
      const existingMethod = Object.keys(paymentMethods).find(key => paymentMethods[key] === approvedPayment?.metodoPago);
      const paymentStateFilter = reservation.estadoPago === 'aprobado'
        ? { estadoPago: 'aprobado' }
        : { $or: [{ estadoPago: 'pendiente_pago' }, { estadoPago: { $exists: false } }] };
      const confirmed = await confirmWithPayment(
        reservation,
        existingMethod || req.body.metodoPago,
        { _id: reservation._id, estado: currentState, ...paymentStateFilter }
      );
      await confirmed.populate(populate);
      return res.json(reservationResponse(confirmed, true));
    }
    const updates = { estado: nextState };
    if (nextState === 'completada') {
      if (req.body.asistenciaConfirmada !== true) return res.status(400).json({ mensaje: 'Confirme la asistencia antes de completar la reserva.' });
      if (!await Pago.exists({ reservaId: reservation._id, estadoPago: 'Aprobado' })) return res.status(409).json({ mensaje: 'No se puede completar una reserva sin un pago aprobado registrado.' });
      updates.estadoPago = 'aprobado';
      if (!reservation.ticketCode) updates.ticketCode = await ticketCode();
    }

    const paymentStateFilter = reservation.estadoPago === 'aprobado'
      ? { estadoPago: 'aprobado' }
      : { $or: [{ estadoPago: 'pendiente_pago' }, { estadoPago: { $exists: false } }] };
    const updated = await Reservation.findOneAndUpdate(
      { _id: reservation._id, estado: currentState, ...paymentStateFilter },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate(populate);
    if (!updated) return res.status(409).json({ mensaje: 'La reserva cambio mientras se procesaba. Recargue e intente nuevamente.' });
    res.json(reservationResponse(updated));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message || 'No se pudo actualizar el estado de la reserva.' });
  }
};

const validCardNumber = value => {
  const digits = String(value || '').replace(/\s/g, '');
  if (!/^\d{16}$/.test(digits)) return false;
  let sum = 0;
  for (let index = digits.length - 1, position = 0; index >= 0; index--, position++) {
    let digit = Number(digits[index]);
    if (position % 2 === 1) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
  }
  return sum % 10 === 0;
};

const payReservation = async (req, res) => {
  try {
    if (req.user.rol !== 'cliente') return res.status(403).json({ mensaje: 'El checkout simulado está disponible para clientes.' });
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ mensaje: 'Reserva no encontrada.' });
    if (String(reservation.usuario) !== String(req.user._id)) return res.status(403).json({ mensaje: 'No puede pagar una reserva de otro cliente.' });
    if (reservation.estado !== 'pendiente') return res.status(409).json({ mensaje: 'Solo se pueden pagar reservas pendientes.' });

    const metodoPago = req.body.metodoPago;
    if (!Object.hasOwn(paymentMethods, metodoPago)) return res.status(400).json({ mensaje: 'Seleccione un metodo de pago valido.' });
    if (['efectivo', 'transferencia'].includes(metodoPago)) {
      const result = await createPendingPayment(reservation, metodoPago, req.body.comprobanteReferencia, { _id: reservation._id, usuario: req.user._id, estado: 'pendiente' });
      await result.reservation.populate(populate);
      const mensaje = metodoPago === 'efectivo' ? 'Pago pendiente de validacion en oficina.' : 'Comprobante enviado para aprobacion.';
      return res.status(202).json({ mensaje, pago: result.payment, reserva: reservationResponse(result.reservation, false) });
    }
    if (metodoPago === 'tarjeta') {
      const [month, year] = String(req.body.vencimiento || '').split('/');
      const expiry = new Date(2000 + Number(year), Number(month), 0, 23, 59, 59);
      if (!validCardNumber(req.body.numeroTarjeta) || !/^\d{2}\/\d{2}$/.test(String(req.body.vencimiento || '')) || Number(month) < 1 || Number(month) > 12 || expiry <= new Date() || !/^\d{3,4}$/.test(String(req.body.cvv || ''))) {
        return res.status(400).json({ mensaje: 'Verifique los datos de la tarjeta. No se guardan datos financieros.' });
      }
    } else if (['nequi', 'daviplata', 'pse'].includes(metodoPago)) {
      const celular = String(req.body.celular || '').replace(/\D/g, '');
      if (!/^3\d{9}$/.test(celular)) return res.status(400).json({ mensaje: 'Ingrese un celular colombiano de 10 dígitos.' });
      const registered = String(req.user.telefono || '').replace(/\D/g, '').slice(-10);
      if (!registered) return res.status(400).json({ mensaje: 'Registre su número celular en Mi Perfil antes de pagar por este método.' });
      if (registered && registered !== celular) return res.status(400).json({ mensaje: 'Use el número celular registrado en su perfil.' });
    }

    const paidReservation = await confirmWithPayment(reservation, metodoPago, { _id: reservation._id, usuario: req.user._id, estado: 'pendiente' });
    if (!paidReservation) return res.status(409).json({ mensaje: 'La reserva ya no está pendiente de pago.' });
    await paidReservation.populate(populate);
    const payment = await Pago.findOne({ reservaId: reservation._id, estadoPago: 'Aprobado' }).sort({ fechaPago: -1 });
    res.json({ mensaje: 'Pago simulado aprobado.', pago: payment, reserva: reservationResponse(paidReservation, true) });
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message || 'No se pudo procesar el pago simulado.' });
  }
};

const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    if (req.user.rol !== 'admin' && String(reservation.usuario) !== String(req.user._id)) return res.status(403).json({ mensaje: 'No tiene permisos para cancelar esta reserva' });
    if (['completada', 'cancelada'].includes(reservation.estado)) return res.status(409).json({ mensaje: 'Las reservas completadas o canceladas son estados finales.' });
    const paid = req.user.rol !== 'admin' && reservation.estado === 'confirmada'
      ? await Pago.exists({ reservaId: reservation._id, estadoPago: 'Aprobado' })
      : false;
    if (paid) return res.status(409).json({ mensaje: 'Las reservas pagadas deben cancelarse mediante una solicitud de reembolso.' });
    if (req.user.rol !== 'admin' && reservation.estado !== 'pendiente' && !paid) return res.status(400).json({ mensaje: 'Solo puede cancelar reservas pendientes o confirmadas con pago aprobado.' });
    const reason = String(req.body?.motivo || '').trim() || (paid ? 'Solicitud de cancelacion del cliente; reembolso pendiente de revision.' : 'Cancelada por el cliente.');
    const now = new Date();
    const cancelled = await Reservation.findOneAndUpdate(
      { _id: reservation._id, estado: reservation.estado },
      { $set: { estado: 'cancelada', canceladaEn: now, motivoCancelacion: reason } },
      { new: true, runValidators: true }
    );
    if (!cancelled) return res.status(409).json({ mensaje: 'La reserva cambio mientras se procesaba. Recargue e intente nuevamente.' });
    if (paid) await createNotification({ destinatarioRol: 'admin', tipo: 'reserva_cancelada', titulo: 'Solicitud de reembolso', mensaje: `${reservation.clienteSnapshot?.nombre || req.user.nombre} cancelo una reserva pagada. Revisa el pago para procesar el reembolso.`, reservaId: reservation._id });
    res.json({ mensaje: 'Reserva cancelada', reserva: cancelled });
  } catch (error) { res.status(400).json({ mensaje: 'No se pudo cancelar la reserva', error: error.message }); }
};

const requestRefund = async (req, res) => {
  try {
    if (req.user.rol !== 'cliente') return res.status(403).json({ mensaje: 'La solicitud de reembolso está disponible para clientes.' });
    const motivo = String(req.body.motivo || '').trim();
    if (motivo.length < 5) return res.status(400).json({ mensaje: 'Escribe un motivo de al menos 5 caracteres.' });
    const reservation = await Reservation.findOne({ _id: req.params.id, usuario: req.user._id });
    if (!reservation) return res.status(404).json({ mensaje: 'No se encontró la reserva de tu cuenta.' });
    if (reservation.estado !== 'confirmada') return res.status(409).json({ mensaje: 'Solo puedes solicitar reembolso para una reserva confirmada.' });
    const payment = await Pago.findOneAndUpdate(
      { reservaId: reservation._id, estadoPago: 'Aprobado' },
      { $set: { estadoPago: 'Pendiente de Reembolso', fechaSolicitudReembolso: new Date(), motivoSolicitudReembolso: motivo, motivoRechazoReembolso: '' } },
      { new: true }
    );
    if (!payment) return res.status(409).json({ mensaje: 'La reserva no tiene un pago aprobado disponible para reembolso, o ya existe una solicitud en curso.' });
    try {
      await Notificacion.create({
        destinatarioRol: 'admin', tipo: 'solicitud_reembolso', titulo: 'Solicitud de reembolso',
        mensaje: `${reservation.clienteSnapshot?.nombre || req.user.nombre} solicita reembolso de $${payment.monto.toLocaleString('es-CO')} COP. Motivo: ${motivo}`,
        pagoId: payment._id, reservaId: reservation._id
      });
    } catch (notificationError) {
      await Pago.updateOne(
        { _id: payment._id, estadoPago: 'Pendiente de Reembolso' },
        { $set: { estadoPago: 'Aprobado', fechaSolicitudReembolso: null, motivoSolicitudReembolso: '' } }
      );
      return res.status(503).json({ mensaje: 'No se pudo avisar a administración. La solicitud no quedó registrada; inténtalo de nuevo.' });
    }
    await createNotification({
      destinatarioRol: 'cliente', destinatarioUsuario: req.user._id, tipo: 'solicitud_reembolso', titulo: 'Solicitud recibida',
      mensaje: 'Recibimos tu solicitud de reembolso. Te avisaremos cuando administración la revise.',
      pagoId: payment._id, reservaId: reservation._id
    });
    res.status(202).json({ mensaje: 'Solicitud de reembolso enviada a administración.', pago: payment });
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message || 'No se pudo enviar la solicitud de reembolso.' });
  }
};
const deleteReservation = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ mensaje: 'Solo un administrador puede eliminar reservas.' });
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    if (req.user.rol !== 'admin' && String(reservation.usuario) !== String(req.user._id)) return res.status(403).json({ mensaje: 'No tiene permisos para eliminar esta reserva.' });
    if (await Pago.exists({ reservaId: reservation._id, estadoPago: 'Aprobado' })) return res.status(409).json({ mensaje: 'No se puede eliminar una reserva con pagos registrados; cancele la reserva para conservar la trazabilidad financiera.' });
    await reservation.deleteOne();
    res.json({ mensaje: 'Reserva eliminada correctamente', id: reservation._id });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo eliminar la reserva', error: error.message });
  }
};
module.exports = { listReservations, createReservation, updateReservation, payReservation, cancelReservation, requestRefund, deleteReservation };
