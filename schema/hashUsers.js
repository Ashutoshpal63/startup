
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './user.js'; // Importing the User model (path must be correct)

dotenv.config(); // Loads environment variables from .env file

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/localShopDelivery';
// Reads MongoDB URI from .env, or uses local fallback

const updatePasswords = async () => {
try {
await mongoose.connect(MONGO_URI);
console.log('✅ Connected to MongoDB');
// Establishes MongoDB connection

```
const hashed = await bcrypt.hash('123456', 10);
// Hashes the new password with bcrypt (salt rounds = 10)

const result = await User.updateMany(
  { password: 'hashed_dummy_password' }, // Finds users still having an old dummy password
  { $set: { password: hashed } }         // Replaces it with the newly hashed password
);

console.log(`🔐 Updated ${result.modifiedCount} users`);
// Logs how many users got updated

process.exit(); // Safely exits process after completion
```

} catch (err) {
console.error('❌ Error:', err.message);
process.exit(1); // Exits with error code if something fails
}
};

updatePasswords(); // Executes the password update script

