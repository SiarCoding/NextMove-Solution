import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const UPLOADS_DIR = 'uploads';

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Log upload directory status
console.log('Uploads directory exists');
console.log('Uploads directory permissions:', fs.statSync(UPLOADS_DIR));

// Helper function to move uploaded file to final destination
export async function uploadFile(file: Express.Multer.File) {
  try {
    const fileName = file.filename;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    // File URL for database storage
    const url = `/uploads/${fileName}`;
    
    return {
      fileName,
      filePath,
      url
    };
  } catch (error) {
    console.error('Error processing upload:', error);
    throw new Error('Failed to process file upload');
  }
}
