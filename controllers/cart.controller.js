// Create new file: Controllers/cart.controller.js

import User from '../schema/user.js';
import Product from '../schema/product.js';

// Get user's cart
export const getCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'cart.productId',
      model: 'Product',
      select: 'name price imageUrl'
    });
    res.status(200).json({ status: 'success', data: user.cart });
  } catch (err) {
    next(err);
  }
};

// Add or update item in cart
export const addItemToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const user = req.user;

    // Check if product exists and has enough stock
    const product = await Product.findById(productId);
    if (!product || product.quantityAvailable < quantity) {
      return res.status(400).json({ message: 'Product not available in the desired quantity.' });
    }

    const cartItemIndex = user.cart.findIndex(item => item.productId.toString() === productId);

    if (cartItemIndex > -1) {
      // Update quantity if item exists
      user.cart[cartItemIndex].quantity += quantity;
    } else {
      // Add new item if it doesn't exist
      user.cart.push({ productId, quantity });
    }

    await user.save();
    res.status(200).json({ status: 'success', message: 'Item added to cart', data: user.cart });
  } catch (err) {
    next(err);
  }
};

// Remove item from cart
export const removeItemFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    req.user.cart = req.user.cart.filter(item => item.productId.toString() !== productId);
    await req.user.save();
    res.status(200).json({ status: 'success', message: 'Item removed from cart', data: req.user.cart });
  } catch (err) {
    next(err);
  }
};

// Clear the entire cart
export const clearCart = async (req, res, next) => {
  try {
    req.user.cart = [];
    await req.user.save();
    res.status(200).json({ status: 'success', message: 'Cart cleared' });
  } catch (err) {
    next(err);
  }
};