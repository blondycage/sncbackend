const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary from buffer
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      folder: 'listings',
      resource_type: 'image',
      format: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
      transformation: [
        { width: 1200, height: 800, crop: 'limit' },
        { quality: 'auto:good' },
        { format: 'auto' }
      ],
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error(`Image upload failed: ${error.message}`));
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array<Buffer>} buffers - Array of image buffers
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} Array of upload results
 */
const uploadMultipleToCloudinary = async (buffers, options = {}) => {
  try {
    const uploadPromises = buffers.map((buffer, index) => {
      const uploadOptions = {
        ...options,
        public_id: `${options.public_id || 'image'}_${index}_${Date.now()}`
      };
      return uploadToCloudinary(buffer, uploadOptions);
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw new Error('Failed to upload multiple images');
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Failed to delete image: ${result.result}`);
    }
    
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Image deletion failed: ${error.message}`);
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<string>} publicIds - Array of public IDs
 * @returns {Promise<Object>} Deletion result
 */
const deleteMultipleFromCloudinary = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    console.error('Multiple delete error:', error);
    throw new Error('Failed to delete multiple images');
  }
};

/**
 * Get optimized image URL
 * @param {string} publicId - Public ID of the image
 * @param {Object} transformation - Transformation options
 * @returns {string} Optimized image URL
 */
const getOptimizedImageUrl = (publicId, transformation = {}) => {
  const defaultTransformation = {
    quality: 'auto:good',
    format: 'auto',
    fetch_format: 'auto',
    ...transformation
  };

  return cloudinary.url(publicId, defaultTransformation);
};

/**
 * Generate responsive image URLs
 * @param {string} publicId - Public ID of the image
 * @returns {Object} Object containing different sized URLs
 */
const generateResponsiveUrls = (publicId) => {
  const baseOptions = {
    quality: 'auto:good',
    format: 'auto',
    fetch_format: 'auto'
  };

  return {
    thumbnail: cloudinary.url(publicId, {
      ...baseOptions,
      width: 150,
      height: 150,
      crop: 'fill'
    }),
    small: cloudinary.url(publicId, {
      ...baseOptions,
      width: 400,
      height: 300,
      crop: 'fill'
    }),
    medium: cloudinary.url(publicId, {
      ...baseOptions,
      width: 800,
      height: 600,
      crop: 'fill'
    }),
    large: cloudinary.url(publicId, {
      ...baseOptions,
      width: 1200,
      height: 800,
      crop: 'limit'
    }),
    original: cloudinary.url(publicId, baseOptions)
  };
};

/**
 * Upload user avatar
 * @param {Buffer} buffer - Image buffer
 * @param {string} userId - User ID for naming
 * @returns {Promise<Object>} Upload result
 */
const uploadAvatar = async (buffer, userId) => {
  try {
    const result = await uploadToCloudinary(buffer, {
      folder: 'avatars',
      public_id: `avatar_${userId}_${Date.now()}`,
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { format: 'auto' }
      ]
    });

    return result;
  } catch (error) {
    console.error('Avatar upload error:', error);
    throw new Error('Failed to upload avatar');
  }
};

/**
 * Validate image before upload
 * @param {Object} file - File object from multer
 * @returns {boolean} Whether the file is valid
 */
const validateImage = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
  }

  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.');
  }

  return true;
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} Public ID
 */
const extractPublicId = (url) => {
  try {
    const urlParts = url.split('/');
    const fileWithExtension = urlParts[urlParts.length - 1];
    const publicId = fileWithExtension.split('.')[0];
    
    // Handle folders in public ID
    const folderIndex = urlParts.findIndex(part => part === 'upload');
    if (folderIndex !== -1 && folderIndex < urlParts.length - 2) {
      const folders = urlParts.slice(folderIndex + 2, -1);
      return folders.length > 0 ? `${folders.join('/')}/${publicId}` : publicId;
    }
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

/**
 * Check if image exists in Cloudinary
 * @param {string} publicId - Public ID to check
 * @returns {Promise<boolean>} Whether the image exists
 */
const imageExists = async (publicId) => {
  try {
    await cloudinary.api.resource(publicId);
    return true;
  } catch (error) {
    if (error.error && error.error.http_code === 404) {
      return false;
    }
    throw error;
  }
};

/**
 * Get image metadata
 * @param {string} publicId - Public ID of the image
 * @returns {Promise<Object>} Image metadata
 */
const getImageMetadata = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      createdAt: result.created_at
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    throw new Error('Failed to get image metadata');
  }
};

/**
 * Create image archive (for backup purposes)
 * @param {Array<string>} publicIds - Array of public IDs
 * @returns {Promise<string>} Archive URL
 */
const createImageArchive = async (publicIds) => {
  try {
    const result = await cloudinary.utils.archive_url({
      resource_type: 'image',
      type: 'upload',
      public_ids: publicIds,
      format: 'zip'
    });

    return result;
  } catch (error) {
    console.error('Error creating archive:', error);
    throw new Error('Failed to create image archive');
  }
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  getOptimizedImageUrl,
  generateResponsiveUrls,
  uploadAvatar,
  validateImage,
  extractPublicId,
  imageExists,
  getImageMetadata,
  createImageArchive,
  cloudinary
}; 