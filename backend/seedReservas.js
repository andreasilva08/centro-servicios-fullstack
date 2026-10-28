require('dotenv').config();

const mongoose = require('mongoose');
const crypto = require('crypto');
const connectDB = require('./config/db');
const ensurePrincipalAdmin = require('./config/ensurePrincipalAdmin');
const catalog = require('./seeders/adventureServices');
const Reservation = require('./models/Reservation');
const Service = require('./models/Service');
const User = require('./models/User');
const Pago = require('./models/Pago');
const Notificacion = require('./models/Notificacion');

const RESERVATION_BATCH = 'reservas-demo-finanzas-2026-v4';
const USER_BATCH = 'usuarios-demo-finanzas-2026-v3';
const REFERENCE_DATE = new Date('2026-10-26T23:59:59-05:00');
const USER_COUNT = 50;
const PAYMENT_COUNTS = { aprobado: 60, reembolsado: 20, reembolsoPendiente: 10, digitalPendiente: 12, efectivoPendiente: 30, transferenciaPendiente: 15, rechazado: 5 };
const RESERVATION_COUNT = Object.values(PAYMENT_COUNTS).reduce((sum, count) => sum + count, 0);
const statusCounts = { completada: 20, confirmada: 40 + PAYMENT_COUNTS.reembolsoPendiente, cancelada: PAYMENT_COUNTS.reembolsado, pendiente: PAYMENT_COUNTS.digitalPendiente + PAYMENT_COUNTS.efectivoPendiente + PAYMENT_COUNTS.transferenciaPendiente + PAYMENT_COUNTS.rechazado };
const firstNames = ['Valentina', 'Santiago', 'Camila', 'Mateo', 'Isabella', 'Juan Pablo', 'Luciana', 'Andrés', 'Mariana', 'Nicolás', 'Sofía', 'Tomás', 'Catalina', 'Sebastián', 'Gabriela', 'Samuel', 'Manuela', 'David', 'Emily', 'Oliver', 'Sophie', 'Liam', 'Noah', 'Amélie', 'Daniela'];
const surnames = ['Rojas', 'Gómez', 'Rodríguez', 'Martínez', 'Hernández', 'López', 'García', 'Pérez', 'Ramírez', 'Torres', 'Flores', 'Castro', 'Vargas', 'Morales', 'Reyes', 'Herrera', 'Mendoza', 'Bennett', 'Miller', 'Johnson', 'Smith', 'Dubois', 'Silva', 'Costa', 'Brown'];
const origins = [
  ['Bogotá', 'Colombia'], ['Medellín', 'Colombia'], ['Cali', 'Colombia'], ['Bucaramanga', 'Colombia'],
  ['Barranquilla', 'Colombia'], ['Cartagena', 'Colombia'], ['Pereira', 'Colombia'], ['San José', 'Costa Rica'],
  ['Ciudad de México', 'México'], ['Lima', 'Perú'], ['Madrid', 'España'], ['Barcelona', 'España'],
  ['Miami', 'Estados Unidos'], ['Toronto', 'Canadá'], ['Santiago', 'Chile']
];
const notes = [
  'Primera visita a San Gil; confirmar equipo antes de salir.',
  'Viaja con su familia. Contactar al grupo en el punto de encuentro.',
  'Prefiere recibir instrucciones en inglés.',
  'Reporta experiencia previa en actividades de aventura.',
  'Grupo de amigos; confirmar transporte local.',
  'Solicita recomendaciones de hidratación para la ruta.'
];
const paymentMethods = [
  { key: 'tarjeta', label: 'Tarjeta de Crédito' }, { key: 'pse', label: 'PSE' },
  { key: 'nequi', label: 'Nequi' }, { key: 'daviplata', label: 'DaviPlata' },
  { key: 'efectivo', label: 'Efectivo' }, { key: 'transferencia', label: 'Transferencia Bancaria' }
];
const unresolvedStates = ['Pendiente', 'Pendiente de Validación en Oficina', 'Pendiente de Aprobación', 'Rechazado'];

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function randomDate(start, end) {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  date.setHours(7 + Math.floor(Math.random() * 10), Math.random() < 0.5 ? 0 : 30, 0, 0);
  return date;
}

function fakeProfile(index) {
  const first = firstNames[index % firstNames.length];
  const last = surnames[(index * 7 + Math.floor(index / firstNames.length)) % surnames.length];
  const secondLast = surnames[(index * 11 + 3) % surnames.length];
  const nombre = `${first} ${last} ${secondLast}`;
  const emailName = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  const [ciudadOrigen] = origins[(index * 3) % origins.length];
  const phonePrefix = ['+57 300 555', '+57 310 444', '+57 315 222', '+34 600 123', '+1 202 555'][index % 5];
  return {
    nombre,
    email: `${emailName}.${String(index + 1).padStart(3, '0')}@demo-viajeros.example`,
    password: 'DemoSanGil2026!',
    telefono: `${phonePrefix}${String(1000 + index).slice(-4)}`,
    ciudadOrigen,
    rol: 'cliente',
    estado: 'activo',
    seedBatch: USER_BATCH,
    seedKey: `${USER_BATCH}-${String(index + 1).padStart(3, '0')}`
  };
}

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI no está configurada.');
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.init(), Reservation.init(), Service.init(), Pago.init(), Notificacion.init()]);
  await connectDB.seedAdventureServices();

  const seedKeys = catalog.map(service => service.seedKey);
  const services = await Service.find({ seedKey: { $in: seedKeys } }).sort({ seedKey: 1 }).lean();
  if (services.length !== 30) throw new Error(`Se requieren los 30 servicios catalogados; se encontraron ${services.length}.`);
  if (!services.every(service => service?._id)) throw new Error('El catálogo contiene un servicio sin identificador de MongoDB.');

  // Mantiene este comando repetible sin tocar datos ajenos a este lote demo.
  const previousReservationBatches = [RESERVATION_BATCH, 'reservas-demo-finanzas-2026-v3', 'reservas-demo-75-2026-v2', 'reservas-demo-75-2026-v1'];
  const previousUserBatches = [USER_BATCH, 'usuarios-demo-finanzas-2026-v2', 'usuarios-demo-reservas-2026-v1'];
  await Pago.deleteMany({ seedBatch: { $in: previousReservationBatches } });
  await Reservation.deleteMany({ seedBatch: { $in: previousReservationBatches } });
  await Notificacion.deleteMany({ seedBatch: { $in: previousReservationBatches } });
  await User.deleteMany({ seedBatch: { $in: previousUserBatches } });

  const principalAdmin = await ensurePrincipalAdmin();
  await User.create(Array.from({ length: USER_COUNT }, (_, index) => fakeProfile(index)));
  const users = await User.find({ seedBatch: USER_BATCH }).sort({ seedKey: 1 }).lean();
  if (users.length !== USER_COUNT || !users.every(user => user?._id)) {
    throw new Error(`Se esperaban ${USER_COUNT} clientes guardados con _id; se encontraron ${users.length}.`);
  }
  const serviceRotation = shuffle(Array.from({ length: RESERVATION_COUNT }, (_, index) => services[index % services.length]));
  if (serviceRotation.length !== RESERVATION_COUNT || serviceRotation.some(service => !service?._id)) {
    throw new Error('No fue posible construir la lista de servicios con identificadores válidos.');
  }

  const approvedScenarios = shuffle([
    ...Array(statusCounts.completada).fill(null).map(() => ({ estado: 'completada', estadoPago: 'Aprobado' })),
    ...Array(statusCounts.confirmada - PAYMENT_COUNTS.reembolsoPendiente).fill(null).map(() => ({ estado: 'confirmada', estadoPago: 'Aprobado' }))
  ]).map((scenario, index) => ({ ...scenario, metodo: ['tarjeta', 'pse', 'nequi'][index % 3] }));
  const refundedScenarios = Array.from({ length: PAYMENT_COUNTS.reembolsado }, (_, index) => ({
    estado: 'cancelada', estadoPago: 'Reembolsado', metodo: ['tarjeta', 'pse', 'nequi', 'daviplata'][index % 4]
  }));
  const refundRequestScenarios = Array.from({ length: PAYMENT_COUNTS.reembolsoPendiente }, (_, index) => ({
    estado: 'confirmada', estadoPago: 'Pendiente de Reembolso', metodo: ['tarjeta', 'pse', 'nequi', 'daviplata'][index % 4]
  }));
  const digitalPendingScenarios = Array.from({ length: PAYMENT_COUNTS.digitalPendiente }, (_, index) => ({
    estado: 'pendiente', estadoPago: 'Pendiente', metodo: ['tarjeta', 'pse', 'nequi'][index % 3]
  }));
  const cashScenarios = Array.from({ length: PAYMENT_COUNTS.efectivoPendiente }, () => ({ estado: 'pendiente', estadoPago: 'Pendiente de Validaci\u00f3n en Oficina', metodo: 'efectivo' }));
  const transferScenarios = Array.from({ length: PAYMENT_COUNTS.transferenciaPendiente }, () => ({ estado: 'pendiente', estadoPago: 'Pendiente de Aprobaci\u00f3n', metodo: 'transferencia' }));
  const rejectedScenarios = Array.from({ length: PAYMENT_COUNTS.rechazado }, (_, index) => ({
    estado: 'pendiente', estadoPago: 'Rechazado', metodo: ['tarjeta', 'pse', 'nequi', 'daviplata', 'transferencia'][index]
  }));
  const scenarios = [...approvedScenarios, ...refundedScenarios, ...refundRequestScenarios, ...digitalPendingScenarios, ...cashScenarios, ...transferScenarios, ...rejectedScenarios];
  const recentStart = RESERVATION_COUNT - PAYMENT_COUNTS.transferenciaPendiente - PAYMENT_COUNTS.rechazado;

  if (users.length === 0 || services.length === 0 || scenarios.length !== RESERVATION_COUNT) {
    throw new Error('No se puede crear el lote: faltan usuarios, servicios o escenarios de pago.');
  }

  const reservations = scenarios.map(({ estado, estadoPago, metodo: methodKey }, index) => {
    const service = serviceRotation[index];
    const user = users[index % users.length];
    if (!user?._id || !service?._id) throw new Error(`Falta el _id del usuario o servicio en la reserva ${index + 1}.`);
    const metodo = paymentMethods.find(item => item.key === methodKey);
    if (!metodo) throw new Error(`Método de pago desconocido en el escenario ${index + 1}: ${methodKey}.`);
    const participantes = 1 + Math.floor(Math.random() * 6);
    const seguroMedico = Math.random() < 0.25;
    const paid = ['Aprobado', 'Reembolsado', 'Pendiente de Reembolso'].includes(estadoPago);
    const refunded = estadoPago === 'Reembolsado';
    let fecha;
    if (estado === 'completada') fecha = randomDate(new Date('2026-01-02T07:00:00-05:00'), new Date('2026-09-30T17:00:00-05:00'));
    else if (estado === 'pendiente') fecha = randomDate(new Date('2026-10-27T07:00:00-05:00'), new Date('2026-12-31T17:00:00-05:00'));
    else if (estado === 'cancelada') fecha = randomDate(new Date('2026-01-02T07:00:00-05:00'), new Date('2026-10-05T17:00:00-05:00'));
    else if (index % 2 === 0) fecha = randomDate(new Date('2026-10-27T07:00:00-05:00'), new Date('2026-12-31T17:00:00-05:00'));
    else fecha = randomDate(new Date('2026-01-02T07:00:00-05:00'), new Date('2026-10-05T17:00:00-05:00'));

    const pagadoEn = paid
      ? (estado === 'confirmada' && fecha > REFERENCE_DATE
        ? new Date(REFERENCE_DATE.getTime() - (1 + Math.floor(Math.random() * 20)) * 86400000)
        : new Date(fecha.getTime() - 86400000))
      : null;
    const reservationPaymentState = ['Aprobado', 'Pendiente de Reembolso'].includes(estadoPago) ? 'aprobado'
      : refunded ? 'reembolsado'
        : estadoPago === 'Rechazado' ? 'rechazado'
          : estadoPago === 'Pendiente' ? 'pendiente_pago'
          : estadoPago === 'Pendiente de Validaci\u00f3n en Oficina' ? 'pendiente_validacion_oficina'
            : 'pendiente_aprobacion';

    return {
      seedBatch: RESERVATION_BATCH,
      seedKey: `${RESERVATION_BATCH}-${String(index + 1).padStart(3, '0')}`,
      usuario: user._id,
      clienteSnapshot: {
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        ciudadOrigen: user.ciudadOrigen,
        paisOrigen: origins.find(([city]) => city === user.ciudadOrigen)?.[1] || 'Colombia'
      },
      servicio: service._id,
      fecha,
      observaciones: notes[Math.floor(Math.random() * notes.length)],
      participantes,
      nivelExperiencia: ['Principiante', 'Intermedio', 'Avanzado', 'Experto'][Math.floor(Math.random() * 4)],
      seguroMedico,
      precioUnitario: service.precio,
      precioTotal: (service.precio + (seguroMedico ? 15000 : 0)) * participantes,
      estado,
      estadoPago: reservationPaymentState,
      metodoPago: metodo.key,
      pagadoEn,
      ticketCode: paid ? `#SAN-GIL-DEMO-2026-${String(index + 1).padStart(3, '0')}` : undefined,
      ...(estado === 'cancelada' ? { canceladaEn: new Date(fecha.getTime() - 3600000), motivoCancelacion: 'Cancelación de demostración con trazabilidad de auditoría.' } : {})
    };
  });

  await Reservation.insertMany(reservations, { ordered: true });
  const savedReservations = await Reservation.find({ seedBatch: RESERVATION_BATCH }).sort({ seedKey: 1 }).lean();
  if (savedReservations.length !== RESERVATION_COUNT || !savedReservations.every(reservation => reservation?._id && reservation.usuario && reservation.servicio)) {
    throw new Error(`Se esperaban ${RESERVATION_COUNT} reservas persistidas con usuario, servicio y _id válidos; se encontraron ${savedReservations.length}.`);
  }
  const savedPayments = await Pago.insertMany(savedReservations.map((reservation, index) => {
    const scenario = scenarios[index];
    const method = paymentMethods.find(item => item.key === scenario.metodo);
    const isRecent = index >= recentStart;
    const fechaPago = isRecent
      ? new Date(REFERENCE_DATE.getTime() - (RESERVATION_COUNT - 1 - index) * 3600000)
      : reservation.pagadoEn || new Date(REFERENCE_DATE.getTime() - (index + 1) * 86400000);
    const pago = {
      reservaId: reservation._id,
      clienteId: reservation.usuario,
      monto: reservation.precioTotal,
      metodoPago: method.label,
      referenciaTransaccion: `TXN-2026-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      estadoPago: scenario.estadoPago,
      fechaPago,
      seedBatch: RESERVATION_BATCH,
      seedKey: `${RESERVATION_BATCH}-payment-${String(index + 1).padStart(3, '0')}`
    };
    if (method.key === 'transferencia') pago.comprobanteReferencia = `COMPROBANTE-BANCO-${String(index + 1).padStart(5, '0')}`;
    if (scenario.estadoPago === 'Rechazado') pago.motivoRechazo = index % 2 ? 'Comprobante inválido; solicitar una nueva referencia.' : 'Transacción rechazada por la entidad financiera.';
    if (scenario.estadoPago === 'Reembolsado') {
      pago.fechaReembolso = new Date(fechaPago.getTime() + 86400000);
      pago.referenciaReembolso = `REF-2026-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
      pago.motivoReembolso = 'Devolución por cancelación registrada en la reserva.';
    }
    if (scenario.estadoPago === 'Pendiente de Reembolso') {
      pago.fechaSolicitudReembolso = new Date(fechaPago.getTime() + 3600000);
      pago.motivoSolicitudReembolso = ['Cambio de planes del grupo.', 'Solicitud por ajuste de itinerario.', 'No podremos asistir en la fecha reservada.', 'Solicitud de devolución por fuerza mayor.'][index % 4];
    }
    return pago;
  }), { ordered: true });

  const seededNotifications = savedReservations.flatMap((reservation, index) => {
    const refundRequested = scenarios[index].estadoPago === 'Pendiente de Reembolso';
    if (reservation.estado !== 'pendiente' && !refundRequested) return [];
    return [{
      destinatarioRol: 'admin',
      tipo: refundRequested ? 'solicitud_reembolso' : 'reserva_pendiente',
      titulo: refundRequested ? 'Solicitud de reembolso por revisar' : 'Reserva de demostración por revisar',
      mensaje: refundRequested
        ? `${reservation.clienteSnapshot.nombre} solicita devolver ${Number(reservation.precioTotal).toLocaleString('es-CO')} COP.`
        : `${reservation.clienteSnapshot.nombre} · ${paymentMethods.find(item => item.key === reservation.metodoPago).label} · ${savedPayments[index].estadoPago} · ${Number(reservation.precioTotal).toLocaleString('es-CO')} COP.`,
      pagoId: savedPayments[index]._id,
      reservaId: reservation._id,
      leida: false,
      seedBatch: RESERVATION_BATCH,
      seedKey: `${RESERVATION_BATCH}-notification-${String(index + 1).padStart(3, '0')}`
    }];
  });
  await Notificacion.insertMany(seededNotifications, { ordered: true });

  const [createdUsers, createdReservations, paymentRecords, notificationRecords, adminRecord, approvedCount, refundedCount, refundRequestCount, rejectedCount, cashCount, transferCount, distinctServices, linkedReservations, uniqueReferences, approvedMethodCounts] = await Promise.all([
    User.countDocuments({ seedBatch: USER_BATCH }),
    Reservation.countDocuments({ seedBatch: RESERVATION_BATCH }),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH }),
    Notificacion.countDocuments({ seedBatch: RESERVATION_BATCH }),
    User.findOne({ _id: principalAdmin._id, rol: 'admin', estado: 'activo' }).select('_id'),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, estadoPago: 'Aprobado' }),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, estadoPago: 'Reembolsado' }),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, estadoPago: 'Pendiente de Reembolso' }),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, estadoPago: 'Rechazado' }),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, metodoPago: 'Efectivo', estadoPago: 'Pendiente de Validación en Oficina' }),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, metodoPago: 'Transferencia Bancaria', estadoPago: 'Pendiente de Aprobación', comprobanteReferencia: { $ne: '' } }),
    Reservation.distinct('servicio', { seedBatch: RESERVATION_BATCH }),
    Pago.distinct('reservaId', { seedBatch: RESERVATION_BATCH }),
    Pago.distinct('referenciaTransaccion', { seedBatch: RESERVATION_BATCH }),
    Pago.aggregate([{ $match: { seedBatch: RESERVATION_BATCH, estadoPago: 'Aprobado' } }, { $group: { _id: '$metodoPago', count: { $sum: 1 } } }])
  ]);
  const latestAttempts = await Pago.find({ seedBatch: RESERVATION_BATCH }).sort({ fechaPago: -1 }).limit(20).select('estadoPago metodoPago comprobanteReferencia').lean();
  const digitalPendingLabels = ['tarjeta', 'pse', 'nequi'].map(key => paymentMethods.find(method => method.key === key).label);
  const digitalPendingCounts = await Pago.aggregate([
    { $match: { seedBatch: RESERVATION_BATCH, estadoPago: 'Pendiente', metodoPago: { $in: digitalPendingLabels } } },
    { $group: { _id: '$metodoPago', cantidad: { $sum: 1 } } }
  ]);
  const digitalPendingByMethod = Object.fromEntries(digitalPendingCounts.map(item => [item._id, item.cantidad]));
  const digitalPendingCount = digitalPendingCounts.reduce((total, item) => total + item.cantidad, 0);
  const refundRequestRecords = await Pago.find({ seedBatch: RESERVATION_BATCH, estadoPago: 'Pendiente de Reembolso' })
    .populate('reservaId', 'usuario')
    .populate('clienteId', '_id')
    .lean();
  const refundRequestsLinked = refundRequestRecords.length === PAYMENT_COUNTS.reembolsoPendiente
    && refundRequestRecords.every(payment => payment.reservaId && payment.clienteId && String(payment.reservaId.usuario) === String(payment.clienteId._id));
  const latestAreExpected = latestAttempts.length === 20
    && latestAttempts.filter(payment => payment.estadoPago === 'Pendiente de Aprobación' && payment.metodoPago === 'Transferencia Bancaria' && payment.comprobanteReferencia).length === PAYMENT_COUNTS.transferenciaPendiente
    && latestAttempts.filter(payment => payment.estadoPago === 'Rechazado').length === PAYMENT_COUNTS.rechazado;
  const approvedByMethod = Object.fromEntries(approvedMethodCounts.map(item => [item._id, item.count]));
  const expectedAlerts = statusCounts.pendiente + PAYMENT_COUNTS.reembolsoPendiente;
  const allMethodsPresent = paymentMethods.every(method => savedPayments.some(payment => payment.metodoPago === method.label));

  if (!adminRecord || createdUsers !== USER_COUNT || createdReservations !== RESERVATION_COUNT || paymentRecords !== RESERVATION_COUNT
    || notificationRecords !== expectedAlerts || approvedCount !== PAYMENT_COUNTS.aprobado || refundedCount !== PAYMENT_COUNTS.reembolsado
    || refundRequestCount !== PAYMENT_COUNTS.reembolsoPendiente || digitalPendingCount !== PAYMENT_COUNTS.digitalPendiente
    || digitalPendingLabels.some(method => (digitalPendingByMethod[method] || 0) !== PAYMENT_COUNTS.digitalPendiente / 3)
    || rejectedCount !== PAYMENT_COUNTS.rechazado || cashCount !== PAYMENT_COUNTS.efectivoPendiente || transferCount !== PAYMENT_COUNTS.transferenciaPendiente
    || ['Tarjeta de Crédito', 'PSE', 'Nequi'].some(method => (approvedByMethod[method] || 0) < 20)
    || !allMethodsPresent || distinctServices.length !== 30 || linkedReservations.length !== RESERVATION_COUNT
    || uniqueReferences.length !== RESERVATION_COUNT || !latestAreExpected || !refundRequestsLinked) {
    throw new Error(`Verificación fallida: admin=${Boolean(adminRecord)}, usuarios=${createdUsers}, reservas=${createdReservations}, pagos=${paymentRecords}, alertas=${notificationRecords}, aprobados=${approvedCount}, reembolsados=${refundedCount}, efectivo=${cashCount}, transferencias=${transferCount}, rechazados=${rejectedCount}, servicios=${distinctServices.length}, referencias=${uniqueReferences.length}.`);
  }

  console.log(`Siembra sincronizada: admin ${principalAdmin.email}, ${createdUsers} clientes, ${createdReservations} reservas y pagos en ${distinctServices.length} servicios.`);
  console.log(`Finanzas: ${approvedCount} aprobados (Tarjeta/PSE/Nequi: ${approvedByMethod['Tarjeta de Crédito']}/${approvedByMethod.PSE}/${approvedByMethod.Nequi}), ${refundedCount} reembolsados, ${refundRequestCount} solicitudes de reembolso pendientes, ${cashCount} efectivo pendiente de validación, ${transferCount} transferencias por aprobar y ${rejectedCount} rechazados.`);
  console.log(`Se crearon ${notificationRecords} alertas: ${statusCounts.pendiente} reservas pendientes y ${PAYMENT_COUNTS.reembolsoPendiente} solicitudes de reembolso; los últimos 20 pagos incluyen ${PAYMENT_COUNTS.transferenciaPendiente} transferencias con comprobante y ${PAYMENT_COUNTS.rechazado} rechazos.`);
}

run()
  .catch(error => {
    console.error(`No se pudo completar la siembra (${error.name || 'Error'}): ${error.message}`);
    if (process.env.SEED_DEBUG === 'true') console.error(error.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => {});
  });
