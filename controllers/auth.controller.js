import jwt from 'jsonwebtoken';
import User from '../schema/user.js';
import Shop from '../schema/shop.js';

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register New User (any role)
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, ...otherData } = req.body;

    const validRoles = ['customer', 'shopkeeper', 'delivery_agent', 'admin'];
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid user role specified' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({ name, email, password, role, address: otherData.address });

    // --- CRITICAL LOGIC: Handle Shopkeeper Registration ---
    if (role === 'shopkeeper') {
      if (!otherData.shopName || !otherData.shopCategory || !otherData.pincode) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ message: 'Shop name, category, and pincode are required for shopkeepers.' });
      }

      const newShop = await Shop.create({
        name: otherData.shopName,
        ownerId: user._id,
        category: otherData.shopCategory,
        location: {
          city: "Not specified", 
          pincode: otherData.pincode,
          geo: {
            type: 'Point',
            coordinates: [0, 0] // Default coordinates [longitude, latitude]
          }
        }
      });
      
      // CRITICAL: Link the created shop's ID back to the user document
      user.shop = newShop._id;
      await user.save({ validateBeforeSave: false });
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    
    const token = generateToken(user);
    const userPayload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      shop: user.shop, // <-- Include the shopId for the frontend
    };

    res.status(201).json({ status: 'success', data: { token, user: userPayload }});

  } catch (err) {
    next(err);
  }
};

// Login User (any role)
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(user);
    const userPayload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      shop: user.shop, // <-- CRITICAL: Include the shop field
    };

    res.status(200).json({
      status: 'success',
      data: {
        token,
        user: userPayload
      }
    });

  } catch (err) {
    next(err);
  }
};

// Logout User
export const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: "Could not log out, please try again."});
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ status: 'success', message: "Logged out successfully" });
    });
};