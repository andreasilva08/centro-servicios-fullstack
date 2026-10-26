const Service = require('../models/Service');

const listServices = async (req, res) => {
  try {
    const filter = req.user.rol === 'admin' ? {} : { estado: 'activo' };
    res.json(await Service.find(filter).sort({ nombre: 1 }));
  } catch (error) { res.status(500).json({ mensaje: 'No se pudieron consultar los servicios', error: error.message }); }
};
const createService = async (req, res) => {
  try { res.status(201).json(await Service.create(req.body)); }
  catch (error) { res.status(400).json({ mensaje: 'Datos de servicio inválidos', error: error.message }); }
};
const updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    res.json(service);
  } catch (error) { res.status(400).json({ mensaje: 'Datos de servicio inválidos', error: error.message }); }
};
const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { estado: 'inactivo' }, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    res.json({ mensaje: 'Servicio desactivado', servicio: service });
  } catch (error) { res.status(400).json({ mensaje: 'Identificador inválido' }); }
};
module.exports = { listServices, createService, updateService, deleteService };
