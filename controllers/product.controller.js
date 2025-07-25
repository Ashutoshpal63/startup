import Product from '../schema/product.js';
import Shop from '../schema/shop.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import mongoose from 'mongoose';

export const createProduct = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Product image is required.' });
    }

    const userShop = await Shop.findOne({ ownerId: req.user._id }).session(session);
    if (!userShop) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'You do not own a shop. Cannot create a product.' });
    }

    const productImageLocalPath = req.file.path;
    const productImage = await uploadOnCloudinary(productImageLocalPath);
    if (!productImage || !productImage.secure_url) {
      return res.status(500).json({ message: 'Failed to upload product image to Cloudinary.' });
    }

    const [product] = await Product.create([{ 
        ...req.body, 
        shopId: userShop._id,
        imageUrl: productImage.secure_url,
    }], { session });

    userShop.products.push(product._id);
    await userShop.save({ session });

    await session.commitTransaction();
    res.status(201).json({ status: 'success', data: product });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Product not found' });
    }

    if (req.user.role === 'shopkeeper') {
      const shop = await Shop.findOne({ _id: product.shopId, ownerId: req.user._id });
      if (!shop) {
        return res.status(403).json({ message: 'You are not authorized to update this product.' });
      }
    }

    const updateData = { ...req.body };

    if (req.file) {
      const imageLocalPath = req.file.path;
      const image = await uploadOnCloudinary(imageLocalPath);
      if (image && image.secure_url) {
        updateData.imageUrl = image.secure_url;
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    res.status(200).json({ status: 'success', data: updatedProduct });

  } catch (err) {
    next(err);
  }
};

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

    if (req.user.role === 'shopkeeper') {
       const shop = await Shop.findOne({ _id: product.shopId, ownerId: req.user._id }).session(session);
      if (!shop) {
        await session.abortTransaction();
        return res.status(403).json({ message: 'You are not authorized to delete this product.' });
      }
    }
    
    await Product.findByIdAndDelete(id, { session });
    
    await Shop.updateOne({ _id: product.shopId }, { $pull: { products: product._id } }, { session });

    await session.commitTransaction();
    res.status(204).send();

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

export const getAllProducts = async (req, res, next) => {
  try {
    const { 
        category, shopId, minPrice, maxPrice, name, page = 1, limit = 10,
        latitude, longitude, radius = 10
    } = req.query;

    const filter = { quantityAvailable: { $gt: 0 } };
    
    if (shopId) {
        filter.shopId = shopId;
    } 
    else if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const radiusInKm = parseFloat(radius) || 10;
        const radiusInRadians = radiusInKm / 6378.1;

        const nearbyShops = await Shop.find({
            'location.geo': {
                $geoWithin: { $centerSphere: [[lng, lat], radiusInRadians] }
            }
        }).select('_id');
        
        const nearbyShopIds = nearbyShops.map(shop => shop._id);
        if (nearbyShopIds.length > 0) {
          filter.shopId = { $in: nearbyShopIds };
        } else {
          return res.status(200).json({ status: 'success', total: 0, page: 1, pages: 0, data: [] });
        }
    }

    if (category) filter.category = String(category);
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice && !isNaN(Number(minPrice))) filter.price.$gte = Number(minPrice);
      if (maxPrice && !isNaN(Number(maxPrice))) filter.price.$lte = Number(maxPrice);
    }
    if (name) filter.name = new RegExp(String(name), 'i');

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
      data: products
    });
  } catch (err) { 
      next(err);
  }
};

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