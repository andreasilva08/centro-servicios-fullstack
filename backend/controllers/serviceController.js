const Service = require('../models/Service');

// @desc    Obtener todos los servicios (HUS-05)
// @route   GET /api/services
// @access  Public
const getServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json({
      total: services.length,
      servicios: services
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los servicios', error: error.message });
  }
};

// @desc    Obtener un servicio por ID (HUS-05)
// @route   GET /api/services/:id
// @access  Public
const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    }

    res.json(service);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el servicio', error: error.message });
  }
};

// @desc    Crear un nuevo servicio (HUS-05)
// @route   POST /api/services
// @access  Private (Admin)
const createService = async (req, res) => {
  try {
    const { nombre, precio, duracion, descripcion, estado } = req.body;

    // Validar campos obligatorios
    if (!nombre || precio === undefined || !duracion) {
      return res.status(400).json({ mensaje: 'Nombre, precio y duración son obligatorios.' });
    }

    // Validar que precio y duración sean números positivos
    if (precio < 0) {
      return res.status(400).json({ mensaje: 'El precio no puede ser negativo.' });
    }
    if (duracion <= 0) {
      return res.status(400).json({ mensaje: 'La duración debe ser mayor a 0 minutos.' });
    }

    const service = await Service.create({
      nombre,
      precio,
      duracion,
      descripcion: descripcion || '',
      estado: estado || 'disponible'
    });

    res.status(201).json({
      mensaje: 'Servicio creado exitosamente',
      servicio: service
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear el servicio', error: error.message });
  }
};

// @desc    Actualizar un servicio por ID (HUS-05)
// @route   PUT /api/services/:id
// @access  Private (Admin)
const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    }

    const { nombre, precio, duracion, descripcion, estado } = req.body;

    // Validaciones de datos
    if (precio !== undefined && precio < 0) {
      return res.status(400).json({ mensaje: 'El precio no puede ser negativo.' });
    }
    if (duracion !== undefined && duracion <= 0) {
      return res.status(400).json({ mensaje: 'La duración debe ser mayor a 0 minutos.' });
    }

    // Actualizar solo los campos enviados
    service.nombre = nombre || service.nombre;
    service.precio = precio !== undefined ? precio : service.precio;
    service.duracion = duracion || service.duracion;
    service.descripcion = descripcion !== undefined ? descripcion : service.descripcion;
    service.estado = estado || service.estado;

    const updatedService = await service.save();

    res.json({
      mensaje: 'Servicio actualizado exitosamente',
      servicio: updatedService
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar el servicio', error: error.message });
  }
};

// @desc    Eliminar un servicio por ID (HUS-05)
// @route   DELETE /api/services/:id
// @access  Private (Admin)
const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    }

    await Service.findByIdAndDelete(req.params.id);

    res.json({ mensaje: `Servicio '${service.nombre}' eliminado correctamente` });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar el servicio', error: error.message });
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};
