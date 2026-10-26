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
