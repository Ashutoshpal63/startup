import express from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
// ADD THIS IMPORT
import { upload } from '../middleware/multer.middleware.js';

const router = express.Router();

// Public routes for viewing products
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Protected routes for managing products
// ADD "upload.single('productImage')" MIDDLEWARE
router.post('/', protect, restrictTo('shop'), upload.single('productImage'), createProduct);
router.put('/:id', protect, restrictTo('admin', 'shop'), upload.single('productImage'), updateProduct);

router.delete('/:id', protect, restrictTo('admin', 'shop'), deleteProduct);

export default router;