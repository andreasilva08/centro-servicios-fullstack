const User = require('../models/User');
const Service = require('../models/Service');
const Reservation = require('../models/Reservation');

// @desc    Obtener totales agregados para el Dashboard (HUS-03)[cite: 1, 2]
// @route   GET /api/dashboard/summary
const getDashboardSummary = async (req, res) => {
  try {
    const totalUsuarios = await User.countDocuments(); //[cite: 2]
    const totalServicios = await Service.countDocuments(); //[cite: 2]
    const totalReservas = await Reservation.countDocuments(); //[cite: 2]

    res.json({
      totales: {
        usuarios: totalUsuarios,
        servicios: totalServicios,
        reservas: totalReservas
      },
      fechaConsulta: new Date()
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar métricas del Dashboard', error: error.message });
  }
};

module.exports = {
  getDashboardSummary
};