const User = require('../models/User');
const Service = require('../models/Service');
const Reservation = require('../models/Reservation');
const { getFinancialMetrics } = require('../services/financialMetrics');

const getDashboardSummary = async (req, res) => {
  try {
    const [totalUsuarios, totalAventureros, totalServicios, totalReservas, porEstado, finanzas, topSolicitado, pendientes, recientes] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ rol: 'cliente' }),
      Service.countDocuments({ estado: 'activo' }),
      Reservation.countDocuments(),
      Reservation.aggregate([{ $group: { _id: '$estado', total: { $sum: 1 } } }]),
      getFinancialMetrics(),
      Reservation.aggregate([
        { $group: { _id: '$servicio', reservas: { $sum: 1 }, participantes: { $sum: { $ifNull: ['$participantes', 1] } } } },
        { $sort: { reservas: -1, participantes: -1 } }, { $limit: 1 },
        { $lookup: { from: Service.collection.name, localField: '_id', foreignField: '_id', as: 'servicio' } },
        { $unwind: { path: '$servicio', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, id: '$_id', nombre: '$servicio.nombre', reservas: 1, participantes: 1 } }
      ]),
      Reservation.find({ estado: 'pendiente' }).populate('usuario', 'nombre email').populate('servicio', 'nombre').sort({ fecha: 1 }).limit(8),
      Reservation.find().populate('usuario', 'nombre').populate('servicio', 'nombre').sort({ createdAt: -1 }).limit(5)
    ]);

    const reservasPorEstado = Object.fromEntries(['pendiente', 'confirmada', 'completada', 'cancelada'].map(estado => [estado, porEstado.find(item => item._id === estado)?.total || 0]));
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({
      totales: { usuarios: totalUsuarios, aventureros: totalAventureros, servicios: totalServicios, reservas: totalReservas, ingresosCOP: finanzas.ingresosCOP, reembolsosCOP: finanzas.reembolsosCOP },
      reservasPorEstado,
      experienciaMasSolicitada: topSolicitado[0] || null,
      reservasPendientes: pendientes.map(item => ({ id: item._id, fechaHora: item.fecha, clienteNombre: item.usuario?.nombre || item.clienteSnapshot?.nombre || 'Cliente', clienteEmail: item.usuario?.email || item.clienteSnapshot?.email || '', servicioNombre: item.servicio?.nombre || 'Servicio eliminado' })),
      actividad: recientes.map(item => ({ id: item._id, title: `${item.usuario?.nombre || item.clienteSnapshot?.nombre || 'Cliente'} agendó ${item.servicio?.nombre || 'un servicio'}`, meta: item.createdAt })),
      fechaConsulta: new Date()
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar métricas del Dashboard', error: error.message });
  }
};

module.exports = { getDashboardSummary };
