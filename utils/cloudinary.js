import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

const uploadOnCloudinary = async (localFilePath) => {
    
    // --- THIS IS THE CRITICAL DIAGNOSTIC STEP ---
    console.log("--- DEBUGGING CLOUDINARY CREDENTIALS ---");
    console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
    console.log("API Key:", process.env.CLOUDINARY_API_KEY);
    console.log("API Secret:", process.env.CLOUDINARY_API_SECRET);
    console.log("-----------------------------------------");
    // ---------------------------------------------

    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            // We will continue to pass the config directly to be 100% safe
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            resource_type: "auto",
            folder: "bazaryo_project"
        });
        
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath); 
        console.error("Error during Cloudinary upload:", error.message);
        return null;
    }
};

export { uploadOnCloudinary };