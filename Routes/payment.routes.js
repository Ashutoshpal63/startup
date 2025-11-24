
import express from 'express';
import { processDummyPayment } from '../controllers/payment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST route to process a dummy payment
// 'protect' middleware will  ensures only logged-in users can access this route
router.post('/process-payment', protect, processDummyPayment);

export default router;
