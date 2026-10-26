const router = require('express').Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const c = require('../controllers/usuariosController');
router.use(protect, admin);
router.route('/').get(c.listUsers).post(c.createUser);
router.route('/:id').put(c.updateUser).delete(c.deleteUser);
module.exports = router;
