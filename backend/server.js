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

// Definición de Rutas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/authRoutes')); // Soporta tanto /api/auth/register como /api/users[cite: 1, 2]
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Ruta base de prueba
app.get('/', (req, res) => {
  res.send('API del Sistema de Reservas - Running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Servidor backend corriendo en puerto ${PORT}`);
});