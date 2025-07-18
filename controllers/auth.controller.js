import jwt from 'jsonwebtoken';
import User from '../schema/user.js';

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Respond with token and user data
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user);
  res.status(statusCode).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

// Register New User (any role)
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate role
    const validRoles = ['customer', 'shop', 'delivery', 'admin'];
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid user role specified' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({ name, email, password, role });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
};

// Login User (any role)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // --- SESSION CREATION LOGIC ---
    // Store user info in the session. Do NOT store the password.
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    // -----------------------------

    // The rest is the same: send back token and user data for non-browser clients
    const token = generateToken(user);
    res.status(200).json({
      token, // Still send token for API clients
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: 'Login failed', message: err.message });
  }
};

// Add a new logout function
export const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: "Could not log out, please try again."});
        }
        res.clearCookie('connect.sid'); // Clears the session cookie
        res.status(200).json({ message: "Logged out successfully" });
    });
};