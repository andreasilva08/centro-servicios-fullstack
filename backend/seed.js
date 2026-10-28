require('dotenv').config();

const { spawnSync } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const ensurePrincipalAdmin = require('./config/ensurePrincipalAdmin');

async function resetDatabaseAndCatalog() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI no está configurada.');
  await mongoose.connect(process.env.MONGO_URI);

  const User = require('./models/User');
  const Service = require('./models/Service');
  const Reservation = require('./models/Reservation');
  const Pago = require('./models/Pago');
  const Notificacion = require('./models/Notificacion');
  await Promise.all([User.init(), Service.init(), Reservation.init(), Pago.init(), Notificacion.init()]);

  await Promise.all([
    Notificacion.deleteMany({}),
    Pago.deleteMany({}),
    Reservation.deleteMany({}),
    Service.deleteMany({}),
    User.deleteMany({})
  ]);

  // Crear primero el administrador principal le da prioridad en el orden de registro.
  const admin = await ensurePrincipalAdmin();
  await connectDB.seedAdventureServices();
  const serviceCount = await Service.countDocuments();
  if (serviceCount !== 30) throw new Error(`El catálogo debe tener 30 servicios; se encontraron ${serviceCount}.`);
  console.log(`Base limpia. Administrador principal: ${admin.email}; servicios: ${serviceCount}.`);
}

async function run() {
  try {
    await resetDatabaseAndCatalog();
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }

  // El seeder relacionado crea 50 clientes, 140 reservas, 140 pagos y sus alertas.
  const result = spawnSync(process.execPath, [path.join(__dirname, 'seedReservas.js')], {
    stdio: 'inherit',
    env: process.env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status || 1;
}

run().catch(error => {
  console.error(`No se pudo completar la siembra definitiva (${error.name || 'Error'}): ${error.message}`);
  if (process.env.SEED_DEBUG === 'true') console.error(error.stack);
  process.exitCode = 1;
});
