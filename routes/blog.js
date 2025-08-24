const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const Blog = require('../models/Blog');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, validationError, notFoundError } = require('../middleware/errorHandler');

// @desc    Get all published blogs with filtering and pagination
// @route   GET /api/blog
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().trim().isLength({ min: 1 }).withMessage('Category cannot be empty'),
  query('tag').optional().trim().isLength({ min: 1 }).withMessage('Tag cannot be empty'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search query cannot be empty'),
  query('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'popular', 'views']).withMessage('Invalid sort option')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const {
    page = 1,
    limit = 12,
    category,
    tag,
    search,
    featured,
    sortBy = 'newest'
  } = req.query;

  // Build query
  const query = {
    status: 'published',
    visibility: 'public',
    publishedAt: { $lte: new Date() }
  };

  // Category filter
  if (category) {
    query.categories = { $in: [category.toLowerCase()] };
  }

  // Tag filter
  if (tag) {
    query.tags = { $in: [tag.toLowerCase()] };
  }

  // Featured filter
  if (featured !== undefined) {
    query.featured = featured === 'true';
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Build sort options
  let sortOptions = {};
  switch (sortBy) {
    case 'newest':
      sortOptions = { publishedAt: -1 };
      break;
    case 'oldest':
      sortOptions = { publishedAt: 1 };
      break;
    case 'popular':
      sortOptions = { likes: -1, views: -1 };
      break;
    case 'views':
      sortOptions = { views: -1 };
      break;
    default:
      sortOptions = { publishedAt: -1 };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const blogs = await Blog.find(query)
    .populate('author', 'firstName lastName username email')
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit))
    .select('-content'); // Don't include full content in list view

  // Get total count for pagination
  const total = await Blog.countDocuments(query);

  res.status(200).json({
    success: true,
    count: blogs.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: blogs
  });
}));

// @desc    Get featured blogs
// @route   GET /api/blog/featured
// @access  Public
router.get('/featured', asyncHandler(async (req, res) => {
  const blogs = await Blog.getFeatured(6);
  
  res.status(200).json({
    success: true,
    count: blogs.length,
    data: blogs
  });
}));

// @desc    Get blog categories
// @route   GET /api/blog/categories
// @access  Public
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await Blog.aggregate([
    { $match: { status: 'published', visibility: 'public' } },
    { $unwind: '$categories' },
    { $group: { _id: '$categories', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: categories.map(cat => ({
      name: cat._id,
      count: cat.count
    }))
  });
}));

// @desc    Get blog tags
// @route   GET /api/blog/tags
// @access  Public
router.get('/tags', asyncHandler(async (req, res) => {
  const tags = await Blog.aggregate([
    { $match: { status: 'published', visibility: 'public' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 30 }
  ]);

  res.status(200).json({
    success: true,
    data: tags.map(tag => ({
      name: tag._id,
      count: tag.count
    }))
  });
}));

// @desc    Get single blog by slug
// @route   GET /api/blog/:slug
// @access  Public
router.get('/:slug', asyncHandler(async (req, res, next) => {
  const blog = await Blog.findOne({ 
    slug: req.params.slug,
    status: 'published',
    visibility: 'public'
  })
  .populate('author', 'firstName lastName username email')
  .populate('relatedPosts', 'title slug excerpt featuredImage publishedAt');

  if (!blog) {
    return next(notFoundError('Blog post not found'));
  }

  // Increment views
  await blog.incrementViews();

  res.status(200).json({
    success: true,
    data: blog
  });
}));

// @desc    Like/unlike a blog post
// @route   POST /api/blog/:slug/like
// @access  Private
router.post('/:slug/like', [protect], asyncHandler(async (req, res, next) => {
  const blog = await Blog.findOne({ slug: req.params.slug });

  if (!blog) {
    return next(notFoundError('Blog post not found'));
  }

  const existingLike = blog.likes.find(like => like.user.toString() === req.user._id.toString());

  if (existingLike) {
    // Unlike
    await blog.removeLike(req.user._id);
    res.status(200).json({
      success: true,
      message: 'Blog post unliked',
      liked: false,
      likeCount: blog.likeCount
    });
  } else {
    // Like
    await blog.addLike(req.user._id);
    res.status(200).json({
      success: true,
      message: 'Blog post liked',
      liked: true,
      likeCount: blog.likeCount
    });
  }
}));

// Comment submission removed - comments are display only

// @desc    Validate media URL
// @route   POST /api/blog/validate-media
// @access  Private/Admin
router.post('/validate-media', [
  protect,
  adminOnly,
  body('url').isURL().withMessage('Valid URL is required'),
  body('type').isIn(['image', 'video']).withMessage('Type must be image or video')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const { url, type } = req.body;

  // Basic URL validation for common image/video hosting services
  const validDomains = [
    'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
    'unsplash.com', 'pexels.com', 'pixabay.com', 'imgur.com',
    'cloudinary.com', 'amazonaws.com', 'googleusercontent.com',
    'github.com', 'githubusercontent.com', 'cdn.', 'images.'
  ];

  const urlObj = new URL(url);
  const isValidDomain = validDomains.some(domain => 
    urlObj.hostname.includes(domain) || urlObj.hostname.endsWith(domain)
  );

  // Check file extension for images
  if (type === 'image') {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    if (!imageExtensions.test(urlObj.pathname) && !isValidDomain) {
      return next(validationError('Invalid image URL format'));
    }
  }

  // Check for video URLs
  if (type === 'video') {
    const videoExtensions = /\.(mp4|webm|ogg|mov|avi)$/i;
    const isVideoService = /youtube|youtu\.be|vimeo|dailymotion/i.test(urlObj.hostname);
    
    if (!videoExtensions.test(urlObj.pathname) && !isVideoService && !isValidDomain) {
      return next(validationError('Invalid video URL format'));
    }
  }

  res.status(200).json({
    success: true,
    message: 'Media URL is valid',
    data: {
      url,
      type,
      domain: urlObj.hostname
    }
  });
}));

module.exports = router;