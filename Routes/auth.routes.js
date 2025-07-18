// Routes/auth.routes.js
import express from 'express';
import { register, login, logout } from '../controllers/auth.controller.js'; 

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout); // <-- Add this line

export default router;