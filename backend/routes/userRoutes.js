const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

// HUS-04: CRUD Gestión de Usuarios

// GET /api/users        → Listar todos los usuarios
// POST /api/users       → Crear un nuevo usuario
router.route('/')
  .get(protect, getUsers)
  .post(protect, createUser);

// GET /api/users/:id    → Obtener un usuario por ID
// PUT /api/users/:id    → Actualizar un usuario por ID
// DELETE /api/users/:id → Eliminar un usuario por ID
router.route('/:id')
  .get(protect, getUserById)
  .put(protect, updateUser)
  .delete(protect, deleteUser);

module.exports = router;
