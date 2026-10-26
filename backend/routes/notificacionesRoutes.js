const router = require('express').Router();
const { protect } = require('../middlewares/authMiddleware');
const { listNotifications, markRead } = require('../controllers/notificacionesController');

router.use(protect);
router.get('/', listNotifications);
router.put('/:id/leer', markRead);
router.patch('/:id/read', markRead);

module.exports = router;
