const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// HUS-01: Login[cite: 1, 2]
router.post('/login', loginUser);

// HUS-02: Registro[cite: 1, 2]
router.post('/register', registerUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
