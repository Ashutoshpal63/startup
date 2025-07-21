import Shop from '../schema/shop.js';
// IMPORT THE UPLOAD UTILITY
import { uploadOnCloudinary } from '../utils/cloudinary.js';

export const createShop = async (req, res) => {
  try {
    // A shop owner cannot create more than one shop.
    const existingShop = await Shop.findOne({ ownerId: req.user._id });
    if (existingShop) {
      return res.status(400).json({ message: 'You already own a shop.' });
    }
    const shopData = { ...req.body, ownerId: req.user._id };

    // --- FILE UPLOAD LOGIC for multiple fields ---
    // req.files will be an object like: { logo: [file], coverImage: [file] }
    // The ?. operator safely checks if the properties exist.
    if (req.files?.logo?.[0]) {
        const logoLocalPath = req.files.logo[0].path;
        const logo = await uploadOnCloudinary(logoLocalPath);
        if (logo) shopData.logoUrl = logo.secure_url;
    }

    if (req.files?.coverImage?.[0]) {
        const coverImageLocalPath = req.files.coverImage[0].path;
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if (coverImage) shopData.coverImageUrl = coverImage.secure_url;
    }

    const newShop = await Shop.create({ ...req.body, ownerId: req.user._id });
    
    // Link this shop to the user model
    req.user.shop = newShop._id;
    await req.user.save();

    res.status(201).json({ status: 'success', data: newShop });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

export const getAllShops = async (req, res) => {
  try {
    // This logic is for Admins, so it's simple
    const shops = await Shop.find().populate('ownerId', 'name email').populate('products');
    res.status(200).json({ status: 'success', data: shops });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).populate('ownerId', 'name email').populate('products');
    if (!shop) {
      return res.status(404).json({ status: 'fail', message: 'Shop not found' });
    }
    res.status(200).json({ status: 'success', data: shop });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updateShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Authorization: Only the owner or an admin can update.
    if (req.user.role !== 'admin' && shop.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to update this shop' });
    }
    const updateData = { ...req.body };

    // --- FILE UPLOAD LOGIC for updates ---
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

    const updated = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ status: 'success', data: updated });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

export const deleteShop = async (req, res) => {
  try {
    const deleted = await Shop.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    res.status(204).json({ status: 'success', message: 'Shop deleted' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};