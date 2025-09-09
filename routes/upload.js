const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { asyncHandler, validationError } = require('../middleware/errorHandler');
const { uploadToCloudinary } = require('../utils/cloudinary');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Configure multer for document upload (images only to prevent cloudinary errors)
const documentUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // Single document
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, WebP). Please scan or photograph your documents.'), false);
    }
  }
});

// @desc    Upload multiple images
// @route   POST /api/upload/images
// @access  Private
router.post('/images', [
  protect,
  upload.array('images', 5) // Allow up to 5 images
], asyncHandler(async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(validationError('No files uploaded'));
    }

    // Upload all files to Cloudinary
    const uploadPromises = req.files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, {
        folder: 'listings',
        public_id: `listing_${req.user._id}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      });
      return result.secure_url;
    });

    const uploadedUrls = await Promise.all(uploadPromises);

    res.status(200).json({
      success: true,
      data: {
        urls: uploadedUrls,
        count: uploadedUrls.length
      },
      message: `Successfully uploaded ${uploadedUrls.length} image(s)`
    });

  } catch (error) {
    console.error('Error uploading images:', error);
    return next(error);
  }
}));

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private
router.post('/image', [
  protect,
  upload.single('image')
], asyncHandler(async (req, res, next) => {
  try {
    if (!req.file) {
      return next(validationError('No file uploaded'));
    }

    // Upload file to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'listings',
      public_id: `listing_${req.user._id}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    });

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        public_id: result.public_id
      },
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return next(error);
  }
}));

// @desc    Upload avatar image
// @route   POST /api/upload/avatar
// @access  Private
router.post('/avatar', [
  protect,
  upload.single('avatar')
], asyncHandler(async (req, res, next) => {
  try {
    if (!req.file) {
      return next(validationError('No file uploaded'));
    }

    // Upload avatar to Cloudinary with specific transformations
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'avatars',
      public_id: `avatar_${req.user._id}_${Date.now()}`,
      transformation: [
        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        public_id: result.public_id
      },
      message: 'Avatar uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return next(error);
  }
}));

// @desc    Upload education application document (images only)
// @route   POST /api/upload/document
// @access  Private
router.post('/document', [
  protect,
  documentUpload.single('document')
], asyncHandler(async (req, res, next) => {
  try {
    if (!req.file) {
      return next(validationError('No document uploaded'));
    }

    // Since we only accept images now, we can safely use image processing
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'education-documents',
      public_id: `document_${req.user._id}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      resource_type: 'image',
      transformation: [
        { width: 2000, height: 2000, crop: 'limit' }, // Limit size but maintain quality for documents
        { quality: 'auto:good' }
      ],
      // Override the default format settings to prevent conflicts
      format: undefined,
      fetch_format: undefined,
      // Ensure we don't inherit problematic default transformations
      transformation_override: true
    });

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        resource_type: 'image',
        format: result.format,
        bytes: result.bytes
      },
      message: 'Document image uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    return next(error);
  }
}));

// Error handler for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB per file.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files per upload.'
      });
    }
  }

  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed (JPEG, PNG, WebP, etc.)'
    });
  }

  if (error.message.includes('Invalid file type') || error.message.includes('Only image files are allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

module.exports = router; 