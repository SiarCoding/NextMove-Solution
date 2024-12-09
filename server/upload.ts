import { randomUUID } from 'crypto';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import multer from 'multer';

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/';
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExtension}`;
    cb(null, fileName);
  }
});

// Multer configuration
export const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
  },
  fileFilter: (req, file, cb) => {
    // Log the incoming file information
    console.log('Multer received file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });

    // Handle different upload types based on the fieldname
    if (file.fieldname === 'logo') {
      // For logo uploads
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image type. Allowed types: JPG, PNG, GIF, WEBP'));
      }
    } else if (file.fieldname === 'thumbnail') {
      // Für Thumbnail-Uploads
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image type. Allowed types: JPG, PNG, GIF, WEBP'));
      }
    } else if (file.fieldname === 'file') {
      // For video uploads
      const allowedVideoTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-ms-wmv'
      ];
      if (allowedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid video type. Allowed types: ${allowedVideoTypes.join(', ')}`));
      }
    } else {
      // For any other file uploads
      cb(null, true);
    }
  }
});

export const uploadFile = async (file: Express.Multer.File) => {
  try {
    console.log('Uploading file:', file);
    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, file.filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File does not exist at path:', filePath);
      throw new Error('File not found after upload');
    }

    console.log('File exists at:', filePath);
    const fileUrl = `/uploads/${file.filename}`;
    console.log('Generated URL:', fileUrl);
    
    return {
      url: fileUrl,
      fileName: file.filename
    };
  } catch (error) {
    console.error('Error in uploadFile:', error);
    throw new Error('Failed to upload file');
  }
};
