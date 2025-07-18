import express from 'express';
import User from '../schema/user.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/users/me (Get own profile for any logged in user)
router.get('/me', protect, (req, res) => {
    res.status(200).json({ status: 'success', data: req.user });
});

// PUT /api/users/me (Update own profile for any logged in user)
router.put('/me', protect, async (req, res) => {
    // Prevent role changes via this route
    const { role, password, ...updateData } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });
    res.status(200).json({ status: 'success', data: updatedUser });
});

// --- Admin Only Routes ---

// GET /api/users (Admin: Get all users with filtering)
router.get('/', protect, restrictTo('admin'), async (req, res) => {
    const users = await User.find(req.query);
    res.status(200).json({ status: 'success', results: users.length, data: users });
});

// GET /api/users/:id (Admin: Get a single user)
router.get('/:id', protect, restrictTo('admin'), async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ status: 'success', data: user });
});

// DELETE /api/users/:id (Admin: Delete a user)
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(204).send();
});

export default router;