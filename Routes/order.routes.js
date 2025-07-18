import express from 'express';
import {
  createOrder,
  updateOrderStatus,
  getAllOrders,
  getMyOrders,
  getAssignedOrders,
  trackOrder
} from '../controllers/order.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// Admin: Get all orders (supports filtering via query params)
router.get('/', protect, restrictTo('admin'), getAllOrders);

// Customer: Place a new order
router.post('/', protect, restrictTo('customer'), createOrder);

// Customer: Get their own order history
router.get('/my-orders', protect, restrictTo('customer'), getMyOrders);

// Delivery Agent: Get their currently assigned orders
router.get('/assigned-orders', protect, restrictTo('delivery'), getAssignedOrders);

// Track a specific order (for owner, assigned agent, or admin)
router.get('/:id/track', protect, trackOrder);

// Update an order's status (for assigned agent or admin)
router.patch('/:id/status', protect, restrictTo('admin', 'delivery'), updateOrderStatus);

export default router;