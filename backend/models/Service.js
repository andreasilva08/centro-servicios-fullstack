const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    precio: { type: Number, required: true },
    duracion: { type: Number, required: true },
    estado: { type: String, default: 'disponible' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);