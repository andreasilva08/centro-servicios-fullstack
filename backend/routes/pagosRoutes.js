const router = require('express').Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const { listPayments, getPaymentSummary, reviewPayment, refundPayment, rejectRefundRequest } = require('../controllers/pagosController');

router.get('/summary', protect, admin, getPaymentSummary);
router.get('/', protect, admin, listPayments);
router.patch('/:id/review', protect, admin, reviewPayment);
router.post('/:id/refund', protect, admin, refundPayment);
router.patch('/:id/refund-request/review', protect, admin, rejectRefundRequest);

module.exports = router;
