const router = require('express').Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const { listServices, createService, updateService, deleteService } = require('../controllers/serviceController');
router.use(protect);
router.route('/').get(listServices).post(admin, createService);
router.route('/:id').put(admin, updateService).delete(admin, deleteService);
module.exports = router;
