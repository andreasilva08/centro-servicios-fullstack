<<<<<<< HEAD
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Cargar variables de entorno
dotenv.config();
if (!process.env.JWT_SECRET) throw new Error('Debe configurar JWT_SECRET en backend/.env');

const app = express();

// Middlewares globales
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));

// Definición de Rutas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/servicios', require('./routes/serviceRoutes'));
app.use('/api/reservas', require('./routes/reservationRoutes'));
app.use('/api/pagos', require('./routes/pagosRoutes'));
app.use('/api/notificaciones', require('./routes/notificacionesRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Ruta base de prueba
app.get('/', (req, res) => {
  res.send('API del Sistema de Reservas - Running...');
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => app.listen(PORT, () => {
  console.log(` Servidor backend corriendo en puerto ${PORT}`);
}));
=======
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Cargar variables de entorno
dotenv.config();

// Conectar a MongoDB
connectDB();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// =============================================
// Definición de Rutas - Sprint 1 (HUS01/HUS02/HUS03)
// =============================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// =============================================
// Nuevas Rutas - Sprint 2 (HUS04/HUS05) - Helver Durán
// =============================================
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));

// Ruta base de prueba - Sistema de Gestión Centro de Servicios v2.0
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API Centro de Servicios - Sprint 2 Running...',
    version: '2.0.0',
    rutas: {
      auth: '/api/auth',
      usuarios: '/api/users',
      servicios: '/api/services',
      dashboard: '/api/dashboard'
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Servidor backend corriendo en puerto ${PORT} - Sprint 2 HUS04/HUS05 activo`);
});
>>>>>>> origin/develop
