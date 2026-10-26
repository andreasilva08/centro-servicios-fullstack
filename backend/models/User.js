const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre completo es obligatorio'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Ingrese un correo electrónico válido']
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: 8
    },
    telefono: {
      type: String,
      default: '',
      trim: true
    },
    tipoDocumento: { type: String, default: '', trim: true },
    numeroDocumento: { type: String, default: '', trim: true },
    ciudadOrigen: { type: String, default: '', trim: true },
    intereses: { type: [String], enum: ['Rafting', 'Parapente', 'Senderismo'], default: [] },
    contactoEmergenciaNombre: { type: String, default: '', trim: true },
    contactoEmergenciaTelefono: { type: String, default: '', trim: true },
    rol: {
      type: String,
      enum: ['admin', 'cliente'],
      default: 'cliente'
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo'
    },
    seedBatch: { type: String, index: true, default: undefined },
    seedKey: { type: String, unique: true, sparse: true, default: undefined }
  },
  { timestamps: true }
);

// Encriptar contraseña antes de guardar (HUS-02)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar contraseñas en el Login (HUS-01)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
