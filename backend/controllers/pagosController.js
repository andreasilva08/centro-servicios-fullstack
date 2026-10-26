const crypto = require('crypto');
const mongoose = require('mongoose');
const Pago = require('../models/Pago');
const Reservation = require('../models/Reservation');
const Notificacion = require('../models/Notificacion');
const { getFinancialMetrics } = require('../services/financialMetrics');

const paymentMethods = ['Tarjeta de Cr\u00e9dito', 'PSE', 'Nequi', 'DaviPlata', 'Efectivo', 'Transferencia Bancaria', 'Transferencia'];
const reviewStates = ['Pendiente', 'Pendiente de Validaci\u00f3n en Oficina', 'Pendiente de Aprobaci\u00f3n'];
const transactionReference = prefix => `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
const reservationMethod = {
  'Tarjeta de Cr\u00e9dito': 'tarjeta', PSE: 'pse', Nequi: 'nequi', DaviPlata: 'daviplata',
  Efectivo: 'efectivo', 'Transferencia Bancaria': 'transferencia', Transferencia: 'transferencia'
};
const paymentPopulate = [
  { path: 'clienteId', select: 'nombre email telefono' },
  { path: 'reservaId', select: 'fecha precioTotal ticketCode estado estadoPago servicio clienteSnapshot', populate: { path: 'servicio', select: 'nombre' } }
];

async function notify(data) {
  try { await Notificacion.create(data); } catch (error) { console.error('No se pudo registrar una notificacion:', error.message); }
}

const listPayments = async (req, res) => {
  try {
    const query = {};
    if (req.query.metodoPago && req.query.metodoPago !== 'todos') {
      if (!paymentMethods.includes(req.query.metodoPago)) return res.status(400).json({ mensaje: 'Metodo de pago invalido.' });
      query.metodoPago = req.query.metodoPago;
    }
    if (req.query.estadoPago === 'requiere_revision') query.estadoPago = { $in: reviewStates };
    else if (req.query.estadoPago && req.query.estadoPago !== 'todos') {
      const validStates = ['Aprobado', 'Rechazado', ...reviewStates, 'Pendiente de Reembolso', 'Reembolsado'];
      if (!validStates.includes(req.query.estadoPago)) return res.status(400).json({ mensaje: 'Estado de pago invalido.' });
      query.estadoPago = req.query.estadoPago;
    }
    const payments = await Pago.find(query).populate(paymentPopulate).sort({ fechaPago: -1, _id: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron consultar los pagos.', error: error.message });
  }
};

const getPaymentSummary = async (req, res) => {
  try {
    const finanzas = await getFinancialMetrics();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.json(finanzas);
  } catch (error) {
    return res.status(500).json({ mensaje: 'No se pudo consultar el resumen financiero.', error: error.message });
  }
};

const reviewPayment = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ mensaje: 'Solo administracion puede validar pagos.' });
    const payment = await Pago.findById(req.params.id);
    if (!payment) return res.status(404).json({ mensaje: 'Pago no encontrado.' });
    if (!reviewStates.includes(payment.estadoPago)) return res.status(409).json({ mensaje: 'El pago ya fue procesado.' });
    const reservation = await Reservation.findById(payment.reservaId);
    if (!reservation) return res.status(404).json({ mensaje: 'La reserva asociada no existe.' });
    if (['cancelada', 'completada'].includes(reservation.estado)) return res.status(409).json({ mensaje: 'No se puede validar el pago de una reserva en estado final.' });

    if (req.body.estadoPago === 'Aprobado') {
      const existing = await Pago.exists({ reservaId: reservation._id, estadoPago: 'Aprobado' });
      if (existing) return res.status(409).json({ mensaje: 'La reserva ya tiene otro pago aprobado.' });
      const ticketCode = reservation.ticketCode || `#SAN-GIL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const now = new Date();
      const oldPaymentState = payment.estadoPago;
      const nextReservationState = reservation.estado;
      const commit = async session => {
        const approved = await Pago.findOneAndUpdate(
          { _id: payment._id, estadoPago: oldPaymentState },
          { $set: { estadoPago: 'Aprobado', motivoRechazo: '', fechaRevision: now, revisadoPor: req.user._id } },
          { new: true, ...(session ? { session } : {}) }
        );
        if (!approved) throw Object.assign(new Error('El pago fue actualizado por otra operacion.'), { status: 409 });
        const updatedReservation = await Reservation.findOneAndUpdate(
          { _id: reservation._id, estado: nextReservationState },
          { $set: { estado: 'confirmada', estadoPago: 'aprobado', metodoPago: reservationMethod[payment.metodoPago] || '', pagadoEn: now, ticketCode } },
          { new: true, runValidators: true, ...(session ? { session } : {}) }
        );
        if (!updatedReservation) throw Object.assign(new Error('La reserva cambio durante la validacion.'), { status: 409 });
        return { approved, updatedReservation };
      };
      let result;
      const topology = mongoose.connection.client?.topology?.description?.type;
      if (topology === 'ReplicaSetWithPrimary' || topology === 'Sharded') {
        const session = await mongoose.startSession();
        try { await session.withTransaction(async () => { result = await commit(session); }); }
        finally { await session.endSession(); }
      } else {
        const approved = await Pago.findOneAndUpdate({ _id: payment._id, estadoPago: oldPaymentState }, { $set: { estadoPago: 'Aprobado', motivoRechazo: '', fechaRevision: now, revisadoPor: req.user._id } }, { new: true });
        if (!approved) return res.status(409).json({ mensaje: 'El pago fue actualizado por otra operacion.' });
        const updatedReservation = await Reservation.findOneAndUpdate(
          { _id: reservation._id, estado: nextReservationState },
          { $set: { estado: 'confirmada', estadoPago: 'aprobado', metodoPago: reservationMethod[payment.metodoPago] || '', pagadoEn: now, ticketCode } },
          { new: true, runValidators: true }
        );
        if (!updatedReservation) {
          await Pago.updateOne({ _id: payment._id, estadoPago: 'Aprobado' }, { $set: { estadoPago: oldPaymentState, motivoRechazo: payment.motivoRechazo || '', fechaRevision: payment.fechaRevision || null, revisadoPor: payment.revisadoPor || null } });
          return res.status(409).json({ mensaje: 'La reserva cambio durante la validacion.' });
        }
        result = { approved, updatedReservation };
      }
      await Pago.updateMany({ reservaId: reservation._id, _id: { $ne: payment._id }, estadoPago: { $in: reviewStates } }, { $set: { estadoPago: 'Rechazado', motivoRechazo: 'Se aprobo otro pago para la reserva.' } });
      if (payment.clienteId) await notify({ destinatarioRol: 'cliente', destinatarioUsuario: payment.clienteId, tipo: 'pago_aprobado', titulo: 'Pago aprobado', mensaje: 'Tu pago fue aprobado. La reserva quedo confirmada y tu ticket QR esta listo.', pagoId: payment._id, reservaId: reservation._id });
      return res.json({ mensaje: 'Pago aprobado y reserva confirmada.', pago: result.approved, reserva: result.updatedReservation });
    }

    const motivo = String(req.body.motivoRechazo || '').trim();
    if (motivo.length < 4) return res.status(400).json({ mensaje: 'Indique un motivo de rechazo de al menos 4 caracteres.' });
    const rejected = await Pago.findOneAndUpdate(
      { _id: payment._id, estadoPago: payment.estadoPago },
      { $set: { estadoPago: 'Rechazado', motivoRechazo: motivo, fechaRevision: new Date(), revisadoPor: req.user._id } },
      { new: true }
    );
    if (!rejected) return res.status(409).json({ mensaje: 'El pago fue actualizado por otra operacion.' });
    await Reservation.updateOne({ _id: reservation._id, estado: 'pendiente' }, { $set: { estadoPago: 'rechazado' } });
    if (payment.clienteId) await notify({ destinatarioRol: 'cliente', destinatarioUsuario: payment.clienteId, tipo: 'pago_rechazado', titulo: 'Pago rechazado', mensaje: `No pudimos validar tu pago: ${motivo}. Puedes intentar con otro metodo.`, pagoId: payment._id, reservaId: reservation._id });
    return res.json({ mensaje: 'Pago rechazado y cliente notificado.', pago: rejected, reserva });
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message || 'No se pudo revisar el pago.' });
  }
};

const refundPayment = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ mensaje: 'Solo administracion puede procesar reembolsos.' });
    const motivo = String(req.body.motivoReembolso || '').trim();
    if (motivo.length < 4) return res.status(400).json({ mensaje: 'Indique un motivo de reembolso de al menos 4 caracteres.' });
    const payment = await Pago.findById(req.params.id);
    if (!payment) return res.status(404).json({ mensaje: 'Pago no encontrado.' });
    if (!['Aprobado', 'Pendiente de Reembolso'].includes(payment.estadoPago)) return res.status(409).json({ mensaje: 'El pago no está aprobado ni tiene una solicitud de reembolso pendiente.' });
    const reservation = await Reservation.findById(payment.reservaId);
    if (!reservation) return res.status(404).json({ mensaje: 'La reserva asociada no existe.' });
    if (!['confirmada', 'pendiente', 'cancelada'].includes(reservation.estado)) return res.status(409).json({ mensaje: 'La reserva no admite reembolso desde su estado actual.' });
    const now = new Date();
    const reference = transactionReference('REF');
    const previousState = payment.estadoPago;
    const refunded = await Pago.findOneAndUpdate(
      { _id: payment._id, estadoPago: previousState },
      { $set: { estadoPago: 'Reembolsado', fechaReembolso: now, fechaDecisionReembolso: now, referenciaReembolso: reference, motivoReembolso: motivo, revisadoPor: req.user._id } },
      { new: true }
    );
    if (!refunded) return res.status(409).json({ mensaje: 'El pago cambio durante el reembolso.' });
    const cancelled = await Reservation.findOneAndUpdate(
      { _id: reservation._id, estado: reservation.estado },
      { $set: { estado: 'cancelada', estadoPago: 'reembolsado', canceladaEn: now, motivoCancelacion: motivo } },
      { new: true, runValidators: true }
    );
    if (!cancelled) {
      await Pago.updateOne({ _id: payment._id, estadoPago: 'Reembolsado' }, { $set: { estadoPago: previousState, fechaReembolso: null, fechaDecisionReembolso: null, referenciaReembolso: '', motivoReembolso: '', revisadoPor: payment.revisadoPor || null } });
      return res.status(409).json({ mensaje: 'La reserva cambio; se revirtio el registro del reembolso.' });
    }
    if (payment.clienteId) await notify({ destinatarioRol: 'cliente', destinatarioUsuario: payment.clienteId, tipo: 'reembolso', titulo: 'Reembolso procesado', mensaje: `Se proceso el reembolso ${reference} por ${payment.monto.toLocaleString('es-CO')} COP.`, pagoId: payment._id, reservaId: reservation._id });
    const populated = await Pago.findById(refunded._id).populate(paymentPopulate);
    res.json({ mensaje: 'Reembolso registrado y reserva cancelada.', pago: populated, reserva: cancelled });
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message || 'No se pudo procesar el reembolso.' });
  }
};

const rejectRefundRequest = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ mensaje: 'Solo administración puede revisar solicitudes de reembolso.' });
    const motivo = String(req.body.motivo || '').trim();
    if (motivo.length < 4) return res.status(400).json({ mensaje: 'Indique un motivo de rechazo de al menos 4 caracteres.' });
    const payment = await Pago.findOneAndUpdate(
      { _id: req.params.id, estadoPago: 'Pendiente de Reembolso' },
      { $set: { estadoPago: 'Aprobado', motivoRechazoReembolso: motivo, fechaDecisionReembolso: new Date(), revisadoPor: req.user._id } },
      { new: true }
    );
    if (!payment) return res.status(409).json({ mensaje: 'La solicitud ya fue procesada o no existe.' });
    if (payment.clienteId) await notify({ destinatarioRol: 'cliente', destinatarioUsuario: payment.clienteId, tipo: 'reembolso_rechazado', titulo: 'Solicitud de reembolso no aprobada', mensaje: `No fue posible aprobar tu solicitud de reembolso: ${motivo}`, pagoId: payment._id, reservaId: payment.reservaId });
    res.json({ mensaje: 'Solicitud de reembolso rechazada y cliente notificado.', pago: payment });
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message || 'No se pudo revisar la solicitud de reembolso.' });
  }
};

module.exports = { listPayments, getPaymentSummary, reviewPayment, refundPayment, rejectRefundRequest };
