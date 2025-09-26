const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const EducationalProgram = require('../models/EducationalProgram');
const Application = require('../models/Application');
const { protect, adminOnly, authorize } = require('../middleware/auth');
const { asyncHandler, validationError, notFoundError } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const { uploadToCloudinary, validateImage } = require('../utils/cloudinary');

// Configure multer for memory storage (for Cloudinary uploads)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  }
});

// @desc    Get all educational programs with filtering and search
// @route   GET /api/education/programs
// @access  Public
router.get('/programs', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('level').optional().isIn([
    'undergraduate', 'undergraduate_transfer', 'postgraduate_masters', 
    'postgraduate_phd', 'graduate', 'doctorate', 'certificate', 'diploma', 'language_course'
  ]).withMessage('Invalid program level'),
  query('fieldOfStudy').optional().isIn([
    'computer_science', 'engineering', 'business', 'medicine', 'law', 'education',
    'arts_humanities', 'social_sciences', 'natural_sciences', 'mathematics',
    'psychology', 'tourism_hospitality', 'architecture', 'design', 'music',
    'sports_science', 'agriculture', 'veterinary', 'pharmacy', 'dentistry',
    'nursing', 'languages', 'communications', 'international_relations', 'economics',
    'other'
  ]).withMessage('Invalid field of study'),
  query('city').optional().isIn([
    'Nicosia', 'Lefkoşa', 'Famagusta', 'Gazimağusa', 'Kyrenia', 'Girne',
    'Morphou', 'Güzelyurt', 'İskele', 'Lefke'
  ]).withMessage('Invalid city'),
  query('tuitionMin').optional().isFloat({ min: 0 }).withMessage('Minimum tuition must be a positive number'),
  query('tuitionMax').optional().isFloat({ min: 0 }).withMessage('Maximum tuition must be a positive number'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search query must not be empty'),
  query('tags').optional().trim().isLength({ min: 1 }).withMessage('Tags must not be empty'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'tuition_low', 'tuition_high', 'title', 'applications']).withMessage('Invalid sort option'),
  query('featured').optional().isBoolean().withMessage('Featured must be a boolean')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const {
    page = 1,
    limit = 12,
    level,
    field,
    city,
    tuitionMin,
    tuitionMax,
    search,
    tags,
    sortBy = 'newest',
    featured
  } = req.query;

  // Build query
  const query = {
    status: 'active',
    moderationStatus: 'approved'
  };

  // Level filter
  if (level) {
    query.level = level;
  }

  // Field filter
  if (field) {
    query.field = field;
  }

  // Tuition range filter
  if (tuitionMin || tuitionMax) {
    query['tuition.amount'] = {};
    if (tuitionMin) query['tuition.amount'].$gte = parseFloat(tuitionMin);
    if (tuitionMax) query['tuition.amount'].$lte = parseFloat(tuitionMax);
  }

  // Featured filter
  if (featured !== undefined) {
    query.featured = featured === 'true';
  }

  // Apply location filter and search query properly
  if (city && search) {
    // When both city filter and search are present, combine them with $and
    query.$and = [
      { 'location.city': { $regex: new RegExp(`^${city}$`, 'i') } },
      {
        $or: [
          // Core program fields
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { level: { $regex: search, $options: 'i' } },
          { fieldOfStudy: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } },

          // Institution information
          { 'institution.name': { $regex: search, $options: 'i' } },
          { 'institution.website': { $regex: search, $options: 'i' } },

          // Location fields (excluding city since it's filtered separately)
          { 'location.address': { $regex: search, $options: 'i' } },
          { 'location.campus': { $regex: search, $options: 'i' } },

          // Language and academic information
          { 'language.instruction': { $regex: search, $options: 'i' } },
          { 'language.requirements': { $regex: search, $options: 'i' } },
          { 'duration.unit': { $regex: search, $options: 'i' } },
          { 'tuition.currency': { $regex: search, $options: 'i' } },
          { 'tuition.period': { $regex: search, $options: 'i' } },

          // Admission requirements
          { 'admissionRequirements.academicRequirements': { $regex: search, $options: 'i' } },
          { 'admissionRequirements.languageRequirements': { $regex: search, $options: 'i' } },
          { 'admissionRequirements.documentsRequired': { $regex: search, $options: 'i' } },
          { 'admissionRequirements.additionalRequirements': { $regex: search, $options: 'i' } },

          // Contact information
          { 'contactInfo.email': { $regex: search, $options: 'i' } },
          { 'contactInfo.phone': { $regex: search, $options: 'i' } },
          { 'contactInfo.website': { $regex: search, $options: 'i' } },
          { 'contactInfo.admissionsOffice': { $regex: search, $options: 'i' } },

          // Status and moderation fields (for admin searches)
          { status: { $regex: search, $options: 'i' } },
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
      // Core program fields
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { level: { $regex: search, $options: 'i' } },
      { fieldOfStudy: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },

      // Institution information
      { 'institution.name': { $regex: search, $options: 'i' } },
      { 'institution.website': { $regex: search, $options: 'i' } },

      // Location fields
      { 'location.city': { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } },
      { 'location.campus': { $regex: search, $options: 'i' } },

      // Language and academic information
      { 'language.instruction': { $regex: search, $options: 'i' } },
      { 'language.requirements': { $regex: search, $options: 'i' } },
      { 'duration.unit': { $regex: search, $options: 'i' } },
      { 'tuition.currency': { $regex: search, $options: 'i' } },
      { 'tuition.period': { $regex: search, $options: 'i' } },

      // Admission requirements
      { 'admissionRequirements.academicRequirements': { $regex: search, $options: 'i' } },
      { 'admissionRequirements.languageRequirements': { $regex: search, $options: 'i' } },
      { 'admissionRequirements.documentsRequired': { $regex: search, $options: 'i' } },
      { 'admissionRequirements.additionalRequirements': { $regex: search, $options: 'i' } },

      // Contact information
      { 'contactInfo.email': { $regex: search, $options: 'i' } },
      { 'contactInfo.phone': { $regex: search, $options: 'i' } },
      { 'contactInfo.website': { $regex: search, $options: 'i' } },
      { 'contactInfo.admissionsOffice': { $regex: search, $options: 'i' } },

      // Status and moderation fields (for admin searches)
      { status: { $regex: search, $options: 'i' } },
      { moderationStatus: { $regex: search, $options: 'i' } },
      { moderationNotes: { $regex: search, $options: 'i' } }
    ];
  }

  // Tags filter
  if (tags) {
    const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
    query.tags = { $in: tagArray };
  }

  // Build sort options
  let sortOptions = {};
  switch (sortBy) {
    case 'newest':
      sortOptions = { featured: -1, createdAt: -1 };
      break;
    case 'oldest':
      sortOptions = { createdAt: 1 };
      break;
    case 'tuition_low':
      sortOptions = { 'tuition.amount': 1 };
      break;
    case 'tuition_high':
      sortOptions = { 'tuition.amount': -1 };
      break;
    case 'title':
      sortOptions = { title: 1 };
      break;
    case 'applications':
      sortOptions = { applications: -1 };
      break;
    default:
      sortOptions = { featured: -1, createdAt: -1 };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const programs = await EducationalProgram.find(query)
    .populate('createdBy', 'firstName lastName')
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await EducationalProgram.countDocuments(query);

  res.status(200).json({
    success: true,
    count: programs.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: programs
  });
}));

// @desc    Get featured educational programs
// @route   GET /api/education/featured
// @access  Public
router.get('/featured', asyncHandler(async (req, res, next) => {
  const programs = await EducationalProgram.getFeatured()
    .populate('createdBy', 'firstName lastName')
    .limit(6);

  res.status(200).json({
    success: true,
    count: programs.length,
    data: programs
  });
}));

// @desc    Get featured educational programs
// @route   GET /api/education/programs/featured
// @access  Public
router.get('/programs/featured', asyncHandler(async (req, res, next) => {
  const programs = await EducationalProgram.getFeatured()
    .populate('createdBy', 'firstName lastName')
    .limit(6);

  res.status(200).json({
    success: true,
    count: programs.length,
    data: programs
  });
}));

// @desc    Get single educational program
// @route   GET /api/education/programs/:id
// @access  Public
router.get('/programs/:id', asyncHandler(async (req, res, next) => {
  const program = await EducationalProgram.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email');

  if (!program) {
    return next(notFoundError('Educational program not found'));
  }

  // Increment views
  await program.incrementViews();

  res.status(200).json({
    success: true,
    data: program
  });
}));

// @desc    Create educational program (Admin only)
// @route   POST /api/education/programs
// @access  Admin
router.post('/programs', [
  protect,
  adminOnly,
  body('title').notEmpty().withMessage('Program title is required'),
  body('institution.name').notEmpty().withMessage('Institution name is required'),
  body('description').notEmpty().withMessage('Program description is required'),
  body('level').isIn([
    'undergraduate', 'undergraduate_transfer', 'postgraduate_masters', 
    'postgraduate_phd', 'graduate', 'doctorate', 'certificate', 'diploma', 'language_course'
  ]).withMessage('Invalid program level'),
  body('fieldOfStudy').optional().isIn([
    'computer_science', 'engineering', 'business', 'medicine', 'law', 'education',
    'arts_humanities', 'social_sciences', 'natural_sciences', 'mathematics',
    'psychology', 'tourism_hospitality', 'architecture', 'design', 'music',
    'sports_science', 'agriculture', 'veterinary', 'pharmacy', 'dentistry',
    'nursing', 'languages', 'communications', 'international_relations', 'economics',
    'other'
  ]).withMessage('Invalid field of study'),
  body('duration.value').isInt({ min: 1 }).withMessage('Duration value must be a positive integer'),
  body('duration.unit').isIn(['months', 'years', 'semesters']).withMessage('Invalid duration unit'),
  body('tuition.amount').isFloat({ min: 0 }).withMessage('Tuition amount must be a positive number'),
  body('tuition.currency').isIn(['USD', 'EUR', 'TRY', 'GBP']).withMessage('Invalid currency'),
  body('tuition.period').isIn(['per_semester', 'per_year', 'total', 'per_month']).withMessage('Invalid tuition period'),
  body('location.city').isIn([
    'Nicosia', 'Lefkoşa', 'Famagusta', 'Gazimağusa', 'Kyrenia', 'Girne',
    'Morphou', 'Güzelyurt', 'İskele', 'Lefke'
  ]).withMessage('Invalid city')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  // Add created by user
  req.body.createdBy = req.user._id;

  const program = await EducationalProgram.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Educational program created successfully',
    data: program
  });
}));

// @desc    Update educational program (Admin only)
// @route   PUT /api/education/programs/:id
// @access  Admin
router.put('/programs/:id', [
  protect,
  adminOnly
], asyncHandler(async (req, res, next) => {
  let program = await EducationalProgram.findById(req.params.id);

  if (!program) {
    return next(notFoundError('Educational program not found'));
  }

  // Don't allow updating certain fields
  delete req.body.createdBy;
  delete req.body.views;
  delete req.body.applications;

  program = await EducationalProgram.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Educational program updated successfully',
    data: program
  });
}));

// @desc    Delete educational program (Admin only)
// @route   DELETE /api/education/programs/:id
// @access  Admin
router.delete('/programs/:id', [
  protect,
  adminOnly
], asyncHandler(async (req, res, next) => {
  const program = await EducationalProgram.findById(req.params.id);

  if (!program) {
    return next(notFoundError('Educational program not found'));
  }

  await program.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Educational program deleted successfully'
  });
}));

// @desc    Submit application for educational program
// @route   POST /api/education/programs/:id/apply
// @access  Private
router.post('/programs/:id/apply', [
  protect,
  body('personalInfo.firstName').notEmpty().withMessage('First name is required'),
  body('personalInfo.lastName').notEmpty().withMessage('Last name is required'),
  body('personalInfo.email').isEmail().withMessage('Valid email is required'),
  body('personalInfo.phone').notEmpty().withMessage('Phone number is required'),
  body('personalInfo.dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('personalInfo.nationality').notEmpty().withMessage('Nationality is required'),
  body('familyInfo.fatherName').notEmpty().withMessage('Father name is required'),
  body('familyInfo.motherName').notEmpty().withMessage('Mother name is required'),
  body('academicBackground.highSchool.name').notEmpty().withMessage('High school name is required'),
  body('academicBackground.highSchool.graduationYear').isInt({ min: 1950 }).withMessage('Valid graduation year is required'),
  body('applicationInfo.intendedStartSemester').isIn(['fall', 'spring', 'summer']).withMessage('Invalid start semester'),
  body('applicationInfo.intendedStartYear').isInt({ min: new Date().getFullYear() }).withMessage('Invalid start year'),
  body('applicationInfo.motivation').notEmpty().withMessage('Motivation statement is required')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const program = await EducationalProgram.findById(req.params.id);

  if (!program) {
    return next(notFoundError('Educational program not found'));
  }

  if (program.status !== 'active' || program.moderationStatus !== 'approved') {
    return next(validationError('This program is not accepting applications'));
  }

  // Check if user already has an active application for this program
  const existingApplication = await Application.findOne({
    applicant: req.user._id,
    program: req.params.id,
    status: { $nin: ['rejected', 'withdrawn'] }
  });

  if (existingApplication) {
    return next(validationError('You already have an active application for this program'));
  }

  // Create application
  const applicationData = {
    applicant: req.user._id,
    program: req.params.id,
    ...req.body
  };

  const application = await Application.create(applicationData);

  // Increment program applications count
  await program.incrementApplications();

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: application
  });
}));

// @desc    Get user's applications
// @route   GET /api/education/applications
// @access  Private
router.get('/applications', [
  protect
], asyncHandler(async (req, res, next) => {
  const applications = await Application.find({ applicant: req.user._id })
    .populate('program', 'title institution.name level location.city tuition')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: applications.length,
    data: applications
  });
}));

// @desc    Get single application
// @route   GET /api/education/applications/:id
// @access  Private
router.get('/applications/:id', [
  protect
], asyncHandler(async (req, res, next) => {
  const application = await Application.findById(req.params.id)
    .populate('program', 'title institution.name level location.city tuition requirements')
    .populate('applicant', 'firstName lastName email');

  if (!application) {
    return next(notFoundError('Application not found'));
  }

  // Check if user owns this application or is admin
  if (application.applicant._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(validationError('Not authorized to view this application'));
  }

  res.status(200).json({
    success: true,
    data: application
  });
}));

// @desc    Update application
// @route   PUT /api/education/applications/:id
// @access  Private
router.put('/applications/:id', [
  protect
], asyncHandler(async (req, res, next) => {
  let application = await Application.findById(req.params.id);

  if (!application) {
    return next(notFoundError('Application not found'));
  }

  // Check if user owns this application
  if (application.applicant.toString() !== req.user._id.toString()) {
    return next(validationError('Not authorized to update this application'));
  }

  // Only allow updates if application is in draft status
  if (application.status !== 'draft') {
    return next(validationError('Can only update draft applications'));
  }

  // Don't allow updating certain fields
  delete req.body.applicant;
  delete req.body.program;
  delete req.body.applicationId;
  delete req.body.status;
  delete req.body.timeline;
  delete req.body.reviewNotes;

  application = await Application.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Application updated successfully',
    data: application
  });
}));

// @desc    Submit application (change from draft to submitted)
// @route   POST /api/education/applications/:id/submit
// @access  Private
router.post('/applications/:id/submit', [
  protect
], asyncHandler(async (req, res, next) => {
  const application = await Application.findById(req.params.id);

  if (!application) {
    return next(notFoundError('Application not found'));
  }

  // Check if user owns this application
  if (application.applicant.toString() !== req.user._id.toString()) {
    return next(validationError('Not authorized to submit this application'));
  }

  // Can only submit draft applications
  if (application.status !== 'draft') {
    return next(validationError('Application has already been submitted'));
  }

  await application.submit();

  res.status(200).json({
    success: true,
    message: 'Application submitted successfully',
    data: application
  });
}));

// @desc    Upload document for application
// @route   POST /api/education/applications/:id/documents
// @access  Private
router.post('/applications/:id/documents', [
  protect,
  upload.single('document'),
  body('documentType').notEmpty().withMessage('Document type is required')
], asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(validationError('No file uploaded'));
  }

  const application = await Application.findById(req.params.id);

  if (!application) {
    return next(notFoundError('Application not found'));
  }

  // Check if user owns this application
  if (application.applicant.toString() !== req.user._id.toString()) {
    return next(validationError('Not authorized to upload documents for this application'));
  }

  try {
    const { documentType } = req.body;
    
    // Validate file type for images
    if (req.file.mimetype.startsWith('image/')) {
      validateImage(req.file);
    }

    // Upload to Cloudinary
    const uploadOptions = {
      folder: 'education/documents',
      resource_type: req.file.mimetype.startsWith('image/') ? 'image' : 'raw',
      public_id: `${application._id}_${documentType}_${Date.now()}`,
      format: 'auto',
      quality: 'auto:good'
    };

    const result = await uploadToCloudinary(req.file.buffer, uploadOptions);

    // Update document in application
    const validDocumentTypes = [
      'passportDatapage', 'passportPhotograph', 'waecNecoResults', 'bachelorTranscript',
      'bachelorDiploma', 'masterTranscript', 'masterDiploma', 'cv', 'researchProposal', 'englishProficiency'
    ];

    if (validDocumentTypes.includes(documentType)) {
      if (!application.documents[documentType]) {
        application.documents[documentType] = {};
      }
      application.documents[documentType].uploaded = true;
      application.documents[documentType].url = result.secure_url;
      application.documents[documentType].cloudinaryId = result.public_id;
    } else {
      // For additional documents
      application.documents.additional.push({
        name: documentType,
        url: result.secure_url,
        cloudinaryId: result.public_id,
        uploaded: true
      });
    }

    await application.save();

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        documentType,
        url: result.secure_url,
        cloudinaryId: result.public_id
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    return next(validationError(`Document upload failed: ${error.message}`));
  }
}));

// Admin routes for managing applications

// @desc    Get all applications (Admin only)
// @route   GET /api/education/admin/applications
// @access  Admin
router.get('/admin/applications', [
  protect,
  adminOnly,
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
    .populate('applicant', 'firstName lastName email')
    .populate('program', 'title institution.name level')
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Application.countDocuments(query);

  res.status(200).json({
    success: true,
    count: applications.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: applications
  });
}));

// @desc    Update application status (Admin only)
// @route   PUT /api/education/admin/applications/:id/status
// @access  Admin
router.put('/admin/applications/:id/status', [
  protect,
  adminOnly,
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

  // Update status
  application.status = status;

  // Add review note if provided
  if (notes) {
    application.reviewNotes.push({
      reviewer: req.user._id,
      notes,
      recommendation: status === 'approved' ? 'approve' : 
                     status === 'rejected' ? 'reject' : 
                     status === 'conditionally_approved' ? 'conditionally_approve' : 'request_documents',
      timestamp: new Date()
    });
  }

  await application.save();

  res.status(200).json({
    success: true,
    message: 'Application status updated successfully',
    data: application
  });
}));

module.exports = router; 