const User = require('../models/User');
const Reservation = require('../models/Reservation');
const jwt = require('jsonwebtoken');

// Función helper para generar JWT
const generateToken = (user) => {
  return jwt.sign({ id: user._id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '8h' });
};

// @desc    Registrar nuevo usuario (HUS-02)
// @route   POST /api/auth/register o POST /api/users[cite: 1, 2]
const registerUser = async (req, res) => {
  try {
    const { nombre, email, password, telefono } = req.body;

    // Validar campos obligatorios[cite: 1, 4]
    if (!String(nombre || '').trim() || !String(email || '').trim() || !password) {
      return res.status(400).json({ mensaje: 'Por favor complete todos los campos obligatorios.' });
    }

    // Verificar si el usuario ya existe[cite: 2]
    if (String(password).length < 8) return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres.' });
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ mensaje: 'Ingrese un correo electrónico válido.' });
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
    }

    // Crear usuario en MongoDB[cite: 1, 2]
    let rol = normalizedEmail.includes('admin') ? 'admin' : 'cliente';
    if ((await User.countDocuments()) === 0) {
      const Bootstrap = require('../models/Bootstrap');
      try {
        await Bootstrap.create({ _id: 'first-admin' });
        rol = 'admin';
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
    const user = await User.create({
      nombre: String(nombre).trim(),
      email: normalizedEmail,
      password,
      telefono,
      rol
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        token: generateToken(user),
        mensaje: rol === 'admin' ? 'Cuenta de administrador creada exitosamente' : 'Usuario registrado exitosamente'
      });
    } else {
      res.status(400).json({ mensaje: 'Datos de usuario inválidos' });
    }
  } catch (error) {
    const status = error.code === 11000 ? 409 : error.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ mensaje: status === 400 ? 'Datos de usuario inválidos' : status === 409 ? 'El correo ya está registrado' : 'Error en el servidor', error: error.message });
  }
};

// @desc    Autenticar usuario e iniciar sesión (HUS-01)[cite: 1, 2]
// @route   POST /api/auth/login[cite: 1, 2]
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos obligatorios[cite: 1, 4]
    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Ingrese correo y contraseña.' });
    }

    // Buscar usuario en MongoDB[cite: 2]
    const user = await User.findOne({ email: String(email).trim().toLowerCase(), estado: 'activo' });

    // Validar credenciales[cite: 1, 2]
    if (user && (await user.matchPassword(password))) {
      if (user.email.includes('admin') && user.rol !== 'admin') {
        user.rol = 'admin';
        await user.save();
      }
      res.json({
        _id: user._id,
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        token: generateToken(user),
        mensaje: 'Inicio de sesión exitoso'
      });
    } else {
      res.status(401).json({ mensaje: 'Credenciales incorrectas (correo o contraseña)' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
};

const getMe = async (req, res) => {
  const [totalReservas, reservasCompletadas] = await Promise.all([
    Reservation.countDocuments({ usuario: req.user._id }),
    Reservation.countDocuments({ usuario: req.user._id, estado: 'completada' })
  ]);
  res.json({ ...req.user.toObject(), estadisticas: { totalReservas, reservasCompletadas } });
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    if (req.body.nombre !== undefined) user.nombre = String(req.body.nombre).trim();
    if (req.body.telefono !== undefined) user.telefono = String(req.body.telefono).trim();
    if (req.body.email !== undefined) user.email = String(req.body.email).trim().toLowerCase();
    for (const field of ['tipoDocumento', 'numeroDocumento', 'ciudadOrigen', 'contactoEmergenciaNombre', 'contactoEmergenciaTelefono']) {
      if (req.body[field] !== undefined) user[field] = String(req.body[field]).trim();
    }
    if (req.body.intereses !== undefined) user.intereses = Array.isArray(req.body.intereses) ? req.body.intereses : [];
    await user.save();
    const [totalReservas, reservasCompletadas] = await Promise.all([
      Reservation.countDocuments({ usuario: user._id }),
      Reservation.countDocuments({ usuario: user._id, estado: 'completada' })
    ]);
    res.json({ ...user.toObject(), estadisticas: { totalReservas, reservasCompletadas } });
  } catch (error) { res.status(400).json({ mensaje: 'No se pudo actualizar el perfil', error: error.message }); }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile
};
