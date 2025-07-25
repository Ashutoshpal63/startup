import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Configure Cloudinary with the now-loaded environment variables
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Export the pre-configured instance for other files to use
export { cloudinary };