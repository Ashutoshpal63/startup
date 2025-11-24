import jwt from 'jsonwebtoken';
import User from '../schema/user.js';

// Protect routes by verifying session or token and attaching user to request
export const protect = async (req, res, next) => {
  // 1. Check for active session first (for browsers)
  if (req.session && req.session.user) {
    // Session exists, find the full user object from DB and attach to req.
    req.user = await User.findById(req.session.user.id);
    if (req.user) {
        return next();
    }
  }

  // 2. If no session, check for Bearer token (for Postman, mobile apps, etc.)
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({ message: 'User not found via token' });
      }

      return next();
    } catch (err) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  
  // 3. If neither session nor token is found, deny access.
  return res.status(401).json({ message: 'Not authorized, please log in' });
};

// Restrict access to specific roles.
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Your role ('${req.user.role}') is not authorized for this action.` 
      });
    }
    next();
  };
};
