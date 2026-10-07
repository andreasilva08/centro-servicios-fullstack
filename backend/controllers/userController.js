const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Obtener todos los usuarios (HUS-04)
// @route   GET /api/users
// @access  Private (Admin)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({
      total: users.length,
      usuarios: users
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los usuarios', error: error.message });
  }
};

// @desc    Obtener un usuario por ID (HUS-04)
// @route   GET /api/users/:id
// @access  Private (Admin)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el usuario', error: error.message });
  }
};

// @desc    Crear un nuevo usuario (HUS-04)
// @route   POST /api/users
// @access  Private (Admin)
const createUser = async (req, res) => {
  try {
    const { nombre, email, password, telefono, rol, estado } = req.body;

    // Validar campos obligatorios
    if (!nombre || !email || !password) {
      return res.status(400).json({ mensaje: 'Nombre, email y contraseña son obligatorios.' });
    }

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
    }

    // Crear el usuario (el modelo encripta la contraseña automáticamente)
    const user = await User.create({
      nombre,
      email,
      password,
      telefono: telefono || '',
      rol: rol || 'cliente',
      estado: estado || 'activo'
    });

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        rol: user.rol,
        estado: user.estado,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear el usuario', error: error.message });
  }
};

// @desc    Actualizar un usuario por ID (HUS-04)
// @route   PUT /api/users/:id
// @access  Private (Admin)
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const { nombre, email, telefono, rol, estado, password } = req.body;

    // Actualizar campos si se enviaron
    user.nombre = nombre || user.nombre;
    user.email = email || user.email;
    user.telefono = telefono !== undefined ? telefono : user.telefono;
    user.rol = rol || user.rol;
    user.estado = estado || user.estado;

    // Solo encriptar si se cambió la contraseña
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();

    res.json({
      mensaje: 'Usuario actualizado exitosamente',
      usuario: {
        _id: updatedUser._id,
        nombre: updatedUser.nombre,
        email: updatedUser.email,
        telefono: updatedUser.telefono,
        rol: updatedUser.rol,
        estado: updatedUser.estado,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar el usuario', error: error.message });
  }
};

// @desc    Eliminar un usuario por ID (HUS-04)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ mensaje: `Usuario '${user.nombre}' eliminado correctamente` });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar el usuario', error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
