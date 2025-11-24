import multer from "multer";
import path from "path";
import os from "os"; // <-- IMPORT THE OPERATING SYSTEM MODULE

// --- THIS IS THE UNIVERSAL, PRODUCTION-SAFE METHOD ---
// os.tmpdir() returns the default directory for temporary files for the current OS.
// On Windows, it's typically 'C:\Users\YourUser\AppData\Local\Temp'
// On Linux (like Render), it's '/tmp'
const destinationPath = os.tmpdir();

console.log(`[Multer Middleware] Initialized. Using system temp directory: "${destinationPath}"`);

const storage = multer.diskStorage({
  // The destination function tells Multer where to save the file.
  destination: function(req, file, cb) {
    // We provide the OS's temporary directory path.
    // This is guaranteed to exist and be writable on any standard system.
    cb(null, destinationPath);
  },

  // The filename function tells Multer tells name of the file
  filename: function (req, file, cb) {
    // To prevent conflicts if multiple users upload a file with the same name at the same time,
    // we can add a unique prefix. Date.now() is a simple way to do this.
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const finalFileName = uniquePrefix + '-' + file.originalname;
    
    console.log(`[Multer] 'filename' function called. Final file name will be: "${finalFileName}"`);
    cb(null, finalFileName);
  }
});

export const upload = multer({
    storage, // Use the storage configuration we just defined.
});
