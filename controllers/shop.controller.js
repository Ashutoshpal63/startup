import Shop from '../schema/shop.js';
import { uploadOnCloudinary as uploadFile } from '../utils/cloudinary.js';

// Create Shop Controller
export const createShop = async (req, res) => {
  try {
    const alreadyExists = await Shop.findOne({ ownerId: req.user._id });
    if (alreadyExists) {
      return res.status(400).json({ message: 'You already own a shop.' });
    }

    // This variable will hold all our final data.
    const shopData = { ...req.body, ownerId: req.user._id };

    // Upload logo if provided
    if (req.files?.logo?.[0]) {
      const logoLocalPath = req.files.logo[0].path;
      const logo = await uploadOnCloudinary(logoLocalPath);
      if (logo) shopData.logoUrl = logo.secure_url;
    }

    // Upload cover image if provided
    if (req.files?.coverImage?.[0]) {
      const coverImageLocalPath = req.files.coverImage[0].path;
      const coverImage = await uploadOnCloudinary(coverImageLocalPath);
      if (coverImage) shopData.coverImageUrl = coverImage.secure_url;
    }

    // --- THIS IS THE CORRECTED LINE ---
    // We now use the `shopData` object which contains the image URLs.
    const newShop = await Shop.create(shopData);

    // Link this shop to the user model
    req.user.shop = newShop._id;
    // Added { validateBeforeSave: false } to prevent potential password validation issues
    await req.user.save({ validateBeforeSave: false });

    res.status(201).json({ status: 'success', data: createdShop });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Get All Shops
export const getAllShops = async (req, res) => {
  try {
    const shopList = await Shop.find()
      .populate('ownerId', 'name email')
      .populate('products');

    res.status(200).json({ status: 'success', data: shopList });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get Shop by ID
export const getShopById = async (req, res) => {
  try {
    const foundShop = await Shop.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('products');

    if (!foundShop) {
      return res.status(404).json({ status: 'fail', message: 'Shop not found' });
    }

    res.status(200).json({ status: 'success', data: foundShop });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateShop = async (req, res) => {
  try {
    const shopToUpdate = await Shop.findById(req.params.id);

    if (!shopToUpdate) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Role-based Access Check
    if (req.user.role !== 'admin' && shopToUpdate.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to update this shop' });
    }

    const updatedData = { ...req.body };

    // File updates (logo & cover image)
    if (req.files?.logo?.[0]) {
      const logoLocalPath = req.files.logo[0].path;
      const logo = await uploadOnCloudinary(logoLocalPath);
      if (logo) updateData.logoUrl = logo.secure_url;
    }

    if (req.files?.coverImage?.[0]) {
      const coverImageLocalPath = req.files.coverImage[0].path;
      const coverImage = await uploadOnCloudinary(coverImageLocalPath);
      if (coverImage) updateData.coverImageUrl = coverImage.secure_url;
    }

    const updated = await Shop.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.status(200).json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
};

// Delete Shop
export const deleteShop = async (req, res) => {
  try {
    const removedShop = await Shop.findByIdAndDelete(req.params.id);

    if (!removedShop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    res.status(204).json({ status: 'success', message: 'Shop deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
