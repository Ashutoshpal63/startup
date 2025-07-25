import express from 'express';
import {
  // Import all the necessary, corrected controller functions
  createOrder,
  updateOrderStatus,
  getMyOrders,
  trackOrder,
  getShopOrders,      // <-- NEWLY IMPORTED
  getAvailableOrders,  // <-- NEWLY IMPORTED
  claimOrder,          // <-- NEWLY IMPORTED
  getMyDeliveries,     // <-- Renamed for clarity from getAssignedOrders
  getAllOrders,
  assignAgentToOrder
} from '../controllers/order.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// ---------------------------------------------------------------- //
//                  CUSTOMER-SPECIFIC ROUTES
// ---------------------------------------------------------------- //
router.post('/', protect, restrictTo('customer'), createOrder);
router.get('/my-orders', protect, restrictTo('customer'), getMyOrders);


// ---------------------------------------------------------------- //
//                  SHOPKEEPER-SPECIFIC ROUTES
// ---------------------------------------------------------------- //
// NEW: This route is essential for the shopkeeper dashboard
router.get('/shop/:shopId', protect, restrictTo('shopkeeper', 'admin'), getShopOrders);


// ---------------------------------------------------------------- //
//                  DELIVERY AGENT-SPECIFIC ROUTES
// ---------------------------------------------------------------- //
// NEW: This route lets agents see available jobs
router.get('/available', protect, restrictTo('delivery_agent'), getAvailableOrders);

// CORRECTED: Uses 'delivery_agent' role and better name
router.get('/my-deliveries', protect, restrictTo('delivery_agent'), getMyDeliveries);

// NEW: This route lets agents claim a job
router.patch('/:id/claim', protect, restrictTo('delivery_agent'), claimOrder);


// ---------------------------------------------------------------- //
//                  ADMIN-SPECIFIC ROUTES
// ---------------------------------------------------------------- //
router.get('/', protect, restrictTo('admin'), getAllOrders);
router.patch('/:id/assign-agent', protect, restrictTo('admin'), assignAgentToOrder);

// ---------------------------------------------------------------- //
//                  SHARED ROUTES (Accessible by multiple roles)
// ---------------------------------------------------------------- //
// This route is for viewing the tracking page
router.get('/:id/track', protect, trackOrder);

// CORRECTED: This route now correctly allows shopkeepers to update status
router.patch('/:id/status', protect, restrictTo('shopkeeper', 'admin', 'delivery_agent'), updateOrderStatus);

export default router;