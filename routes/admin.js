const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const User = require('../models/User');
const Listing = require('../models/Listing');
const Job = require('../models/Job');
const EducationalProgram = require('../models/EducationalProgram');
const Application = require('../models/Application');
const Blog = require('../models/Blog');
const { protect, adminOnly, createRateLimit } = require('../middleware/auth');
const { asyncHandler, validationError, notFoundError } = require('../middleware/errorHandler');
const { sendEmail } = require('../utils/email');
const isAdmin = require('../middleware/isAdmin');

// Import admin sub-routes
const adminUsersRoutes = require('./admin/users.routes');
const adminListingsRoutes = require('./admin/listings.routes');
const adminJobsRoutes = require('./admin/jobs');
const adminEducationRoutes = require('./admin/education.routes');
const adminBlogRoutes = require('./admin/blog.routes');

// Apply admin middleware to all routes (rate limits disabled per request)
router.use(protect);
router.use(adminOnly);

// Register admin sub-routes
router.use('/users', adminUsersRoutes);
router.use('/listings', adminListingsRoutes);
router.use('/jobs', adminJobsRoutes);
router.use('/education', adminEducationRoutes);
router.use('/blog', adminBlogRoutes);

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
router.get('/dashboard', asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // User statistics
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const premiumUsers = await User.countDocuments({ isPremium: true });
  const todayUsers = await User.countDocuments({ 
    createdAt: { $gte: startOfDay } 
  });

  // Listing statistics
  const totalListings = await Listing.countDocuments();
  const approvedListings = await Listing.countDocuments({ 
    moderationStatus: 'approved' 
  });
  const pendingListings = await Listing.countDocuments({ 
    moderationStatus: 'pending' 
  });
  const rejectedListings = await Listing.countDocuments({ 
    moderationStatus: 'rejected' 
  });
  const todayListings = await Listing.countDocuments({ 
    createdAt: { $gte: startOfDay } 
  });

  // Job statistics
  const totalJobs = await Job.countDocuments();
  const approvedJobs = await Job.countDocuments({ 
    moderationStatus: 'approved' 
  });
  const pendingJobs = await Job.countDocuments({ 
    moderationStatus: 'pending' 
  });
  const rejectedJobs = await Job.countDocuments({ 
    moderationStatus: 'rejected' 
  });
  const openJobs = await Job.countDocuments({ 
    status: 'open', 
    moderationStatus: 'approved' 
  });
  const filledJobs = await Job.countDocuments({ 
    status: 'filled' 
  });
  const todayJobs = await Job.countDocuments({ 
    createdAt: { $gte: startOfDay } 
  });

  // Get total job applications
  const totalJobApplications = await Job.aggregate([
    { $unwind: '$applications' },
    { $count: 'total' }
  ]);

  // Education statistics
  const totalEducationPrograms = await EducationalProgram.countDocuments();
  const activeEducationPrograms = await EducationalProgram.countDocuments({ 
    status: 'active', 
    moderationStatus: 'approved' 
  });
  const pendingEducationPrograms = await EducationalProgram.countDocuments({ 
    moderationStatus: 'pending' 
  });
  const totalEducationApplications = await Application.countDocuments();
  const pendingEducationApplications = await Application.countDocuments({ 
    status: { $in: ['submitted', 'under_review', 'documents_required'] }
  });
  const approvedEducationApplications = await Application.countDocuments({ 
    status: { $in: ['approved', 'conditionally_approved', 'enrolled'] }
  });

  // Blog statistics
  const totalBlogs = await Blog.countDocuments();
  const publishedBlogs = await Blog.countDocuments({ status: 'published' });
  const draftBlogs = await Blog.countDocuments({ status: 'draft' });
  const featuredBlogs = await Blog.countDocuments({ featured: true });
  
  // Blog views and likes
  const blogViewsAggregation = await Blog.aggregate([
    { $group: { _id: null, totalViews: { $sum: '$views' } } }
  ]);
  const totalBlogViews = blogViewsAggregation.length > 0 ? blogViewsAggregation[0].totalViews : 0;

  const blogLikesAggregation = await Blog.aggregate([
    { $project: { likeCount: { $size: '$likes' } } },
    { $group: { _id: null, totalLikes: { $sum: '$likeCount' } } }
  ]);
  const totalBlogLikes = blogLikesAggregation.length > 0 ? blogLikesAggregation[0].totalLikes : 0;

  // Recent blogs (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentBlogs = await Blog.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Category breakdown
  const categoryStats = await Listing.aggregate([
    { $match: { moderationStatus: 'approved' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Job type breakdown
  const jobTypeStats = await Job.aggregate([
    { $match: { moderationStatus: 'approved' } },
    { $group: { _id: '$jobType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Recent activity
  const recentUsers = await User.find()
    .select('username firstName lastName email createdAt role')
    .sort({ createdAt: -1 })
    .limit(5);

  const recentListings = await Listing.find()
    .select('title category price.amount createdAt moderationStatus')
    .populate('owner', 'username')
    .sort({ createdAt: -1 })
    .limit(5);

  const recentJobs = await Job.find()
    .select('title role company.name createdAt moderationStatus status')
    .populate('postedBy', 'username')
    .sort({ createdAt: -1 })
    .limit(5);

  // Flagged listings count
  const flaggedListings = await Listing.countDocuments({
    'flags.0': { $exists: true }
  });

  // Flagged jobs count
  const flaggedJobs = await Job.countDocuments({
    isReported: true
  });

  // Revenue statistics (if applicable)
  const totalRevenue = await User.aggregate([
    { $match: { isPremium: true } },
    { $group: { _id: null, total: { $sum: '$premiumSubscription.amount' } } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        active: activeUsers,
        premium: premiumUsers,
        today: todayUsers
      },
      listings: {
        total: totalListings,
        approved: approvedListings,
        pending: pendingListings,
        rejected: rejectedListings,
        flagged: flaggedListings,
        today: todayListings
      },
      jobs: {
        total: totalJobs,
        approved: approvedJobs,
        pending: pendingJobs,
        rejected: rejectedJobs,
        open: openJobs,
        filled: filledJobs,
        flagged: flaggedJobs,
        today: todayJobs,
        totalApplications: totalJobApplications.length > 0 ? totalJobApplications[0].total : 0
      },
      education: {
        total: totalEducationPrograms,
        active: activeEducationPrograms,
        pending: pendingEducationPrograms,
        totalApplications: totalEducationApplications,
        pendingApplications: pendingEducationApplications,
        approvedApplications: approvedEducationApplications
      },
      blog: {
        total: totalBlogs,
        published: publishedBlogs,
        draft: draftBlogs,
        featured: featuredBlogs,
        totalViews: totalBlogViews,
        totalLikes: totalBlogLikes,
        recentBlogs: recentBlogs
      },
      categories: categoryStats,
      jobTypes: jobTypeStats,
      revenue: {
        total: totalRevenue[0]?.total || 0
      },
      recent: {
        users: recentUsers,
        listings: recentListings,
        jobs: recentJobs
      }
    }
  });
}));

// @desc    Get all users with filtering and pagination
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
  query('status').optional().isIn(['active', 'inactive', 'banned']).withMessage('Invalid status'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'username', 'email']).withMessage('Invalid sort option')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const {
    page = 1,
    limit = 20,
    search,
    role,
    status,
    sortBy = 'newest'
  } = req.query;

  // Build query
  const query = {};

  // Text search
  if (search) {
    query.$or = [
      { username: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') }
    ];
  }

  // Role filter
  if (role) {
    query.role = role;
  }

  // Status filter
  if (status === 'active') {
    query.isActive = true;
    query.banReason = { $exists: false };
  } else if (status === 'inactive') {
    query.isActive = false;
  } else if (status === 'banned') {
    query.banReason = { $exists: true };
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
    case 'username':
      sortOptions = { username: 1 };
      break;
    case 'email':
      sortOptions = { email: 1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: sortOptions,
    select: '-password -resetPasswordToken -emailVerificationToken'
  };

  const result = await User.paginate(query, options);

  res.status(200).json({
    success: true,
    data: result.docs,
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalItems: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      limit: result.limit
    }
  });
}));

// @desc    Get single user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
router.get('/users/:id', asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password -resetPasswordToken -emailVerificationToken');

  if (!user) {
    return next(notFoundError('User not found'));
  }

  // Get user's listings count
  const listingsCount = await Listing.countDocuments({ owner: user._id });
  const approvedListingsCount = await Listing.countDocuments({ 
    owner: user._id, 
    moderationStatus: 'approved' 
  });

  res.status(200).json({
    success: true,
    data: {
      ...user.toObject(),
      statistics: {
        totalListings: listingsCount,
        approvedListings: approvedListingsCount
      }
    }
  });
}));

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
router.put('/users/:id', [
  body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('isEmailVerified').optional().isBoolean().withMessage('isEmailVerified must be boolean'),
  body('isPremium').optional().isBoolean().withMessage('isPremium must be boolean')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(notFoundError('User not found'));
  }

  // Prevent self-demotion from admin
  if (req.params.id === req.user._id.toString() && req.body.role === 'user') {
    return next(validationError('Cannot demote yourself from admin'));
  }

  // Fields that can be updated by admin
  const allowedFields = [
    'role', 'isActive', 'isEmailVerified', 'isPremium',
    'firstName', 'lastName', 'phone'
  ];

  const updateData = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = req.body[key];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password -resetPasswordToken -emailVerificationToken');

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser
  });
}));

// @desc    Ban user
// @route   POST /api/admin/users/:id/ban
// @access  Private/Admin
router.post('/users/:id/ban', [
  body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Ban reason must be between 10 and 500 characters'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive integer (days)')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(notFoundError('User not found'));
  }

  // Prevent banning admin users
  if (user.role === 'admin') {
    return next(validationError('Cannot ban admin users'));
  }

  // Prevent self-ban
  if (req.params.id === req.user._id.toString()) {
    return next(validationError('Cannot ban yourself'));
  }

  const { reason, duration } = req.body;

  user.banReason = reason;
  user.bannedBy = req.user._id;
  user.bannedAt = new Date();
  
  if (duration) {
    user.banExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
  }

  await user.save();

  // Send ban notification email
  try {
    await sendEmail({
      to: user.email,
      subject: 'Account Suspended - SearchNorthCyprus',
      text: `Your account has been suspended. Reason: ${reason}${duration ? ` Duration: ${duration} days` : ' (Permanent)'}`,
      html: `
        <h2>Account Suspended</h2>
        <p>Your SearchNorthCyprus account has been suspended.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        ${duration ? `<p><strong>Duration:</strong> ${duration} days</p>` : '<p><strong>Duration:</strong> Permanent</p>'}
        <p>If you believe this is an error, please contact support.</p>
      `
    });
  } catch (error) {
    console.error('Failed to send ban notification email:', error);
  }

  res.status(200).json({
    success: true,
    message: 'User banned successfully'
  });
}));

// @desc    Unban user
// @route   POST /api/admin/users/:id/unban
// @access  Private/Admin
router.post('/users/:id/unban', asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(notFoundError('User not found'));
  }

  if (!user.banReason) {
    return next(validationError('User is not banned'));
  }

  user.banReason = undefined;
  user.bannedBy = undefined;
  user.bannedAt = undefined;
  user.banExpiresAt = undefined;

  await user.save();

  // Send unban notification email
  try {
    await sendEmail({
      to: user.email,
      subject: 'Account Restored - SearchNorthCyprus',
      text: 'Your SearchNorthCyprus account has been restored. You can now access all features.',
      html: `
        <h2>Account Restored</h2>
        <p>Your SearchNorthCyprus account has been restored.</p>
        <p>You can now access all features of the platform.</p>
        <p>Thank you for your patience.</p>
      `
    });
  } catch (error) {
    console.error('Failed to send unban notification email:', error);
  }

  res.status(200).json({
    success: true,
    message: 'User unbanned successfully'
  });
}));

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
router.delete('/users/:id', asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(notFoundError('User not found'));
  }

  // Prevent deleting admin users
  if (user.role === 'admin') {
    return next(validationError('Cannot delete admin users'));
  }

  // Prevent self-deletion
  if (req.params.id === req.user._id.toString()) {
    return next(validationError('Cannot delete yourself'));
  }

  // Delete or anonymize user's listings
  await Listing.deleteMany({ owner: user._id });

  // Delete user
  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// @desc    Get all listings for moderation
// @route   GET /api/admin/listings
// @access  Private/Admin
router.get('/listings', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'flagged']).withMessage('Invalid status'),
  query('category').optional().isIn(['Housing', 'Jobs', 'Services', 'Items for Sale']).withMessage('Invalid category'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'flagged']).withMessage('Invalid sort option')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const {
    page = 1,
    limit = 20,
    search,
    status,
    category,
    sortBy = 'newest'
  } = req.query;

  // Build query
  const query = {};

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Status filter
  if (status === 'flagged') {
    query['flags.0'] = { $exists: true };
  } else if (status) {
    query.moderationStatus = status;
  }

  // Category filter
  if (category) {
    query.category = category;
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
    case 'flagged':
      sortOptions = { 'flags.length': -1, createdAt: -1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: sortOptions,
    populate: [
      {
        path: 'owner',
        select: 'username firstName lastName email role'
      },
      {
        path: 'flags.user',
        select: 'username'
      }
    ]
  };

  const result = await Listing.paginate(query, options);

  res.status(200).json({
    success: true,
    data: result.docs,
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalItems: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      limit: result.limit
    }
  });
}));

// @desc    Moderate listing (approve/reject)
// @route   PUT /api/admin/listings/:id/moderate
// @access  Private/Admin
router.put('/listings/:id/moderate', [
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const listing = await Listing.findById(req.params.id).populate('owner', 'email username');

  if (!listing) {
    return next(notFoundError('Listing not found'));
  }

  const { action, reason } = req.body;

  listing.moderationStatus = action === 'approve' ? 'approved' : 'rejected';
  listing.moderatedBy = req.user._id;
  listing.moderatedAt = new Date();
  
  if (reason) {
    listing.moderationReason = reason;
  }

  await listing.save();

  // Send notification email to listing owner
  try {
    const subject = action === 'approve' ? 'Listing Approved' : 'Listing Rejected';
    const message = action === 'approve' 
      ? 'Your listing has been approved and is now live on SearchNorthCyprus.'
      : `Your listing has been rejected. ${reason ? `Reason: ${reason}` : ''}`;

    await sendEmail({
      to: listing.owner.email,
      subject: `${subject} - SearchNorthCyprus`,
      text: message,
      html: `
        <h2>${subject}</h2>
        <p><strong>Listing:</strong> ${listing.title}</p>
        <p>${message}</p>
        ${action === 'reject' ? '<p>You can edit and resubmit your listing for review.</p>' : ''}
      `
    });
  } catch (error) {
    console.error('Failed to send moderation notification email:', error);
  }

  res.status(200).json({
    success: true,
    message: `Listing ${action}d successfully`
  });
}));

// @desc    Clear flags from listing
// @route   DELETE /api/admin/listings/:id/flags
// @access  Private/Admin
router.delete('/listings/:id/flags', asyncHandler(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    return next(notFoundError('Listing not found'));
  }

  listing.flags = [];
  await listing.save();

  res.status(200).json({
    success: true,
    message: 'Flags cleared successfully'
  });
}));

// @desc    Get platform analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
router.get('/analytics', [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period')
], asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // User growth analytics
  const userGrowth = await User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  // Listing analytics
  const listingGrowth = await Listing.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  // Category distribution
  const categoryDistribution = await Listing.aggregate([
    { $match: { moderationStatus: 'approved' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Popular locations
  const popularLocations = await Listing.aggregate([
    { $match: { moderationStatus: 'approved' } },
    { $group: { _id: '$location.city', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  res.status(200).json({
    success: true,
    data: {
      period,
      userGrowth,
      listingGrowth,
      categoryDistribution,
      popularLocations
    }
  });
}));

// Get all listings (admin only)
router.get('/listings/all', [isAdmin], async (req, res) => {
  try {
    const listings = await Listing.find()
      .populate('owner', 'username email firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      listings
    });
  } catch (error) {
    console.error('Error fetching all listings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get total users count (admin only)
router.get('/users/count', [isAdmin], async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error counting users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Moderate a listing (admin only)
router.post('/listings/:id/moderate', [isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid moderation action'
      });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    listing.moderationStatus = action === 'approve' ? 'approved' : 'rejected';
    listing.status = action === 'approve' ? 'active' : 'inactive';
    listing.moderatedBy = req.user.id;
    listing.moderatedAt = new Date();

    await listing.save();

    res.json({
      success: true,
      message: `Listing ${action}ed successfully`,
      listing
    });
  } catch (error) {
    console.error('Error moderating listing:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete any listing (admin only)
router.delete('/listings/:id', [isAdmin], async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    await listing.remove();

    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all users (admin only)
router.get('/users', [isAdmin], async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 