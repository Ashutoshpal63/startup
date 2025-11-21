import express from 'express';
import { getAdminDashboard } from '../controllers/admin.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// Same middleware as before – no changes here
router.use(protect, restrictTo('admin'));

// CHANGE:
// Before the route was:
// router.get('/dashboard', getAdminDashboard);
//
// Now, just for demonstration, the route path is changed to:
// '/admin-dashboard'
// Function and logic remain the same
router.get('/admin-dashboard', getAdminDashboard);

export default router;
