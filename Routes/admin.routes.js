import express from 'express';
import { getAdminDashboard } from '../controllers/admin.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/dashboard', 
           getAdminDashboard);
// export router
export default router;
