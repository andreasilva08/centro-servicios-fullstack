const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user || req.user.estado !== 'activo') return res.status(401).json({ mensaje: 'Usuario no disponible' });
      return next();
    } catch (error) {
      return res.status(401).json({ mensaje: 'No autorizado, token fallido' });
    }
  }

  if (!token) {
    return res.status(401).json({ mensaje: 'No autorizado, no se proporcionó token' });
  }
};

const admin = (req, res, next) => {
  if (req.user?.rol === 'admin') return next();
  return res.status(403).json({ mensaje: 'No tiene permisos para esta acción' });
};

module.exports = { protect, admin };
