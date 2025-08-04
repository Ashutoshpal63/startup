import express from 'express';
import {
  // --- THIS IS THE CORRECTED IMPORT BLOCK ---
  createOrdersFromCart, // Use the new function for unified checkout
  updateOrderStatus,
  getMyOrders,
  trackOrder,
  getShopOrders,
  getAvailableOrders,
  claimOrder,
  getMyDeliveries,
  getAllOrders,
  assignAgentToOrder
} from '../controllers/order.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// ---------------------------------------------------------------- //
//                  CUSTOMER-SPECIFIC ROUTES
// ---------------------------------------------------------------- //

// THIS ROUTE IS REPLACED to handle the full cart checkout
router.post('/checkout-all', protect, restrictTo('customer'), createOrdersFromCart);

router.get('/my-orders', protect, restrictTo('customer'), getMyOrders);


// ---------------------------------------------------------------- //
//                  SHOPKEEPER-SPECIFIC ROUTES
// ---------------------------------------------------------------- //
router.get('/shop/:shopId', protect, restrictTo('shopkeeper', 'admin'), getShopOrders);


// ---------------------------------------------------------------- //
//                  DELIVERY AGENT-SPECIFIC ROUTES
// ---------------------------------------------------------------- //
router.get('/available', protect, restrictTo('delivery_agent'), getAvailableOrders);
router.get('/my-deliveries', protect, restrictTo('delivery_agent'), getMyDeliveries);
router.patch('/:id/claim', protect, restrictTo('delivery_agent'), claimOrder);


// ---------------------------------------------------------------- //
//                  ADMIN-SPECIFIC ROUTES
// ---------------------------------------------------------------- //
router.get('/', protect, restrictTo('admin'), getAllOrders);
router.patch('/:id/assign-agent', protect, restrictTo('admin'), assignAgentToOrder);


// ---------------------------------------------------------------- //
//                  SHARED ROUTES (Accessible by multiple roles)
// ---------------------------------------------------------------- //
router.get('/:id/track', protect, trackOrder);
router.patch('/:id/status', protect, restrictTo('shopkeeper', 'admin', 'delivery_agent'), updateOrderStatus);

export default router;