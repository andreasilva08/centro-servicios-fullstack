const serviceCategories = [...new Set(require('../seeders/adventureServices').map(service => service.categoria))];
const mongoose = require('mongoose');

// Esquema de Servicios (HUS-05)
const serviceSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, trim: true, default: '' },
    requisitosFisicos: { type: String, trim: true, maxlength: 500, default: '' },
    restriccionesEdad: { type: String, trim: true, maxlength: 300, default: '' },
    incluye: { type: String, trim: true, maxlength: 500, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    categoria: { type: String, enum: serviceCategories, default: serviceCategories[0] },
    seedKey: { type: String, unique: true, sparse: true },
    precio: { type: Number, required: true, min: 0 },
    duracion: { type: Number, required: true, min: 1 },
    estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
