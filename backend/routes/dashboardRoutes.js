const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboardController');
const { protect } = require('../middlewares/authMiddleware');

// HUS-03: Dashboard summary (Protegido por token)[cite: 1, 2]
router.get('/summary', protect, getDashboardSummary);

module.exports = router;