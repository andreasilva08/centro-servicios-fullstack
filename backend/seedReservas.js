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

const RESERVATION_BATCH = 'reservas-demo-finanzas-2026-v3';
const USER_BATCH = 'usuarios-demo-finanzas-2026-v2';
const REFERENCE_DATE = new Date('2026-10-26T23:59:59-05:00');
const USER_COUNT = 50;
const RESERVATION_COUNT = 80;
const statusCounts = { completada: 20, confirmada: 25, cancelada: 15, pendiente: 20 };
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
  const services = await Service.find({ seedKey: { $in: seedKeys } }).sort({ seedKey: 1 });
  if (services.length !== 30) throw new Error(`Se requieren los 30 servicios catalogados; se encontraron ${services.length}.`);

  // Remove only this seeder's previous records and the immediately preceding demo batch.
  await Pago.deleteMany({ $or: [{ seedBatch: RESERVATION_BATCH }, { seedBatch: 'reservas-demo-75-2026-v2' }, { seedBatch: 'reservas-demo-75-2026-v1' }] });
  await Reservation.deleteMany({ $or: [{ seedBatch: RESERVATION_BATCH }, { seedBatch: 'reservas-demo-75-2026-v2' }, { seedBatch: 'reservas-demo-75-2026-v1' }] });
  await Notificacion.deleteMany({ seedBatch: { $in: [RESERVATION_BATCH, 'reservas-demo-75-2026-v2', 'reservas-demo-75-2026-v1'] } });
  await User.deleteMany({ $or: [{ seedBatch: USER_BATCH }, { seedBatch: 'usuarios-demo-reservas-2026-v1' }] });

  const principalAdmin = await ensurePrincipalAdmin();
  const users = await User.create(Array.from({ length: USER_COUNT }, (_, index) => fakeProfile(index)));
  const serviceRotation = shuffle(Array.from({ length: RESERVATION_COUNT }, (_, index) => services[index % services.length]));
  const regularStates = shuffle([
    ...Array(statusCounts.completada).fill('completada'),
    ...Array(statusCounts.confirmada).fill('confirmada'),
    ...Array(statusCounts.cancelada).fill('cancelada')
  ]);
  const statuses = [...regularStates, ...Array(statusCounts.pendiente).fill('pendiente')];
  const recentPaymentStates = shuffle([
    'Pendiente', 'Pendiente', 'Pendiente', 'Pendiente', 'Pendiente',
    'Pendiente de Validación en Oficina', 'Pendiente de Validación en Oficina', 'Pendiente de Validación en Oficina',
    'Pendiente de Aprobación', 'Pendiente de Aprobación',
    ...Array(10).fill('Rechazado')
  ]);

  const reservations = statuses.map((estado, index) => {
    const service = serviceRotation[index];
    const user = users[index % users.length];
    const participantes = 1 + Math.floor(Math.random() * 6);
    const seguroMedico = Math.random() < 0.25;
    const paid = ['confirmada', 'completada'].includes(estado);
    const refunded = estado === 'cancelada';
    let fecha;
    if (estado === 'completada') fecha = randomDate(new Date('2026-01-02T07:00:00-05:00'), new Date('2026-09-30T17:00:00-05:00'));
    else if (estado === 'pendiente') fecha = randomDate(new Date('2026-10-27T07:00:00-05:00'), new Date('2026-12-31T17:00:00-05:00'));
    else if (estado === 'cancelada') fecha = randomDate(new Date('2026-01-02T07:00:00-05:00'), new Date('2026-10-05T17:00:00-05:00'));
    else if (index % 2 === 0) fecha = randomDate(new Date('2026-10-27T07:00:00-05:00'), new Date('2026-12-31T17:00:00-05:00'));
    else fecha = randomDate(new Date('2026-01-02T07:00:00-05:00'), new Date('2026-10-05T17:00:00-05:00'));

    const unresolvedState = estado === 'pendiente' ? recentPaymentStates[index - regularStates.length] : null;
    const metodo = unresolvedState === 'Pendiente de Validación en Oficina'
      ? paymentMethods.find(item => item.key === 'efectivo')
      : unresolvedState === 'Pendiente de Aprobación'
        ? paymentMethods.find(item => item.key === 'transferencia')
        : paymentMethods[(index * 7) % paymentMethods.length];
    const pagadoEn = paid || refunded
      ? (paid && fecha > REFERENCE_DATE
        ? new Date(REFERENCE_DATE.getTime() - (1 + Math.floor(Math.random() * 20)) * 86400000)
        : new Date(fecha.getTime() - 86400000))
      : null;
    const unresolved = unresolvedState;
    const estadoPago = refunded ? 'reembolsado' : paid ? 'aprobado' : unresolved === 'Rechazado' ? 'rechazado' : unresolved === 'Pendiente de Validación en Oficina' ? 'pendiente_validacion_oficina' : unresolved === 'Pendiente de Aprobación' ? 'pendiente_aprobacion' : 'pendiente_pago';
    const cancelled = estado === 'cancelada';

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
      estadoPago,
      metodoPago: metodo.key,
      pagadoEn,
      ticketCode: paid || refunded ? `#SAN-GIL-DEMO-2026-${String(index + 1).padStart(3, '0')}` : undefined,
      ...(cancelled ? { canceladaEn: new Date(fecha.getTime() - 3600000), motivoCancelacion: 'Cancelación registrada para demostración y trazabilidad de auditoría.' } : {})
    };
  });

  const savedReservations = await Reservation.insertMany(reservations, { ordered: true });
  const savedPayments = await Pago.insertMany(savedReservations.map((reservation, index) => {
    const isRecent = index >= regularStates.length;
    const method = paymentMethods.find(item => item.key === reservation.metodoPago);
    const estadoPago = isRecent
      ? recentPaymentStates[index - regularStates.length]
      : reservation.estado === 'cancelada' ? 'Reembolsado' : 'Aprobado';
    const fechaPago = isRecent
      ? new Date(REFERENCE_DATE.getTime() - (statuses.length - 1 - index) * 3600000)
      : reservation.pagadoEn || new Date(REFERENCE_DATE.getTime() - (index + 1) * 86400000);
    const pago = {
      reservaId: reservation._id,
      clienteId: reservation.usuario,
      monto: reservation.precioTotal,
      metodoPago: method.label,
      referenciaTransaccion: `TXN-2026-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      estadoPago,
      fechaPago,
      seedBatch: RESERVATION_BATCH,
      seedKey: `${RESERVATION_BATCH}-payment-${String(index + 1).padStart(3, '0')}`
    };
    if (method.key === 'transferencia') pago.comprobanteReferencia = `COMPROBANTE-BANCO-${String(index + 1).padStart(5, '0')}`;
    if (estadoPago === 'Rechazado') pago.motivoRechazo = index % 2 ? 'Comprobante inválido; solicitar una nueva referencia.' : 'Transacción rechazada por la entidad financiera.';
    if (estadoPago === 'Reembolsado') {
      pago.fechaReembolso = new Date(fechaPago.getTime() + 86400000);
      pago.referenciaReembolso = `REF-2026-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
      pago.motivoReembolso = 'Devolución por cancelación registrada en la reserva.';
    }
    return pago;
  }), { ordered: true });

  const seededNotifications = savedReservations.flatMap((reservation, index) => reservation.estado === 'pendiente' ? [{
    destinatarioRol: 'admin',
    tipo: 'reserva_pendiente',
    titulo: 'Reserva de demostración por revisar',
    mensaje: `${reservation.clienteSnapshot.nombre} · ${paymentMethods.find(item => item.key === reservation.metodoPago).label} · ${savedPayments[index].estadoPago} · ${Number(reservation.precioTotal).toLocaleString('es-CO')} COP.`,
    pagoId: savedPayments[index]._id,
    reservaId: reservation._id,
    leida: false,
    seedBatch: RESERVATION_BATCH,
    seedKey: `${RESERVATION_BATCH}-notification-${String(index + 1).padStart(3, '0')}`
  }] : []);
  await Notificacion.insertMany(seededNotifications, { ordered: true });

  const [createdUsers, createdReservations, paymentRecords, notificationRecords, adminRecord, approvedCount, refundedCount, rejectedCount, distinctServices, linkedReservations, uniqueReferences] = await Promise.all([
    User.countDocuments({ seedBatch: USER_BATCH }),
    Reservation.countDocuments({ seedBatch: RESERVATION_BATCH }),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH }),
    Notificacion.countDocuments({ seedBatch: RESERVATION_BATCH }),
    User.findOne({ _id: principalAdmin._id, rol: 'admin', estado: 'activo' }).select('_id'),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, estadoPago: 'Aprobado' }),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, estadoPago: 'Reembolsado' }),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, estadoPago: 'Rechazado' }),
    Reservation.distinct('servicio', { seedBatch: RESERVATION_BATCH }),
    Pago.distinct('reservaId', { seedBatch: RESERVATION_BATCH }),
    Pago.distinct('referenciaTransaccion', { seedBatch: RESERVATION_BATCH })
  ]);
  const [paymentMethodCounts, pendingCount, officeValidationCount, bankApprovalCount] = await Promise.all([
    Pago.aggregate([{ $match: { seedBatch: RESERVATION_BATCH } }, { $group: { _id: '$metodoPago', count: { $sum: 1 } } }]),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, estadoPago: 'Pendiente' }),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, estadoPago: 'Pendiente de Validación en Oficina' }),
    Pago.countDocuments({ seedBatch: RESERVATION_BATCH, estadoPago: 'Pendiente de Aprobación' })
  ]);
  const methodsPresent = new Set(paymentMethodCounts.map(item => item._id));
  const latestAttempts = await Pago.find({ seedBatch: RESERVATION_BATCH }).sort({ fechaPago: -1 }).limit(20).select('estadoPago').lean();
  const latestAreUnresolved = latestAttempts.length === 20 && latestAttempts.every(payment => unresolvedStates.includes(payment.estadoPago));
  const unresolvedCount = latestAttempts.filter(payment => unresolvedStates.includes(payment.estadoPago)).length;
  const allMethodsPresent = paymentMethods.every(method => methodsPresent.has(method.label));
  if (!adminRecord || createdUsers !== USER_COUNT || createdReservations !== RESERVATION_COUNT || paymentRecords !== RESERVATION_COUNT || notificationRecords !== statusCounts.pendiente || approvedCount !== 45 || refundedCount !== 15 || rejectedCount !== 10 || pendingCount !== 5 || officeValidationCount !== 3 || bankApprovalCount !== 2 || unresolvedCount !== 20 || !allMethodsPresent || distinctServices.length !== 30 || linkedReservations.length !== RESERVATION_COUNT || uniqueReferences.length !== RESERVATION_COUNT || !latestAreUnresolved) {
    throw new Error(`Verificación fallida: admin=${Boolean(adminRecord)}, usuarios=${createdUsers}, reservas=${createdReservations}, pagos=${paymentRecords}, alertas=${notificationRecords}, aprobados=${approvedCount}, reembolsados=${refundedCount}, pendientes=${pendingCount}/${officeValidationCount}/${bankApprovalCount}, rechazados=${rejectedCount}, métodos=${paymentMethodCounts.length}, servicios=${distinctServices.length}, refs=${uniqueReferences.length}.`);
  }

  console.log(`Siembra sincronizada: admin principal ${principalAdmin.email}, ${createdUsers} clientes, ${createdReservations} reservas, ${paymentRecords} pagos y ${notificationRecords} alertas en ${distinctServices.length} servicios.`);
  console.log(`Estados financieros: aprobados=${approvedCount}, reembolsados=${refundedCount}, rechazados=${rejectedCount}, pendientes recientes=${unresolvedCount}.`);
  console.log(`Estados de reserva: ${Object.entries(statusCounts).map(([status, count]) => `${status}=${count}`).join(', ')}; últimos 20 pagos requieren revisión.`);
  console.log('Cuentas de prueba: contraseña compartida DemoSanGil2026!; correos bajo @demo-viajeros.example.');
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
