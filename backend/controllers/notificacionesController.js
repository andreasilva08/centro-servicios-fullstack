const Notificacion = require('../models/Notificacion');

const listNotifications = async (req, res) => {
  try {
    const query = req.user.rol === 'admin'
      ? { destinatarioRol: 'admin' }
      : { destinatarioRol: 'cliente', destinatarioUsuario: req.user._id };
    const activeQuery = { ...query, leida: false };
    const [items, unreadCount] = await Promise.all([
      Notificacion.find(req.query.incluirLeidas === 'true' ? query : activeQuery)
        .sort({ createdAt: -1 }).limit(100)
        .populate('pagoId', 'referenciaTransaccion estadoPago monto metodoPago')
        .populate('reservaId', 'ticketCode'),
      Notificacion.countDocuments(activeQuery)
    ]);
    res.json({ notificaciones: items, noLeidas: unreadCount });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron consultar las notificaciones.', error: error.message });
  }
};

const markRead = async (req, res) => {
  try {
    const query = { _id: req.params.id, destinatarioRol: req.user.rol };
    if (req.user.rol !== 'admin') query.destinatarioUsuario = req.user._id;
    const notification = await Notificacion.findOneAndUpdate(query, { $set: { leida: true } }, { new: true });
    if (!notification) return res.status(404).json({ mensaje: 'Notificación no encontrada.' });
    res.json(notification);
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo actualizar la notificación.' });
  }
};

module.exports = { listNotifications, markRead };
