import express from 'express';
import {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop
} from '../controllers/shop.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.middleware.js';

const router = express.Router();

// This part is correct
const shopImageUpload = upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
]);

router.route('/')
  // --- THIS IS THE FIX ---
  // Add shopImageUpload right before createShop
  .post(protect, restrictTo('shopkeeper'), shopImageUpload, createShop)
  .get(protect, restrictTo('admin'), getAllShops);

router.route('/:id')
  .get(getShopById) // Should probably be protected as well
  // --- ALSO ADDED IT HERE for when you build the update feature ---
  .put(protect, restrictTo('shopkeeper', 'admin'), shopImageUpload, updateShop)
  .delete(protect, restrictTo('admin'), deleteShop);

export default router;