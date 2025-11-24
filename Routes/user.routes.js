import express from 'express';
import User from '../schema/user.js';
import Shop from '../schema/shop.js';
import Product from '../schema/product.js';
import mongoose from 'mongoose';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.middleware.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// A utility to create a structured error  **(optional but recommended)
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Flag for errors we create ourselves
        Error.captureStackTrace(this, this.constructor);
    }
}

// GET /api/users/me (Get own profile for any logged in user)
router.get('/me', protect, (req, res) => {
    // This route is simple and doesn't need a try/catch as it has no async database calls.
    res.status(200).json({ status: 'success', data: req.user });
});

// PUT /api/users/me (Update own profile for any logged in user)
router.put('/me', protect, upload.single('avatar'), async (req, res, next) => {
    try {
        // Prevent role/password changes via this route
        const { role, password, ...updateData } = req.body;

        if (req.file) {
            const avatarLocalPath = req.file.path;
            const avatar = await uploadOnCloudinary(avatarLocalPath);

            if (avatar && avatar.secure_url) {
                updateData.avatar = avatar.secure_url;
            } else {
                console.error("Avatar upload failed. Profile data will be updated, but the avatar will not.");
                // Optionally, you could return an error here if the avatar is critical
            }
        }

        const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });

        res.status(200).json({ status: 'success', data: updatedUser });

    } catch (err) {
        // **FIX**: All errors are now passed to the global handler.
        next(err);
    }
});

// PATCH /api/users/availability (Delivery Agent: Toggle Online Status)
router.patch('/availability', protect, restrictTo('delivery_agent'), async (req, res, next) => {
    try {
        let { isOnline } = req.body;
        console.log(`[DEBUG] Toggling availability for user ${req.user._id}. New status: ${isOnline} (type: ${typeof isOnline})`);

        // Convert string "true"/"false" to boolean if necessary
        if (typeof isOnline === 'string') {
            if (isOnline.toLowerCase() === 'true') isOnline = true;
            else if (isOnline.toLowerCase() === 'false') isOnline = false;
        }

        if (typeof isOnline !== 'boolean') {
            return res.status(400).json({ message: 'isOnline must be a boolean value.' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { isOnline },
            { new: true, runValidators: true }
        );

        res.status(200).json({ status: 'success', data: { isOnline: user.isOnline } });

    } catch (err) {
        next(err);
    }
});

// --- Admin's Routes ---
router.use(protect, restrictTo('admin')); // Apply middleware to all routes below

// GET /api/users (Admin: Get all users with filtering)
router.get('/', async (req, res, next) => {
    try {
        // **FIX**: Implement whitelisting to prevent NoSQL injection vulnerabilities.
        const allowedFilters = ['role', 'email', 'name', 'isAvailable'];
        const filter = {};

        for (const key in req.query) {
            if (allowedFilters.includes(key)) {
                // For boolean values, ensure they are parsed correctly
                if (key === 'isAvailable') {
                    filter[key] = req.query[key] === 'true';
                } else {
                    filter[key] = req.query[key];
                }
            }
        }

        const users = await User.find(filter);
        res.status(200).json({ status: 'success', results: users.length, data: users });

    } catch (err) {
        next(err);
    }
});

// GET /api/users/:id (Admin: Get a single user)
router.get('/:id', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            // **FIX**: Use a structured error object.
            return next(new AppError('No user found with that ID', 404));
        }
        res.status(200).json({ status: 'success', data: user });

    } catch (err) {
        next(err);
    }
});

// DELETE /api/users/:id (Admin: Delete a user and all their associated data)
router.delete('/:id', async (req, res, next) => {
    // **CRITICAL FIX**: This operation MUST be a transaction to ensure data integrity.
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await User.findById(req.params.id).session(session);
        if (!user) {
            await session.abortTransaction();
            return next(new AppError('No user found with that ID', 404));
        }

        // --- CASCADING DELETE LOGIC ---
        // If the user is a shopkeeper, we must delete their shop and all its products.
        if (user.role === 'shopkeeper' && user.shop) {
            const shop = await Shop.findById(user.shop).session(session);
            if (shop) {
                // 1. Delete all products within that shop
                await Product.deleteMany({ shopId: shop._id }, { session });
                // 2. Delete the shop itself
                await Shop.findByIdAndDelete(shop._id, { session });
            }
        }

        // Future consideration: If a user is deleted, what happens to their orders?
        // You might want to set `userId` in the Order schema to `null` instead of deleting orders.
        // For now, we will leave orders intact for historical record-keeping.

        // 3. Finally, delete the user.
        await User.findByIdAndDelete(req.params.id, { session });

        // If all went well, commit the transaction.
        await session.commitTransaction();

        res.status(204).send();

    } catch (err) {
        await session.abortTransaction();
        next(err);
    } finally {
        session.endSession();
    }
});

export default router;
