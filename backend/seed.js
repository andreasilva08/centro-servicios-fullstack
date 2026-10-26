require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const seedServices = require('./seeders/adventureServices');

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI no está configurada.');
  await mongoose.connect(process.env.MONGO_URI);
  await connectDB.seedAdventureServices();
  const Service = require('./models/Service');
  const insertedCatalogCount = await Service.countDocuments({ seedKey: { $in: seedServices.map(({ seedKey }) => seedKey) } });
  console.log(`Servicios del catálogo disponibles: ${insertedCatalogCount}/${seedServices.length}`);
  await mongoose.disconnect();
  if (insertedCatalogCount !== seedServices.length) process.exitCode = 1;
}

run().catch(async error => {
  console.error(`No fue posible completar la precarga (${error.name || 'Error'}). Revisa la conexión MongoDB y MONGO_URI.`);
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
