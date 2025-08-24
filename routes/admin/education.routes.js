const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const EducationalProgram = require('../../models/EducationalProgram');
const Application = require('../../models/Application');
const { protect, adminOnly } = require('../../middleware/auth');
const { asyncHandler, validationError, notFoundError } = require('../../middleware/errorHandler');

// All routes are prefixed with /api/admin/education
// Protect all routes with authentication and admin middleware
router.use(protect, adminOnly);

// @desc    Get all educational programs with filters and pagination
// @route   GET /api/admin/education/programs
// @access  Admin
router.get('/programs', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['active', 'inactive', 'pending']).withMessage('Invalid status'),
  query('level').optional().isIn([
    'undergraduate', 'graduate', 'doctorate', 'certificate'
  ]).withMessage('Invalid program level'),
  query('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search query must not be empty'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'title', 'applications', 'views']).withMessage('Invalid sort option')
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
    level,
    featured,
    search,
    sortBy = 'newest'
  } = req.query;

  // Build query
  const query = {};

  // Status filter
  if (status) {
    query.status = status;
  }

  // Level filter
  if (level) {
    query.level = level;
  }

  // Featured filter
  if (featured !== undefined) {
    query.featured = featured === 'true';
  }

  // Text search
  if (search) {
    query.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { 'institution.name': new RegExp(search, 'i') }
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
    case 'applications':
      sortOptions = { applications: -1 };
      break;
    case 'views':
      sortOptions = { views: -1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const programs = await EducationalProgram.find(query)
    .populate('createdBy', 'firstName lastName username email')
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await EducationalProgram.countDocuments(query);

  res.status(200).json({
    success: true,
    programs: programs,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
}));

// @desc    Get all applications with filters and pagination
// @route   GET /api/admin/education/applications
// @access  Admin
router.get('/applications', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn([
    'draft', 'submitted', 'under_review', 'documents_required',
    'approved', 'conditionally_approved', 'rejected', 'withdrawn',
    'enrolled', 'deferred'
  ]).withMessage('Invalid status'),
  query('program').optional().isMongoId().withMessage('Invalid program ID'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'status', 'program']).withMessage('Invalid sort option')
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
    program,
    sortBy = 'newest'
  } = req.query;

  // Build query
  const query = {};

  if (status) {
    query.status = status;
  }

  if (program) {
    query.program = program;
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
    case 'status':
      sortOptions = { status: 1, createdAt: -1 };
      break;
    case 'program':
      sortOptions = { program: 1, createdAt: -1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const applications = await Application.find(query)
    .populate('applicant', 'firstName lastName email username')
    .populate('program', 'title institution.name level')
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Application.countDocuments(query);

  res.status(200).json({
    success: true,
    applications: applications,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
}));

// @desc    Get education statistics
// @route   GET /api/admin/education/stats
// @access  Admin
router.get('/stats', asyncHandler(async (req, res, next) => {
  try {
    // Get programs statistics
    const totalPrograms = await EducationalProgram.countDocuments();
    const activePrograms = await EducationalProgram.countDocuments({ status: 'active' });
    const featuredPrograms = await EducationalProgram.countDocuments({ featured: true });

    // Get applications statistics
    const totalApplications = await Application.countDocuments();
    const pendingApplications = await Application.countDocuments({ 
      status: { $in: ['submitted', 'under_review', 'documents_required'] }
    });
    const approvedApplications = await Application.countDocuments({ 
      status: { $in: ['approved', 'conditionally_approved', 'enrolled'] }
    });
    const rejectedApplications = await Application.countDocuments({ status: 'rejected' });

    // Get monthly statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyApplications = await Application.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get total views for all programs
    const viewsAggregation = await EducationalProgram.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const monthlyViews = viewsAggregation.length > 0 ? viewsAggregation[0].totalViews : 0;

    const stats = {
      totalPrograms,
      activePrograms,
      featuredPrograms,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      monthlyApplications,
      monthlyViews
    };

    res.status(200).json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching education stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching education statistics'
    });
  }
}));

// @desc    Update program action (feature/unfeature/activate/deactivate)
// @route   PUT /api/admin/education/programs/:id/:action
// @access  Admin
router.put('/programs/:id/:action', [
  body('action').optional()
], asyncHandler(async (req, res, next) => {
  const { id, action } = req.params;

  const program = await EducationalProgram.findById(id);
  if (!program) {
    return next(notFoundError('Educational program not found'));
  }

  let updateData = {};

  switch (action) {
    case 'feature':
      updateData.featured = true;
      break;
    case 'unfeature':
      updateData.featured = false;
      break;
    case 'activate':
      updateData.status = 'active';
      updateData.moderationStatus = 'approved';
      break;
    case 'deactivate':
      updateData.status = 'inactive';
      break;
    case 'delete':
      await EducationalProgram.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: 'Educational program deleted successfully'
      });
    default:
      return next(validationError('Invalid action'));
  }

  // Use findByIdAndUpdate to bypass validation issues
  const updatedProgram = await EducationalProgram.findByIdAndUpdate(
    id,
    updateData,
    { 
      new: true, 
      runValidators: false // Skip validation to avoid required field issues
    }
  );

  res.status(200).json({
    success: true,
    message: `Program ${action}d successfully`,
    data: updatedProgram
  });
}));

// @desc    Update application status
// @route   PUT /api/admin/education/applications/:id/status
// @access  Admin
router.put('/applications/:id/status', [
  body('status').isIn([
    'submitted', 'under_review', 'documents_required',
    'approved', 'conditionally_approved', 'rejected', 'withdrawn',
    'enrolled', 'deferred'
  ]).withMessage('Invalid status'),
  body('notes').optional().isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const application = await Application.findById(req.params.id);

  if (!application) {
    return next(notFoundError('Application not found'));
  }

  const { status, notes } = req.body;

  let updateData = { status };

  // Add review note if provided
  if (notes) {
    const reviewNote = {
      reviewer: req.user._id,
      notes,
      recommendation: status === 'approved' ? 'approve' : 
                     status === 'rejected' ? 'reject' : 
                     status === 'conditionally_approved' ? 'conditionally_approve' : 'request_documents',
      timestamp: new Date()
    };
    
    // Use $push to add the review note
    const updatedApplication = await Application.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status },
        $push: { reviewNotes: reviewNote }
      },
      { new: true, runValidators: false }
    );

    return res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: updatedApplication
    });
  }

  // Update without review note
  const updatedApplication = await Application.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: false }
  );

  res.status(200).json({
    success: true,
    message: 'Application status updated successfully',
    data: updatedApplication
  });
}));

// @desc    Get single program
// @route   GET /api/admin/education/programs/:id
// @access  Admin
router.get('/programs/:id', asyncHandler(async (req, res, next) => {
  const program = await EducationalProgram.findById(req.params.id)
    .populate('createdBy', 'firstName lastName username email');

  if (!program) {
    return next(notFoundError('Educational program not found'));
  }

  res.status(200).json({
    success: true,
    data: program
  });
}));

// @desc    Get single application
// @route   GET /api/admin/education/applications/:id
// @access  Admin
router.get('/applications/:id', asyncHandler(async (req, res, next) => {
  const application = await Application.findById(req.params.id)
    .populate('program', 'title institution.name level location.city tuition requirements')
    .populate('applicant', 'firstName lastName email username');

  if (!application) {
    return next(notFoundError('Application not found'));
  }

  res.status(200).json({
    success: true,
    data: application
  });
}));

module.exports = router;