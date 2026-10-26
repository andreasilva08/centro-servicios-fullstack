const User = require('../models/User');
const publicUser = user => ({ _id: user._id, id: user._id, nombre: user.nombre, email: user.email, telefono: user.telefono, rol: user.rol, estado: user.estado, createdAt: user.createdAt });
const listUsers = async (req, res) => {
  try {
    const users = await User.find().lean();
    const admins = users.filter(user => user.rol === 'admin');
    const principalAdmin = admins.find(user => /admin/i.test(user.email || '')) || admins.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
    users.sort((a, b) => {
      if (String(a._id) === String(principalAdmin?._id)) return -1;
      if (String(b._id) === String(principalAdmin?._id)) return 1;
      if (a.rol !== b.rol) return a.rol === 'admin' ? -1 : 1;
      return String(a.nombre).localeCompare(String(b.nombre), 'es');
    });
    res.json(users.map(publicUser));
  } catch (e) { res.status(500).json({ mensaje: 'No se pudieron consultar usuarios' }); }
};
const createUser = async (req, res) => {
  try {
    const { nombre, email, password, telefono, rol, estado } = req.body;
    if (!nombre?.trim() || !email || !password || password.length < 8) return res.status(400).json({ mensaje: 'Nombre, correo y contraseña (mínimo 8 caracteres) son obligatorios.' });
    const user = await User.create({ nombre, email, password, telefono, rol: ['admin', 'cliente'].includes(rol) ? rol : 'cliente', estado: ['activo', 'inactivo'].includes(estado) ? estado : 'activo' });
    res.status(201).json(publicUser(user));
  } catch (e) { res.status(400).json({ mensaje: e.code === 11000 ? 'El correo ya está registrado' : 'Datos de usuario inválidos', error: e.message }); }
};
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    for (const field of ['nombre', 'email', 'telefono', 'rol', 'estado']) if (req.body[field] !== undefined) user[field] = req.body[field];
    if (req.body.password) { if (req.body.password.length < 8) return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres.' }); user.password = req.body.password; }
    await user.save(); res.json(publicUser(user));
  } catch (e) { res.status(400).json({ mensaje: e.code === 11000 ? 'El correo ya está registrado' : 'Datos de usuario inválidos', error: e.message }); }
};
const deleteUser = async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ mensaje: 'No puede eliminar su propio usuario.' });
  try { const user = await User.findByIdAndDelete(req.params.id); if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' }); res.json({ mensaje: 'Usuario eliminado' }); }
  catch (e) { res.status(400).json({ mensaje: 'Identificador inválido' }); }
};
module.exports = { listUsers, createUser, updateUser, deleteUser };
