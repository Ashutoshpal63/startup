import Product from '../schema/product.js';
import Shop from '../schema/shop.js'; // Needed for authorization
import { uploadOnCloudinary } from '../utils/cloudinary.js';
// Create Product
export const createProduct = async (req, res) => {
  try {
    const userShop = await Shop.findOne({ ownerId: req.user._id });
    
    // User must be a 'shop' owner to create a product.
    if (!userShop) {
      return res.status(403).json({ message: 'You do not own a shop. Cannot create product.' });
    }
        // --- FILE UPLOAD LOGIC ---
    const productImageLocalPath = req.file?.path;
    if (!productImageLocalPath) {
      return res.status(400).json({ message: 'Product image is required.' });
    }
    const productImage = await uploadOnCloudinary(productImageLocalPath);
    if (!productImage) {
      return res.status(500).json({ message: 'Failed to upload product image.' });
    }
    
    const product = await Product.create({ ...req.body, shopId: userShop._id ,imageUrl: productImage.secure_url,});

    // Add product to the shop's list
    userShop.products.push(product._id);
    await userShop.save();

    res.status(201).json({ status: 'success', data: product });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};


// Update Product
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Product not found' });
    }

    // SECURITY: Ensure user owns the product's shop, or is an admin.
    if (req.user.role === 'shop') {
      const shop = await Shop.findOne({ _id: product.shopId, ownerId: req.user._id });
      if (!shop) {
        return res.status(403).json({ message: 'You are not authorized to update this product.' });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ status: 'success', data: updatedProduct });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

// Delete Product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Product not found' });
    }

    // SECURITY: Ensure user owns the product's shop, or is an admin.
    if (req.user.role === 'shop') {
       const shop = await Shop.findOne({ _id: product.shopId, ownerId: req.user._id });
      if (!shop) {
        return res.status(403).json({ message: 'You are not authorized to delete this product.' });
      }
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    // Optional: remove product from shop's array
    await Shop.updateOne({ _id: product.shopId }, { $pull: { products: product._id } });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};


// Get All Products (Public, with filters) - NO CHANGE NEEDED, ALREADY GOOD
export const getAllProducts = async (req, res) => {
  try {
    const { 
        category, 
        shopId, 
        minPrice, 
        maxPrice, 
        name, 
        page = 1, 
        limit = 10,
        // --- NEW: Location parameters ---
        latitude,
        longitude,
        radius = 10 // Default search radius of 10 kilometers
    } = req.query;

    const filter = {
        // --- NEW: Only show products that are in stock ---
        quantityAvailable: { $gt: 0 }
    };
    
    // If a specific shopId is provided, it takes precedence.
    if (shopId) {
        filter.shopId = shopId;
    } 
    // --- NEW: Otherwise, if location is provided, find nearby shops ---
    else if (latitude && longitude) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const radiusInKm = parseFloat(radius);

        // MongoDB needs radius in radians: distance / radius of Earth
        const earthRadiusKm = 6378.1;
        const radiusInRadians = radiusInKm / earthRadiusKm;

        // Find all shops within the specified radius
        const nearbyShops = await Shop.find({
            'location.geo': {
                $geoWithin: {
                    $centerSphere: [[lng, lat], radiusInRadians]
                }
            }
        }).select('_id'); // We only need their IDs

        const nearbyShopIds = nearbyShops.map(shop => shop._id);

        // Filter products to only include those from nearby shops
        filter.shopId = { $in: nearbyShopIds };
    }


    // --- Existing filters remain the same ---
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (name) filter.name = new RegExp(name, 'i');

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
      res.status(500).json({ status: 'error', message: err.message }); 
  }
};

// Get Product by ID (Public) - NO CHANGE NEEDED, ALREADY GOOD
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('shopId');
    if (!product) return res.status(404).json({ status: 'fail', message: 'Product not found' });
    res.status(200).json({ status: 'success', data: product });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
};