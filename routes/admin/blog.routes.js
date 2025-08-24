const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const Blog = require('../../models/Blog');
const { protect, adminOnly } = require('../../middleware/auth');
const { asyncHandler, validationError, notFoundError } = require('../../middleware/errorHandler');

// All routes are prefixed with /api/admin/blog
// Protect all routes with authentication and admin middleware
router.use(protect, adminOnly);

// @desc    Get all blogs with filters and pagination (Admin)
// @route   GET /api/admin/blog
// @access  Admin
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  query('author').optional().isMongoId().withMessage('Invalid author ID'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search query cannot be empty'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'title', 'views', 'modified']).withMessage('Invalid sort option')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const {
    page = 1,
    limit = 20,
    status,
    author,
    search,
    sortBy = 'newest'
  } = req.query;

  // Build query
  const query = {};

  // Status filter
  if (status) {
    query.status = status;
  }

  // Author filter
  if (author) {
    query.author = author;
  }

  // Text search
  if (search) {
    query.$or = [
      { title: new RegExp(search, 'i') },
      { excerpt: new RegExp(search, 'i') },
      { content: new RegExp(search, 'i') }
    ];
  }

  // Build sort options
  let sortOptions = {};
  switch (sortBy) {
    case 'newest':
      sortOptions = { createdAt: -1 };
      break;
    case 'oldest':
      sortOptions = { createdAt: 1 };
      break;
    case 'title':
      sortOptions = { title: 1 };
      break;
    case 'views':
      sortOptions = { views: -1 };
      break;
    case 'modified':
      sortOptions = { lastModified: -1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const blogs = await Blog.find(query)
    .populate('author', 'firstName lastName username email')
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Blog.countDocuments(query);

  res.status(200).json({
    success: true,
    blogs: blogs,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
}));

// @desc    Get blog statistics
// @route   GET /api/admin/blog/stats
// @access  Admin
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    // Get basic counts
    const totalBlogs = await Blog.countDocuments();
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });
    const draftBlogs = await Blog.countDocuments({ status: 'draft' });
    const archivedBlogs = await Blog.countDocuments({ status: 'archived' });

    // Get total views and likes
    const viewsAggregation = await Blog.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const totalViews = viewsAggregation.length > 0 ? viewsAggregation[0].totalViews : 0;

    const likesAggregation = await Blog.aggregate([
      { $project: { likeCount: { $size: '$likes' } } },
      { $group: { _id: null, totalLikes: { $sum: '$likeCount' } } }
    ]);
    const totalLikes = likesAggregation.length > 0 ? likesAggregation[0].totalLikes : 0;

    // Get comments count
    const commentsAggregation = await Blog.aggregate([
      { $project: { commentCount: { $size: '$comments' } } },
      { $group: { _id: null, totalComments: { $sum: '$commentCount' } } }
    ]);
    const totalComments = commentsAggregation.length > 0 ? commentsAggregation[0].totalComments : 0;

    // Get recent blogs (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBlogs = await Blog.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });



    res.status(200).json({
      success: true,
      stats: {
        totalBlogs,
        publishedBlogs,
        draftBlogs,
        archivedBlogs,
        totalViews,
        totalLikes,
        totalComments,
        recentBlogs
      }
    });
  } catch (error) {
    console.error('Error fetching blog stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blog statistics'
    });
  }
}));

// @desc    Create new blog post
// @route   POST /api/admin/blog
// @access  Admin
router.post('/', [
  body('title').notEmpty().trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('excerpt').notEmpty().trim().isLength({ min: 10, max: 300 }).withMessage('Excerpt must be between 10 and 300 characters'),
  body('content').notEmpty().withMessage('Content is required'),
  body('featuredImage.url').isURL().withMessage('Featured image must be a valid URL'),
  body('categories').optional().isArray().withMessage('Categories must be an array'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  body('visibility').optional().isIn(['public', 'private', 'password_protected']).withMessage('Invalid visibility'),
  body('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  body('allowComments').optional().isBoolean().withMessage('Allow comments must be a boolean')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  // Generate unique slug
  let baseSlug = req.body.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');

  let slug = baseSlug;
  let counter = 1;

  // Ensure slug is unique
  while (await Blog.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const blogData = {
    ...req.body,
    slug,
    author: req.user._id
  };

  const blog = await Blog.create(blogData);

  res.status(201).json({
    success: true,
    message: 'Blog post created successfully',
    data: blog
  });
}));

// @desc    Get single blog post by ID
// @route   GET /api/admin/blog/:id
// @access  Admin
router.get('/:id', asyncHandler(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id)
    .populate('author', 'firstName lastName username email');

  if (!blog) {
    return next(notFoundError('Blog post not found'));
  }

  res.status(200).json({
    success: true,
    data: blog
  });
}));

// @desc    Update blog post
// @route   PUT /api/admin/blog/:id
// @access  Admin
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('excerpt').optional().trim().isLength({ min: 10, max: 300 }).withMessage('Excerpt must be between 10 and 300 characters'),
  body('content').optional().notEmpty().withMessage('Content cannot be empty'),
  body('categories').optional().isArray().withMessage('Categories must be an array'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  body('visibility').optional().isIn(['public', 'private', 'password_protected']).withMessage('Invalid visibility'),
  body('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  body('allowComments').optional().isBoolean().withMessage('Allow comments must be a boolean')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return next(notFoundError('Blog post not found'));
  }

  // Update slug if title changed
  if (req.body.title && req.body.title !== blog.title) {
    let baseSlug = req.body.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique (excluding current blog)
    while (await Blog.findOne({ slug, _id: { $ne: blog._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    req.body.slug = slug;
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('author', 'firstName lastName username email');

  res.status(200).json({
    success: true,
    message: 'Blog post updated successfully',
    data: updatedBlog
  });
}));

// @desc    Delete blog post
// @route   DELETE /api/admin/blog/:id
// @access  Admin
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return next(notFoundError('Blog post not found'));
  }

  await Blog.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Blog post deleted successfully'
  });
}));

// Comment moderation routes removed - comments are display only

module.exports = router;