const express = require('express');
const router = express.Router();
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} = require('../controllers/serviceController');
const { protect } = require('../middlewares/authMiddleware');

// HUS-05: CRUD Gestión de Servicios

// GET /api/services        → Listar todos los servicios (público)
// POST /api/services       → Crear un nuevo servicio (protegido)
router.route('/')
  .get(getServices)
  .post(protect, createService);

// GET /api/services/:id    → Obtener un servicio por ID (público)
// PUT /api/services/:id    → Actualizar un servicio por ID (protegido)
// DELETE /api/services/:id → Eliminar un servicio por ID (protegido)
router.route('/:id')
  .get(getServiceById)
  .put(protect, updateService)
  .delete(protect, deleteService);

module.exports = router;
