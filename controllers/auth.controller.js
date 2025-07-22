import jwt from 'jsonwebtoken';
import User from '../schema/user.js';
import Shop from '../schema/shop.js'; // <-- This import is essential

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register New User (any role)
export const register = async (req, res, next) => { // <-- Use 'next' for error handling
  try {
    // MODIFIED: Capture all fields from the body
    const { name, email, password, role, ...otherData } = req.body;

    // MODIFIED: Role names must match the frontend exactly
    const validRoles = ['customer', 'shopkeeper', 'delivery_agent', 'admin'];
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid user role specified' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create the user first with the basic details
    const user = await User.create({ name, email, password, role, address: otherData.address });

    // --- NEW & CRITICAL LOGIC: Handle Shopkeeper Registration ---
    if (role === 'shopkeeper') {
      // Check for required shop details sent from the frontend
      if (!otherData.shopName || !otherData.shopCategory || !otherData.pincode) {
        // If shop details are missing, the registration is incomplete.
        // We delete the user we just created to keep the database clean.
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ message: 'Shop name, category, and pincode are required for shopkeepers.' });
      }

      // Create a new Shop document and link it to the user
      const newShop = await Shop.create({
        name: otherData.shopName,
        ownerId: user._id,
        category: otherData.shopCategory,
        location: {
          // You can enhance this later with geocoding if needed
          city: "Not specified", 
          pincode: otherData.pincode,
        }
      });
      
      // IMPORTANT: Link the created shop's ID back to the user document
      user.shop = newShop._id;
      await user.save({ validateBeforeSave: false }); // Save user without re-validating password
    }
    // --- END OF NEW LOGIC ---

    // Respond with a rich user object, token, and session
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
    // Pass any errors to the global error handler
    next(err);
  }
};

// Login User (any role)
export const login = async (req, res, next) => { // <-- Use 'next' for error handling
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create a session for browser-based clients
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // Prepare a rich user payload for the frontend state
    const token = generateToken(user);
    const userPayload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      shopId: user.shop, // <-- CRITICAL: Include the shopId for shopkeepers
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
        res.clearCookie('connect.sid'); // This is the default session cookie name
        res.status(200).json({ status: 'success', message: "Logged out successfully" });
    });
};