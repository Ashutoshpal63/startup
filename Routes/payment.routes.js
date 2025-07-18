import express from 'express';
import { processDummyPayment } from '../controllers/payment.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = express.Router();
router.post('/process-payment', protect, processDummyPayment);

export default router;