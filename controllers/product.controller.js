// ================== IMPORTS ==================
import mongoose from 'mongoose';
import Product from '../schema/product.js';
import Shop from '../schema/shop.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

// ================== CREATE PRODUCT ==================
export const createProduct = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if image exists
    if (!req.file) {
      return res.status(400).json({ message: 'Product image is required.' });
    }

    // Verify that user has a shop
    const userShop = await Shop.findOne({ ownerId: req.user._id }).session(session);
    if (!userShop) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'You do not own a shop. Cannot create a product.' });
    }

    // Upload product image
    const uploadedImage = await uploadOnCloudinary(req.file.path);
    if (!uploadedImage?.secure_url) {
      return res.status(500).json({ message: 'Failed to upload product image to Cloudinary.' });
    }

    // Create product entry
    const [newProduct] = await Product.create(
      [{ ...req.body, shopId: userShop._id, imageUrl: uploadedImage.secure_url }],
      { session }
    );

    // Add product to shop
    userShop.products.push(newProduct._id);
    await userShop.save({ session });

    // Finalize transaction
    await session.commitTransaction();
    res.status(201).json({ status: 'success', data: newProduct });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ================== UPDATE PRODUCT ==================
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    let product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Product not found' });
    }

    // Authorization check for shopkeeper
    if (req.user.role === 'shopkeeper') {
      const ownsShop = await Shop.findOne({ _id: product.shopId, ownerId: req.user._id });
      if (!ownsShop) {
        return res.status(403).json({ message: 'You are not authorized to update this product.' });
      }
    }

    const updates = { ...req.body };

    // Handle new image upload if provided
    if (req.file) {
      const uploadedImage = await uploadOnCloudinary(req.file.path);
      if (uploadedImage?.secure_url) {
        updates.imageUrl = uploadedImage.secure_url;
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ status: 'success', data: updatedProduct });
  } catch (err) {
    next(err);
  }
};

// ================== DELETE PRODUCT ==================
export const deleteProduct = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const product = await Product.findById(id).session(session);

    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check shop ownership
    if (req.user.role === 'shopkeeper') {
      const shop = await Shop.findOne({ _id: product.shopId, ownerId: req.user._id }).session(session);
      if (!shop) {
        await session.abortTransaction();
        return res.status(403).json({ message: 'You are not authorized to delete this product.' });
      }
    }

    // Remove product and reference
    await Product.findByIdAndDelete(id, { session });
    await Shop.updateOne(
      { _id: product.shopId },
      { $pull: { products: product._id } },
      { session }
    );

    await session.commitTransaction();
    res.status(204).send();
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ================== GET ALL PRODUCTS ==================
export const getAllProducts = async (req, res, next) => {
  try {
    const {
      category, shopId, minPrice, maxPrice,
      name, page = 1, limit = 10,
      latitude, longitude, radius = 10,
    } = req.query;

    const filter = { quantityAvailable: { $gt: 0 } };

    // Filter by shop or geo-location
    if (shopId) {
      filter.shopId = shopId;
    } else if (latitude && longitude) {
      const rad = (parseFloat(radius) || 10) / 6378.1;

      const shops = await Shop.find({
        'location.geo': {
          $geoWithin: { $centerSphere: [[parseFloat(longitude), parseFloat(latitude)], rad] },
        },
      }).select('_id');

      const shopIds = shops.map(s => s._id);
      if (shopIds.length > 0) filter.shopId = { $in: shopIds };
      else return res.status(200).json({ status: 'success', total: 0, page: 1, pages: 0, data: [] });
    }

    // Optional filters
    if (category) filter.category = String(category);
    if (name) filter.name = new RegExp(String(name), 'i');

    if (minPrice || maxPrice) {
      filter.price = {};
      if (!isNaN(Number(minPrice))) filter.price.$gte = Number(minPrice);
      if (!isNaN(Number(maxPrice))) filter.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate('shopId', 'name')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

// ================== GET PRODUCT BY ID ==================
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('shopId');
    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Product not found' });
    }
    res.status(200).json({ status: 'success', data: product });
  } catch (err) {
    next(err);
  }
};

