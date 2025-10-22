const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const Dormitory = require('../models/Dormitory');
const User = require('../models/User');
const { protect, optionalAuth, checkUploadQuota, ownerOrAdmin, createRateLimit, adminOnly } = require('../middleware/auth');
const { asyncHandler, validationError, notFoundError, authorizationError } = require('../middleware/errorHandler');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// North Cyprus universities list for dropdown
const NORTH_CYPRUS_UNIVERSITIES = [
  'Eastern Mediterranean University (EMU)',
  'Near East University (NEU)',
  'European University of Lefke (EUL)',
  'Girne American University (GAU)',
  'Cyprus International University (CIU)',
  'University of Kyrenia',
  'Final International University',
  'Middle East Technical University Northern Cyprus Campus (METU NCC)',
  'American University of Cyprus',
  'Cyprus West University',
  'Arkın University of Creative Arts and Design',
  'University of Mediterranean Karpasia'
];

// North Cyprus cities list for filtering
const NORTH_CYPRUS_CITIES = [
  'Nicosia', 'Kyrenia', 'Famagusta', 'Morphou', 'Lefke', 'İskele',
  'Alsancak', 'Lapta', 'Çatalköy', 'Esentepe', 'Boğaz', 'Dipkarpaz',
  'Lapithos', 'Bellapais', 'Kayalar', 'Özanköy', 'Tatlısu', 'Zeytinlik'
];

// @desc    Get all dormitories with filtering and search
// @route   GET /api/dormitories
// @access  Public
router.get('/', [
  optionalAuth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('city').optional().trim().isLength({ min: 1 }).withMessage('City filter must not be empty'),
  query('university').optional().trim().isLength({ min: 1 }).withMessage('University filter must not be empty'),
  query('availability').optional().isIn(['available', 'running_out', 'unavailable']).withMessage('Invalid availability status'),
  query('genderRestriction').optional().isIn(['male', 'female', 'mixed']).withMessage('Invalid gender restriction'),
  query('roomType').optional().isIn(['single', 'double', 'triple', 'quad', 'five_person', 'six_person']).withMessage('Invalid room type'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be non-negative'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be non-negative'),
  query('priceFrequency').optional().isIn(['monthly', 'semester', 'yearly']).withMessage('Invalid price frequency'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search query must not be empty'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'price-low', 'price-high', 'views']).withMessage('Invalid sort option')
], asyncHandler(async (req, res, next) => {
  console.log('🔍 GET ALL DORMITORIES - Request query params:', req.query);

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const {
    page = 1,
    limit = 12,
    search,
    city,
    university,
    availability,
    genderRestriction,
    roomType,
    minPrice,
    maxPrice,
    priceFrequency,
    sortBy = 'newest'
  } = req.query;

  console.log('🎓 University param extracted:', university);

  // Build query object
  const query = {
    moderationStatus: 'approved',
    status: 'active'
  };

  // Apply filters
  if (city) {
    query['location.city'] = new RegExp(city, 'i');
  }

  if (university) {
    // Escape special regex characters and create case-insensitive regex
    const escapedUniversity = university.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query['university.name'] = new RegExp(escapedUniversity, 'i');
    console.log('🎓 University filter:', { original: university, escaped: escapedUniversity, regex: query['university.name'] });
  }

  if (availability) {
    query.availability = availability;
  }

  if (genderRestriction) {
    query.genderRestriction = genderRestriction;
  }

  if (roomType) {
    query['roomVariants.type'] = roomType;
  }

  if (priceFrequency) {
    query['roomVariants.priceFrequency'] = priceFrequency;
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceQuery = {};
    if (minPrice !== undefined) priceQuery.$gte = parseFloat(minPrice);
    if (maxPrice !== undefined) priceQuery.$lte = parseFloat(maxPrice);
    query['roomVariants.price'] = priceQuery;
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Sorting
  let sortOptions = {};
  switch (sortBy) {
    case 'oldest':
      sortOptions = { createdAt: 1 };
      break;
    case 'price-low':
      sortOptions = { 'roomVariants.price': 1 };
      break;
    case 'price-high':
      sortOptions = { 'roomVariants.price': -1 };
      break;
    case 'views':
      sortOptions = { views: -1 };
      break;
    case 'newest':
    default:
      sortOptions = { createdAt: -1 };
      break;
  }

  console.log('🔍 DORMITORIES QUERY:', query);
  console.log('🔍 DORMITORIES SORT:', sortOptions);

  try {
    const dormitories = await Dormitory.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('owner', 'firstName lastName phone email');

    const total = await Dormitory.countDocuments(query);

    console.log(`✅ Found ${dormitories.length} dormitories out of ${total} total`);
    if (university && dormitories.length > 0) {
      console.log('🎓 Dormitories found with universities:', dormitories.map(d => d.university.name));
    }

    res.json({
      success: true,
      count: dormitories.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: dormitories
    });
  } catch (error) {
    console.error('❌ DORMITORIES FETCH ERROR:', error);
    return next(new Error('Error fetching dormitories'));
  }
}));

// @desc    Get universities list for dropdown
// @route   GET /api/dormitories/universities
// @access  Public
router.get('/universities', asyncHandler(async (req, res) => {
  try {
    // Get predefined list plus any custom universities from database
    const customUniversities = await Dormitory.getUniversitiesList();
    const allUniversities = [...new Set([...NORTH_CYPRUS_UNIVERSITIES, ...customUniversities])];

    res.json({
      success: true,
      data: allUniversities.sort()
    });
  } catch (error) {
    console.error('❌ UNIVERSITIES FETCH ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching universities'
    });
  }
}));

// @desc    Get cities list for filtering
// @route   GET /api/dormitories/cities
// @access  Public
router.get('/cities', asyncHandler(async (req, res) => {
  try {
    const cities = await Dormitory.getCitiesList();
    const allCities = [...new Set([...NORTH_CYPRUS_CITIES, ...cities])];

    res.json({
      success: true,
      data: allCities.sort()
    });
  } catch (error) {
    console.error('❌ CITIES FETCH ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cities'
    });
  }
}));

// @desc    Get single dormitory
// @route   GET /api/dormitories/:id
// @access  Public
router.get('/:id', [
  optionalAuth
], asyncHandler(async (req, res, next) => {
  try {
    const dormitory = await Dormitory.findById(req.params.id)
      .populate('owner', 'firstName lastName phone email whatsapp');

    if (!dormitory) {
      return next(notFoundError('Dormitory not found'));
    }

    // Check if dormitory is public (approved and active) or if user is owner/admin
    const isPublic = dormitory.moderationStatus === 'approved' && dormitory.status === 'active';
    const isOwner = req.user && dormitory.owner._id.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isPublic && !isOwner && !isAdmin) {
      return next(authorizationError('Access denied'));
    }

    // Increment views if public access
    if (isPublic && (!req.user || !isOwner)) {
      await dormitory.incrementViews();
    }

    res.json({
      success: true,
      data: dormitory
    });
  } catch (error) {
    console.error('❌ DORMITORY FETCH ERROR:', error);
    return next(error);
  }
}));

// @desc    Create new dormitory (Admin only)
// @route   POST /api/dormitories
// @access  Private/Admin
router.post('/', [
  protect,
  adminOnly,
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('university.name').trim().isLength({ min: 2 }).withMessage('University name is required'),
  body('location.city').trim().isLength({ min: 2 }).withMessage('City is required'),
  body('location.address').trim().isLength({ min: 5 }).withMessage('Address is required'),
  body('availability').isIn(['available', 'running_out', 'unavailable']).withMessage('Invalid availability status'),
  body('image_urls').isArray({ min: 1, max: 10 }).withMessage('At least 1 and maximum 10 images required'),
  body('roomVariants').isArray({ min: 1 }).withMessage('At least one room variant is required'),
  body('contact.phone').trim().matches(/^\+?[\d\s-()]+$/).withMessage('Valid phone number is required'),
  body('genderRestriction').optional().isIn(['male', 'female', 'mixed']).withMessage('Invalid gender restriction')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  try {
    const dormitoryData = {
      ...req.body,
      owner: req.user._id,
      moderationStatus: 'approved' // Admin created, auto-approve
    };

    const dormitory = await Dormitory.create(dormitoryData);
    await dormitory.populate('owner', 'firstName lastName phone email');

    console.log('✅ DORMITORY CREATED:', dormitory._id);

    res.status(201).json({
      success: true,
      data: dormitory
    });
  } catch (error) {
    console.error('❌ DORMITORY CREATE ERROR:', error);
    return next(error);
  }
}));

// @desc    Update dormitory (Owner or Admin)
// @route   PUT /api/dormitories/:id
// @access  Private
router.put('/:id', [
  protect,
  ownerOrAdmin(Dormitory),
  // Same validation as POST
  body('title').optional().trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('university.name').optional().trim().isLength({ min: 2 }).withMessage('University name is required'),
  body('location.city').optional().trim().isLength({ min: 2 }).withMessage('City is required'),
  body('location.address').optional().trim().isLength({ min: 5 }).withMessage('Address is required'),
  body('availability').optional().isIn(['available', 'running_out', 'unavailable']).withMessage('Invalid availability status'),
  body('image_urls').optional().isArray({ min: 1, max: 10 }).withMessage('At least 1 and maximum 10 images required'),
  body('roomVariants').optional().isArray({ min: 1 }).withMessage('At least one room variant is required'),
  body('contact.phone').optional().trim().matches(/^\+?[\d\s-()]+$/).withMessage('Valid phone number is required'),
  body('genderRestriction').optional().isIn(['male', 'female', 'mixed']).withMessage('Invalid gender restriction')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  try {
    const dormitory = await Dormitory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName phone email');

    if (!dormitory) {
      return next(notFoundError('Dormitory not found'));
    }

    console.log('✅ DORMITORY UPDATED:', dormitory._id);

    res.json({
      success: true,
      data: dormitory
    });
  } catch (error) {
    console.error('❌ DORMITORY UPDATE ERROR:', error);
    return next(error);
  }
}));

// @desc    Delete dormitory (Owner or Admin)
// @route   DELETE /api/dormitories/:id
// @access  Private
router.delete('/:id', [
  protect,
  ownerOrAdmin(Dormitory)
], asyncHandler(async (req, res, next) => {
  try {
    const dormitory = await Dormitory.findById(req.params.id);

    if (!dormitory) {
      return next(notFoundError('Dormitory not found'));
    }

    await dormitory.deleteOne();

    console.log('✅ DORMITORY DELETED:', req.params.id);

    res.json({
      success: true,
      message: 'Dormitory deleted successfully'
    });
  } catch (error) {
    console.error('❌ DORMITORY DELETE ERROR:', error);
    return next(error);
  }
}));

// @desc    Send inquiry via WhatsApp
// @route   POST /api/dormitories/:id/inquire
// @access  Public
router.post('/:id/inquire', asyncHandler(async (req, res, next) => {
  try {
    const dormitory = await Dormitory.findById(req.params.id)
      .populate('owner', 'firstName lastName phone');

    if (!dormitory) {
      return next(notFoundError('Dormitory not found'));
    }

    if (dormitory.moderationStatus !== 'approved' || dormitory.status !== 'active') {
      return next(authorizationError('Dormitory is not available'));
    }

    // Increment inquiries count
    await dormitory.incrementInquiries();

    // Generate WhatsApp message
    const message = `Hello! I'm interested in the dormitory: ${dormitory.title}\n\nLocation: ${dormitory.location.address}, ${dormitory.location.city}\nUniversity: ${dormitory.university.name}\n\nCould you please provide more information?`;

    const whatsappPhone = dormitory.contact.whatsapp || dormitory.contact.phone || dormitory.owner.phone;
    const whatsappUrl = `https://wa.me/${whatsappPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;

    res.json({
      success: true,
      data: {
        whatsappUrl,
        message: 'WhatsApp inquiry link generated successfully'
      }
    });
  } catch (error) {
    console.error('❌ DORMITORY INQUIRY ERROR:', error);
    return next(error);
  }
}));

module.exports = router;