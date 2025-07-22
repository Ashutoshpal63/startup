// schema/importUsers.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import users from './sampleuser.js'; // Adjust if path changes
import User from './user.js';      // Adjust if path changes

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- THIS IS THE FIX ---
// Go one directory UP ('..') from the current script's location (`__dirname`) 
// to find the root `.env` file.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🔍 MONGO_URI:', process.env.MONGO_URI); // Good for debugging

// Check if MONGO_URI was loaded successfully
if (!process.env.MONGO_URI) {
  console.error('❌ FATAL ERROR: MONGO_URI not found. Check your .env file in the project root.');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    return User.deleteMany();
  })
  .then(() => {
    console.log('🧹 Cleared existing users.');
    return User.insertMany(users);
  })
  .then((result) => {
    console.log(`✅ Sample users inserted successfully: ${result.length} users added.`);
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error inserting users:', err);
    mongoose.disconnect();
  });