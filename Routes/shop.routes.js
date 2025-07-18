import express from 'express';
import {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop
} from '../controllers/shop.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

router.route('/')
  .post(protect, restrictTo('shop'), createShop)
  .get(protect, restrictTo('admin'), getAllShops);

router.route('/:id')
  .get(protect, getShopById) // Any logged-in user can view
  .put(protect, restrictTo('shop', 'admin'), updateShop)
  .delete(protect, restrictTo('admin'), deleteShop);

export default router;