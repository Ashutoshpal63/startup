import Shop from '../schema/shop.js';
import { uploadOnCloudinary as uploadFile } from '../utils/cloudinary.js';

// Create Shop Controller
export const createShop = async (req, res) => {
  try {
    const alreadyExists = await Shop.findOne({ ownerId: req.user._id });
    if (alreadyExists) {
      return res.status(400).json({ message: 'You already own a shop.' });
    }

    // Prepare shop data (spread body first)
    const dataToSave = {
      ownerId: req.user._id,
      ...req.body
    };

    // Upload logo if provided
    if (req.files?.logo?.[0]) {
      const uploadedLogo = await uploadFile(req.files.logo[0].path);
      if (uploadedLogo?.secure_url) dataToSave.logoUrl = uploadedLogo.secure_url;
    }

    // Upload cover image if provided
    if (req.files?.coverImage?.[0]) {
      const uploadedCover = await uploadFile(req.files.coverImage[0].path);
      if (uploadedCover?.secure_url) dataToSave.coverImageUrl = uploadedCover.secure_url;
    }

    const createdShop = await Shop.create(dataToSave);
    
    req.user.shop = createdShop._id;
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

// Update Shop
export const updateShop = async (req, res, next) => {
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
      const newLogo = await uploadFile(req.files.logo[0].path);
      if (newLogo?.secure_url) updatedData.logoUrl = newLogo.secure_url;
    }

    if (req.files?.coverImage?.[0]) {
      const newCoverImage = await uploadFile(req.files.coverImage[0].path);
      if (newCoverImage?.secure_url) updatedData.coverImageUrl = newCoverImage.secure_url;
    }

    const shopUpdated = await Shop.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    res.status(200).json({ status: 'success', data: shopUpdated });
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
