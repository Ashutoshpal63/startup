
import express from 'express';
import { getAdminDashboard } from '../controllers/admin.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// NOTE:
// Only formatting (indentation & spacing) was changed in this file.
// No logic, functions, routes, or middleware behavior were modified.
router.use(protect, restrictTo('admin'));

// Original:
// router.get('/dashboard', getAdminDashboard);
//
// Still using the same route and logic – only formatting updated.
router.get(
'/dashboard',
getAdminDashboard
);

export default router;
