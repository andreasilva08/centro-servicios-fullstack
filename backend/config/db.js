const mongoose = require('mongoose');
const seedServices = require('../seeders/adventureServices');
const ensurePrincipalAdmin = require('./ensurePrincipalAdmin');

const seedAdventureServices = async () => {
  const Service = require('../models/Service');
  await Service.init();
  const legacyNames = [
    ['Rafting Extremo Río Fonce', 'san-gil-rafting-fonce-nivel-3'],
    ['Parapente Cañón del Chicamocha', 'san-gil-parapente-chicamocha'],
    ['Espeleología Cueva de la Vaca', 'san-gil-espeleologia-cueva-vaca']
  ];
  for (const [legacyName, seedKey] of legacyNames) {
    const service = seedServices.find(item => item.seedKey === seedKey);
    await Service.updateOne({ nombre: legacyName, seedKey: { $exists: false } }, { $set: service });
  }

  await Promise.all(seedServices.map(service => {
    const { seedKey, nombre, categoria, descripcion, precio, duracion, imageUrl } = service;
    return Service.updateOne(
      { seedKey },
      { $set: { nombre, categoria, descripcion, precio, duracion, imageUrl }, $setOnInsert: { seedKey, estado: 'activo' } },
      { upsert: true, runValidators: true }
    );
  }));
  console.log(`Precarga de experiencias completada: ${seedServices.length}`);
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(` MongoDB Conectado: ${conn.connection.host}`);
    await ensurePrincipalAdmin();
    await seedAdventureServices();
  } catch (error) {
    console.error(` Error de conexión a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

connectDB.seedAdventureServices = seedAdventureServices;

module.exports = connectDB;
