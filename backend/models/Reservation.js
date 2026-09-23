const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    servicio: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    fecha: { type: Date, required: true },
    estado: { type: String, default: 'confirmada' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reservation', reservationSchema);