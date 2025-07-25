import express from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.middleware.js';

const router = express.Router();

// Public routes for viewing products
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// --- THIS IS THE CORRECTED LINE ---
// The role was changed from 'shop' to 'shopkeeper' to match your user schema.
router.post('/', protect, restrictTo('shopkeeper'), upload.single('productImage'), createProduct);

// --- ALSO CORRECTED HERE ---
router.put('/:id', protect, restrictTo('admin', 'shopkeeper'), upload.single('productImage'), updateProduct);
router.delete('/:id', protect, restrictTo('admin', 'shopkeeper'), deleteProduct);

export default router;