const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

// HUS-01: Login[cite: 1, 2]
router.post('/login', loginUser);

// HUS-02: Registro[cite: 1, 2]
router.post('/register', registerUser);

module.exports = router;