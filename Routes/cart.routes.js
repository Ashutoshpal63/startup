// Create new file: Routes/cart.routes.js

import express from 'express';
import { getCart, addItemToCart, removeItemFromCart, clearCart } from '../controllers/cart.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// All cart routes are protected and for customers only.
router.use(protect, restrictTo('customer'));

router.route('/')
  .get(getCart)
  .post(addItemToCart)
  .delete(clearCart);

router.route('/:productId')
  .delete(removeItemFromCart);

export default router;