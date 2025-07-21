import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io'; 
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';

// Route Imports
import authRoutes from './Routes/auth.routes.js';
import userRoutes from './Routes/user.routes.js';
import adminRoutes from './Routes/admin.routes.js';
import shopRoutes from './Routes/shop.routes.js';
import productRoutes from './Routes/product.routes.js';
import orderRoutes from './Routes/order.routes.js';
import cartRoutes from './Routes/cart.routes.js';
import paymentRoutes from './Routes/payment.routes.js';

// Socket Handler Import
import initializeSocket from './socket/location.handler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] } // This is for Socket.io, it can be permissive
});
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// --- START OF CHANGE ---
// Middleware
// Production-ready CORS Configuration
const allowedOrigins = [
    'http://localhost:3000', // For your local development
    'https://local-shop-frontend.onrender.com' // <-- IMPORTANT: PASTE YOUR LIVE FRONTEND URL HERE
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // IMPORTANT: Allows cookies/sessions to be sent
}));
// --- END OF CHANGE ---

app.use(express.static("public"));

// Stripe webhook needs raw body, so mount it before express.json()
app.use('/api/payment', paymentRoutes);

app.use(express.json());
app.use(cookieParser()); // <-- Use cookie-parser

// Check if MONGO_URI is loaded
if (!MONGO_URI) {
  console.error('❌ FATAL ERROR: MONGO_URI is not defined. Please check your .env file.');
  process.exit(1);
}

// Session Middleware Configuration
app.use(
  session({
    secret: process.env.JWT_SECRET, // Reuse JWT secret for session signing
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: 'sessions', // Name of the collection to store sessions
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (same as JWT)
      httpOnly: true, // Prevents client-side JS from accessing the cookie (security)
      secure: process.env.NODE_ENV === 'production', // Only send cookie over HTTPS in production
    },
  })
);

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Test Route
app.get('/', (req, res) => res.send('🚀 API is working!'));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 An unhandled error occurred:', err);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message || 'Something went very wrong!',
  });
});

// Initialize Socket.io logic
initializeSocket(io);

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});