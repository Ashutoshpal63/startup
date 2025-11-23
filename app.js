// THIS MUST BE THE VERY FIRST LINE TO RUN IN YOUR APPLICATION
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io'; 
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';

// THE BAD IMPORT IS NOW GONE.
// WE NO LONGER IMPORT ANYTHING DIRECTLY FROM 'utils/cloudinary.js' IN THIS FILE.

// Route Imports
import authRoutes from './Routes/auth.routes.js';
import userRoutes from './Routes/user.routes.js';
import adminRoutes from './Routes/admin.routes.js';
import shopRoutes from './Routes/shop.routes.js';
import productRoutes from './Routes/product.routes.js';
import orderRoutes from './Routes/order.routes.js';
import cartRoutes from './Routes/cart.routes.js';
import paymentRoutes from './Routes/payment.routes.js';
import initializeSocket from './socket/location.handler.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

const allowedOrigins = [
    'http://localhost:5173',  
    'http://localhost:3000',
    'https://bazaryo-frontend.vercel.app',
    'https://local-shop-frontend.onrender.com'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

if (!MONGO_URI) {
  console.error('❌ FATAL ERROR: MONGO_URI is not defined. Please check your .env file.');
  process.exit(1);
}

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: 'sessions',
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.get('/', (req, res) => res.send('🚀 API is working!'));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  console.error('💥 An unhandled error occurred:', err);
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {},
    stack: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

initializeSocket(io);
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
