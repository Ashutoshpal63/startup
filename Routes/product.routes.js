import express from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes for viewing products
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Protected routes for managing products
router.post('/', protect, restrictTo('shop'), createProduct);
router.put('/:id', protect, restrictTo('admin', 'shop'), updateProduct);
router.delete('/:id', protect, restrictTo('admin', 'shop'), deleteProduct);

export default router;