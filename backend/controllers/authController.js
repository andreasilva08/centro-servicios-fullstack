const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Función helper para generar JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '8h' });
};

// @desc    Registrar nuevo usuario (HUS-02)
// @route   POST /api/auth/register o POST /api/users[cite: 1, 2]
const registerUser = async (req, res) => {
  try {
    const { nombre, email, password, telefono, rol } = req.body;

    // Validar campos obligatorios[cite: 1, 4]
    if (!nombre || !email || !password) {
      return res.status(400).json({ mensaje: 'Por favor complete todos los campos obligatorios.' });
    }

    // Verificar si el usuario ya existe[cite: 2]
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
    }

    // Crear usuario en MongoDB[cite: 1, 2]
    const user = await User.create({
      nombre,
      email,
      password,
      telefono,
      rol: rol || 'cliente'
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        token: generateToken(user._id),
        mensaje: 'Usuario registrado exitosamente'
      });
    } else {
      res.status(400).json({ mensaje: 'Datos de usuario inválidos' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
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
    const user = await User.findOne({ email });

    // Validar credenciales[cite: 1, 2]
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        token: generateToken(user._id),
        mensaje: 'Inicio de sesión exitoso'
      });
    } else {
      res.status(401).json({ mensaje: 'Credenciales incorrectas (correo o contraseña)' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser
};