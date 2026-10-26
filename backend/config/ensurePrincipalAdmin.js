const User = require('../models/User');

const PRINCIPAL_ADMIN_EMAIL = 'admin@sangilaventura.co';
const PRINCIPAL_ADMIN_PASSWORD = '12345678';

async function ensurePrincipalAdmin() {
  const email = PRINCIPAL_ADMIN_EMAIL;
  const password = PRINCIPAL_ADMIN_PASSWORD;
  const name = 'Administrador principal';
  let admin = await User.findOne({ email });

  if (!admin) {
    admin = await User.create({ nombre: name, email, password, rol: 'admin', estado: 'activo' });
    console.log(`Administrador principal provisionado: ${email}`);
    return admin;
  }

  const passwordMatches = await admin.matchPassword(password).catch(() => false);
  let changed = false;
  if (!passwordMatches) {
    admin.password = password;
    changed = true;
  }
  if (admin.rol !== 'admin') {
    admin.rol = 'admin';
    changed = true;
  }
  if (admin.estado !== 'activo') {
    admin.estado = 'activo';
    changed = true;
  }
  if (changed) await admin.save();
  return admin;
}

module.exports = ensurePrincipalAdmin;
