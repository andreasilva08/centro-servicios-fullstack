const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  destinatarioRol: { type: String, enum: ['admin', 'cliente'], required: true, index: true },
  destinatarioUsuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  tipo: { type: String, enum: ['reserva_pendiente', 'pago_recibido', 'pago_aprobado', 'pago_rechazado', 'solicitud_reembolso', 'reembolso', 'reembolso_rechazado', 'reserva_cancelada'], required: true },
  titulo: { type: String, required: true, trim: true },
  mensaje: { type: String, required: true, trim: true },
  pagoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pago', default: null },
  reservaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
  leida: { type: Boolean, default: false, index: true },
  seedBatch: { type: String, index: true, default: undefined },
  seedKey: { type: String, unique: true, sparse: true, default: undefined }
}, { timestamps: true });

module.exports = mongoose.model('Notificacion', notificationSchema);
