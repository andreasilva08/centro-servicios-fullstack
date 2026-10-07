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