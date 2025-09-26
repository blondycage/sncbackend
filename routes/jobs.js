const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const Job = require('../models/Job');
const User = require('../models/User');
const { protect, optionalAuth, checkUploadQuota, ownerOrAdmin, createRateLimit } = require('../middleware/auth');
const { asyncHandler, validationError, notFoundError, authorizationError } = require('../middleware/errorHandler');

// Rate limiting for job creation
const createJobRateLimit = createRateLimit(5, 60 * 60 * 1000, 'Too many job creation attempts');

// @desc    Get all jobs with filtering and search
// @route   GET /api/jobs
// @access  Public
router.get('/', [
  optionalAuth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('jobType').optional().isIn(['full-time', 'part-time', 'contract', 'freelance', 'internship']).withMessage('Invalid job type'),
  query('workLocation').optional().isIn(['remote', 'on-site', 'hybrid']).withMessage('Invalid work location'),
  query('minSalary').optional().isFloat({ min: 0 }).withMessage('Min salary must be non-negative'),
  query('maxSalary').optional().isFloat({ min: 0 }).withMessage('Max salary must be non-negative'),
  query('city').optional().trim().isLength({ min: 1 }).withMessage('City must not be empty'),
  query('region').optional().trim().isLength({ min: 1 }).withMessage('Region must not be empty'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search query must not be empty'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'salary-low', 'salary-high', 'deadline']).withMessage('Invalid sort option')
], asyncHandler(async (req, res, next) => {
  console.log('🔍 GET ALL JOBS - Request params:', req.query);

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const {
    page = 1,
    limit = 12,
    search,
    jobType,
    workLocation,
    minSalary,
    maxSalary,
    city,
    region,
    sortBy = 'newest'
  } = req.query;

  // Build query for all approved and open jobs
  const query = {
    moderationStatus: 'approved',
    status: 'open',
    applicationDeadline: { $gt: new Date() }
  };

  // Apply filters
  if (jobType) query.jobType = jobType;
  if (workLocation) query.workLocation = workLocation;
  if (region) query['location.region'] = new RegExp(region, 'i');

  if (minSalary !== undefined) {
    query['salary.min'] = { ...query['salary.min'], $gte: parseFloat(minSalary) };
  }
  if (maxSalary !== undefined) {
    query['salary.max'] = { ...query['salary.max'], $lte: parseFloat(maxSalary) };
  }

  // Apply location filter and search query properly
  if (city && search) {
    // When both city filter and search are present, combine them with $and
    query.$and = [
      { 'location.city': { $regex: new RegExp(`^${city}$`, 'i') } },
      {
        $or: [
          // Core job fields
          { title: { $regex: search, $options: 'i' } },
          { role: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { requirements: { $regex: search, $options: 'i' } },
          { benefits: { $regex: search, $options: 'i' } },

          // Job type and work arrangement
          { jobType: { $regex: search, $options: 'i' } },
          { workLocation: { $regex: search, $options: 'i' } },
          { status: { $regex: search, $options: 'i' } },

          // Location fields (excluding city since it's filtered separately)
          { 'location.region': { $regex: search, $options: 'i' } },
          { 'location.address': { $regex: search, $options: 'i' } },

          // Company information
          { 'company.name': { $regex: search, $options: 'i' } },
          { 'company.website': { $regex: search, $options: 'i' } },
          { 'company.description': { $regex: search, $options: 'i' } },

          // Contact information
          { 'contact.email': { $regex: search, $options: 'i' } },
          { 'contact.phone': { $regex: search, $options: 'i' } },

          // Salary information
          { 'salary.currency': { $regex: search, $options: 'i' } },
          { 'salary.frequency': { $regex: search, $options: 'i' } },

          // Moderation fields (for admin searches)
          { moderationStatus: { $regex: search, $options: 'i' } },
          { moderationNotes: { $regex: search, $options: 'i' } }
        ]
      }
    ];
  } else if (city) {
    // Only city filter
    query['location.city'] = { $regex: new RegExp(`^${city}$`, 'i') };
  } else if (search) {
    // Only search query
    query.$or = [
      // Core job fields
      { title: { $regex: search, $options: 'i' } },
      { role: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { requirements: { $regex: search, $options: 'i' } },
      { benefits: { $regex: search, $options: 'i' } },

      // Job type and work arrangement
      { jobType: { $regex: search, $options: 'i' } },
      { workLocation: { $regex: search, $options: 'i' } },
      { status: { $regex: search, $options: 'i' } },

      // Location fields
      { 'location.city': { $regex: search, $options: 'i' } },
      { 'location.region': { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } },

      // Company information
      { 'company.name': { $regex: search, $options: 'i' } },
      { 'company.website': { $regex: search, $options: 'i' } },
      { 'company.description': { $regex: search, $options: 'i' } },

      // Contact information
      { 'contact.email': { $regex: search, $options: 'i' } },
      { 'contact.phone': { $regex: search, $options: 'i' } },

      // Salary information
      { 'salary.currency': { $regex: search, $options: 'i' } },
      { 'salary.frequency': { $regex: search, $options: 'i' } },

      // Moderation fields (for admin searches)
      { moderationStatus: { $regex: search, $options: 'i' } },
      { moderationNotes: { $regex: search, $options: 'i' } }
    ];
  }

  console.log('🔍 Query being executed:', query);

  // Build sort options
  let sortOptions = {};
  switch (sortBy) {
    case 'newest':
      sortOptions = { createdAt: -1 };
      break;
    case 'oldest':
      sortOptions = { createdAt: 1 };
      break;
    case 'salary-low':
      sortOptions = { 'salary.min': 1 };
      break;
    case 'salary-high':
      sortOptions = { 'salary.max': -1 };
      break;
    case 'deadline':
      sortOptions = { applicationDeadline: 1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }

  // Execute query with pagination
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: sortOptions,
    populate: {
      path: 'postedBy',
      select: 'username firstName lastName company'
    },
    lean: true
  };

  try {
    const result = await Job.paginate(query, options);
    console.log('✅ Query successful, found', result.totalDocs, 'jobs');

    // Format response data
    const formattedJobs = result.docs.map(job => ({
      id: job._id,
      title: job.title,
      role: job.role,
      description: job.description,
      salary: job.salary,
      salaryRange: `${job.salary.currency} ${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()}/${job.salary.frequency}`,
      jobType: job.jobType,
      workLocation: job.workLocation,
      location: job.location,
      company: job.company,
      applicationDeadline: job.applicationDeadline,
      createdAt: job.createdAt,
      views: job.views,
      applicationCount: job.applicationCount,
      postedBy: job.postedBy
    }));

    res.status(200).json({
      success: true,
      data: formattedJobs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        limit: result.limit
      },
      filters: {
        jobType,
        workLocation,
        minSalary,
        maxSalary,
        city,
        region,
        search,
        sortBy
      }
    });
  } catch (error) {
    console.error('❌ Error fetching jobs:', error);
    return next(error);
  }
}));

// @desc    Get single job by ID
// @route   GET /api/jobs/:id
// @access  Public
router.get('/:id', [
  optionalAuth
], asyncHandler(async (req, res, next) => {
  console.log('🔍 GET SINGLE JOB - ID:', req.params.id);

  try {
    const job = await Job.findOne({
      _id: req.params.id,
      moderationStatus: 'approved',
      status: 'open'
    }).populate('postedBy', 'username firstName lastName company')
      .populate('applications.applicant', 'username firstName lastName email');

    if (!job) {
      return next(notFoundError('Job not found'));
    }

    // Increment views
    job.views += 1;
    await job.save();

    // Check if current user has applied
    let hasApplied = false;
    if (req.user) {
      hasApplied = job.applications.some(
        app => app.applicant._id.toString() === req.user._id.toString()
      );
    }

    const formattedJob = {
      id: job._id,
      title: job.title,
      role: job.role,
      description: job.description,
      salary: job.salary,
      salaryRange: job.salaryRange,
      jobType: job.jobType,
      workLocation: job.workLocation,
      requirements: job.requirements,
      benefits: job.benefits,
      location: job.location,
      company: job.company,
      contact: job.contact,
      applicationDeadline: job.applicationDeadline,
      createdAt: job.createdAt,
      views: job.views,
      applicationCount: job.applicationCount,
      postedBy: job.postedBy,
      hasApplied,
      isActive: job.isActive
    };

    res.status(200).json({
      success: true,
      data: formattedJob
    });
  } catch (error) {
    console.error('❌ Error fetching job:', error);
    return next(error);
  }
}));

// @desc    Create a new job
// @route   POST /api/jobs
// @access  Private
router.post('/', [
  protect,
  createJobRateLimit,
  
  // Add logging middleware before validation
  (req, res, next) => {
    console.log('🔥 POST /api/jobs - MIDDLEWARE ENTRY'.red.bold);
    console.log('📋 Raw Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📋 Content-Type:', req.get('Content-Type'));
    console.log('📋 Content-Length:', req.get('Content-Length'));
    console.log('📋 Raw Body (type):', typeof req.body);
    console.log('📋 Raw Body (stringified):', JSON.stringify(req.body, null, 2));
    console.log('📋 Body keys:', Object.keys(req.body || {}));
    console.log('📋 User info:', req.user ? { id: req.user._id, username: req.user.username } : 'No user');
    
    // Transform frontend data to backend schema
    if (req.body) {
      // Handle contact email mapping
      if (req.body.contactEmail && !req.body.contact) {
        req.body.contact = { email: req.body.contactEmail };
        delete req.body.contactEmail;
      }
      
      // Handle salary frequency mapping
      if (req.body.salary && req.body.salary.frequency === 'per year') {
        req.body.salary.frequency = 'yearly';
      }
      
      // Handle job type casing
      if (req.body.jobType) {
        req.body.jobType = req.body.jobType.toLowerCase();
      }
      
      // Handle work location mapping
      if (req.body.workLocation) {
        req.body.workLocation = req.body.workLocation.toLowerCase();
      }
      
      // Clean up location object - remove frontend-specific fields
      if (req.body.location) {
        const cleanLocation = {
          city: req.body.location.city,
          region: req.body.location.region || req.body.location.state || req.body.location.country
        };
        req.body.location = cleanLocation;
      }
      
      console.log('📋 Transformed Body:', JSON.stringify(req.body, null, 2));
    }
    
    next();
  },
  
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters')
    .custom((value, { req }) => {
      console.log('🔍 Validating title:', value);
      return true;
    }),
  body('role')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Role must be between 3 and 50 characters')
    .custom((value, { req }) => {
      console.log('🔍 Validating role:', value);
      return true;
    }),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters')
    .custom((value, { req }) => {
      console.log('🔍 Validating description length:', value ? value.length : 'undefined');
      return true;
    }),
  body('salary.min')
    .isFloat({ min: 0 })
    .withMessage('Minimum salary must be a positive number')
    .custom((value, { req }) => {
      console.log('🔍 Validating salary.min:', value);
      return true;
    }),
  body('salary.max')
    .isFloat({ min: 0 })
    .withMessage('Maximum salary must be a positive number')
    .custom((value, { req }) => {
      console.log('🔍 Validating salary.max:', value);
      return true;
    }),
  body('salary.currency')
    .isIn(['USD', 'EUR', 'GBP', 'TRY'])
    .withMessage('Currency must be one of: USD, EUR, GBP, TRY')
    .custom((value, { req }) => {
      console.log('🔍 Validating salary.currency:', value);
      return true;
    }),
  body('salary.frequency')
    .isIn(['hourly', 'daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Frequency must be one of: hourly, daily, weekly, monthly, yearly')
    .custom((value, { req }) => {
      console.log('🔍 Validating salary.frequency:', value);
      return true;
    }),
  body('jobType')
    .isIn(['full-time', 'part-time', 'contract', 'freelance', 'internship'])
    .withMessage('Job type must be one of: full-time, part-time, contract, freelance, internship')
    .custom((value, { req }) => {
      console.log('🔍 Validating jobType:', value);
      return true;
    }),
  body('workLocation')
    .isIn(['remote', 'on-site', 'hybrid'])
    .withMessage('Work location must be one of: remote, on-site, hybrid')
    .custom((value, { req }) => {
      console.log('🔍 Validating workLocation:', value);
      return true;
    }),
  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .custom((value, { req }) => {
      console.log('🔍 Validating location.city:', value);
      return true;
    }),
  body('location.region')
    .trim()
    .notEmpty()
    .withMessage('Region is required')
    .custom((value, { req }) => {
      console.log('🔍 Validating location.region:', value);
      return true;
    }),
  body('company.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters')
    .custom((value, { req }) => {
      console.log('🔍 Validating company.name:', value);
      return true;
    }),
  body('contact.email')
    .isEmail()
    .withMessage('Valid contact email is required')
    .custom((value, { req }) => {
      console.log('🔍 Validating contact.email:', value);
      return true;
    }),
  body('applicationDeadline')
    .isISO8601()
    .withMessage('Valid application deadline is required')
    .custom((value, { req }) => {
      console.log('🔍 Validating applicationDeadline:', value);
      return true;
    })
], asyncHandler(async (req, res, next) => {
  console.log('🚀 JOB CREATION HANDLER STARTED'.yellow.bold);
  console.log('📥 HANDLER RECEIVED BODY:', JSON.stringify(req.body, null, 2));
  console.log('📥 BODY TYPE:', typeof req.body);
  console.log('📥 BODY CONSTRUCTOR:', req.body?.constructor?.name);
  console.log('📥 IS EMPTY OBJECT?:', Object.keys(req.body || {}).length === 0);

  // Check for validation errors
  const errors = validationResult(req);
  console.log('🔍 VALIDATION RESULT:', errors.isEmpty() ? 'PASSED' : 'FAILED');
  
  if (!errors.isEmpty()) {
    console.log('❌ VALIDATION ERRORS:', JSON.stringify(errors.array(), null, 2));
    const errorMessages = errors.array().map(err => {
      console.log(`   - Field: ${err.path}, Value: ${err.value}, Message: ${err.msg}`);
      return err.msg;
    });
    return next(validationError(errorMessages.join(', ')));
  }

  console.log('✅ VALIDATION PASSED');

  try {
    // Log salary validation details
    console.log('💰 SALARY VALIDATION:');
    console.log('   - Min:', req.body.salary?.min, 'Type:', typeof req.body.salary?.min);
    console.log('   - Max:', req.body.salary?.max, 'Type:', typeof req.body.salary?.max);
    console.log('   - Currency:', req.body.salary?.currency);
    console.log('   - Frequency:', req.body.salary?.frequency);

    // Validate salary range
    if (req.body.salary?.max < req.body.salary?.min) {
      console.log('❌ SALARY RANGE ERROR: Max < Min');
      return next(validationError('Maximum salary must be greater than or equal to minimum salary'));
    }

    // Validate application deadline
    const deadline = new Date(req.body.applicationDeadline);
    console.log('📅 DEADLINE VALIDATION:');
    console.log('   - Raw deadline:', req.body.applicationDeadline);
    console.log('   - Parsed deadline:', deadline);
    console.log('   - Current time:', new Date());
    console.log('   - Is future?:', deadline > new Date());
    
    if (deadline <= new Date()) {
      console.log('❌ DEADLINE ERROR: Not in future');
      return next(validationError('Application deadline must be in the future'));
    }

    // Create job data
    const jobData = {
      ...req.body,
      postedBy: req.user._id,
      moderationStatus: 'pending'
    };

    console.log('📝 FINAL JOB DATA BEFORE CREATION:');
    console.log(JSON.stringify(jobData, null, 2));

    const job = await Job.create(jobData);

    await job.populate('postedBy', 'username firstName lastName');

    console.log('✅ Job created successfully:', job._id);

    res.status(201).json({
      success: true,
      message: 'Job created successfully. It will be reviewed by our moderators.',
      data: {
        id: job._id,
        title: job.title,
        role: job.role,
        moderationStatus: job.moderationStatus,
        createdAt: job.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error creating job:', error);
    console.error('❌ Error stack:', error.stack);
    return next(error);
  }
}));

// @desc    Apply for a job
// @route   POST /api/jobs/:id/apply
// @access  Private
router.post('/:id/apply', [
  protect,
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Cover letter cannot exceed 2000 characters'),
  body('resume')
    .optional()
    .isURL()
    .withMessage('Resume must be a valid URL')
], asyncHandler(async (req, res, next) => {
  console.log('🚀 JOB APPLICATION STARTED - Job ID:', req.params.id);

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  try {
    const job = await Job.findOne({
      _id: req.params.id,
      moderationStatus: 'approved',
      status: 'open'
    });

    if (!job) {
      return next(notFoundError('Job not found or not available for applications'));
    }

    // Check if user already applied
    const existingApplication = job.applications.find(
      app => app.applicant.toString() === req.user._id.toString()
    );

    if (existingApplication) {
      return next(validationError('You have already applied for this job'));
    }

    // Check if job is still accepting applications
    if (job.applicationDeadline <= new Date()) {
      return next(validationError('Application deadline has passed'));
    }

    // Add application
    job.applications.push({
      applicant: req.user._id,
      coverLetter: req.body.coverLetter,
      resume: req.body.resume,
      appliedAt: new Date()
    });

    await job.save();

    console.log('✅ Application submitted successfully');

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        jobId: job._id,
        jobTitle: job.title,
        appliedAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Error applying for job:', error);
    return next(error);
  }
}));

// @desc    Update job (owner only)
// @route   PUT /api/jobs/:id
// @access  Private
router.put('/:id', [
  protect,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters'),
  body('status')
    .optional()
    .isIn(['open', 'closed', 'filled'])
    .withMessage('Status must be one of: open, closed, filled')
], asyncHandler(async (req, res, next) => {
  console.log('🔄 JOB UPDATE STARTED - Job ID:', req.params.id);

  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return next(notFoundError('Job not found'));
    }

    // Check if user owns the job or is admin
    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(authorizationError('Not authorized to update this job'));
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'role', 'description', 'requirements', 'benefits', 'status', 'applicationDeadline'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // If modifying content, reset moderation status
    const contentFields = ['title', 'role', 'description', 'requirements', 'benefits'];
    const isContentUpdate = contentFields.some(field => req.body[field] !== undefined);
    
    if (isContentUpdate && req.user.role !== 'admin') {
      updates.moderationStatus = 'pending';
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('postedBy', 'username firstName lastName');

    console.log('✅ Job updated successfully');

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('❌ Error updating job:', error);
    return next(error);
  }
}));

// @desc    Delete job (owner only)
// @route   DELETE /api/jobs/:id
// @access  Private
router.delete('/:id', [
  protect
], asyncHandler(async (req, res, next) => {
  console.log('🗑️ JOB DELETION STARTED - Job ID:', req.params.id);

  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return next(notFoundError('Job not found'));
    }

    // Check if user owns the job or is admin
    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(authorizationError('Not authorized to delete this job'));
    }

    await Job.findByIdAndDelete(req.params.id);

    console.log('✅ Job deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting job:', error);
    return next(error);
  }
}));

// @desc    Get user's jobs
// @route   GET /api/jobs/my/jobs
// @access  Private
router.get('/my/jobs', [
  protect
], asyncHandler(async (req, res, next) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id })
      .populate('applications.applicant', 'username firstName lastName email')
      .sort({ createdAt: -1 });

    const formattedJobs = jobs.map(job => ({
      id: job._id,
      title: job.title,
      role: job.role,
      status: job.status,
      moderationStatus: job.moderationStatus,
      applicationCount: job.applicationCount,
      views: job.views,
      createdAt: job.createdAt,
      applicationDeadline: job.applicationDeadline,
      applications: job.applications.map(app => ({
        id: app._id,
        applicant: app.applicant,
        appliedAt: app.appliedAt,
        status: app.status
      }))
    }));

    res.status(200).json({
      success: true,
      data: formattedJobs
    });
  } catch (error) {
    console.error('❌ Error fetching user jobs:', error);
    return next(error);
  }
}));

module.exports = router; 