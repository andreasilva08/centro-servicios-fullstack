const mongoose = require('mongoose');

// Esquema de Servicios (HUS-05)
const serviceSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del servicio es obligatorio'],
      trim: true
    },
    descripcion: {
      type: String,
      default: ''
    },
    precio: {
      type: Number,
      required: [true, 'El precio del servicio es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    },
    duracion: {
      type: Number,
      required: [true, 'La duración en minutos es obligatoria'],
      min: [1, 'La duración debe ser al menos 1 minuto']
    },
    estado: {
      type: String,
      enum: ['disponible', 'no disponible'],
      default: 'disponible'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);