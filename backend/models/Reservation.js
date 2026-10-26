const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    clienteSnapshot: {
      nombre: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
      telefono: { type: String, trim: true, default: '' },
      ciudadOrigen: { type: String, trim: true, default: '' },
      paisOrigen: { type: String, trim: true, default: '' }
    },
    servicio: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    fecha: { type: Date, required: true },
    observaciones: { type: String, trim: true, maxlength: 500, default: '' },
    participantes: { type: Number, required: true, min: 1, max: 20, default: 1 },
    nivelExperiencia: { type: String, enum: ['Principiante', 'Intermedio', 'Avanzado', 'Experto'], default: 'Principiante' },
    seguroMedico: { type: Boolean, default: false },
    precioUnitario: { type: Number, min: 0, default: 0 },
    precioTotal: { type: Number, min: 0, default: 0 },
    estado: { type: String, enum: ['pendiente', 'confirmada', 'completada', 'cancelada'], default: 'pendiente' },
    estadoPago: { type: String, enum: ['pendiente_pago', 'pendiente_validacion_oficina', 'pendiente_aprobacion', 'rechazado', 'aprobado', 'reembolsado'], default: 'pendiente_pago' },
    metodoPago: { type: String, enum: ['tarjeta', 'nequi', 'daviplata', 'pse', 'efectivo', 'transferencia', ''], default: '' },
    pagadoEn: { type: Date, default: null },
    canceladaEn: { type: Date, default: null },
    motivoCancelacion: { type: String, trim: true, maxlength: 500, default: '' },
    ticketCode: { type: String, unique: true, sparse: true, default: undefined },
    seedBatch: { type: String, index: true, default: undefined },
    seedKey: { type: String, unique: true, sparse: true, default: undefined }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reservation', reservationSchema);
