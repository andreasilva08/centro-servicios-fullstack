const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboardController');
const { protect, admin } = require('../middlewares/authMiddleware');

// HUS-03: Dashboard summary (Protegido por token)[cite: 1, 2]
router.get('/summary', protect, admin, getDashboardSummary);

module.exports = router;
