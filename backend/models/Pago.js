const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  reservaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, index: true },
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  monto: { type: Number, required: true, min: 0 },
  metodoPago: {
    type: String,
    enum: ['Tarjeta de Crédito', 'PSE', 'Nequi', 'DaviPlata', 'Efectivo', 'Transferencia', 'Transferencia Bancaria'],
    required: true
  },
  referenciaTransaccion: { type: String, required: true, unique: true, trim: true },
  estadoPago: { type: String, enum: ['Aprobado', 'Rechazado', 'Pendiente', 'Pendiente de Validación en Oficina', 'Pendiente de Aprobación', 'Pendiente de Reembolso', 'Reembolsado'], default: 'Pendiente', required: true },
  comprobanteReferencia: { type: String, trim: true, maxlength: 120, default: '' },
  motivoRechazo: { type: String, trim: true, maxlength: 500, default: '' },
  fechaRevision: { type: Date, default: null },
  revisadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fechaReembolso: { type: Date, default: null },
  fechaSolicitudReembolso: { type: Date, default: null },
  fechaDecisionReembolso: { type: Date, default: null },
  motivoSolicitudReembolso: { type: String, trim: true, maxlength: 500, default: '' },
  motivoRechazoReembolso: { type: String, trim: true, maxlength: 500, default: '' },
  referenciaReembolso: { type: String, trim: true, default: '' },
  motivoReembolso: { type: String, trim: true, maxlength: 500, default: '' },
  fechaPago: { type: Date, default: Date.now, required: true },
  seedBatch: { type: String, index: true, default: undefined },
  seedKey: { type: String, unique: true, sparse: true, default: undefined }
}, { timestamps: true });

module.exports = mongoose.model('Pago', paymentSchema);
