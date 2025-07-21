import express from 'express';
import {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop
} from '../controllers/shop.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
// ADD THIS IMPORT
import { upload } from '../middleware/multer.middleware.js';

const router = express.Router();
// Define the upload middleware for reuse.
// It accepts a 'logo' file and a 'coverImage' file.
const shopImageUpload = upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
]);

router.route('/')
  .post(protect, restrictTo('shop'), createShop)
  .get(protect, restrictTo('admin'), getAllShops);

router.route('/:id')
  .get(protect, getShopById) // Any logged-in user can view
  .put(protect, restrictTo('shop', 'admin'), updateShop)
  .delete(protect, restrictTo('admin'), deleteShop);

export default router;