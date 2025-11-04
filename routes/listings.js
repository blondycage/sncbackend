const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const Listing = require('../models/Listing');
const User = require('../models/User');
const { protect, optionalAuth, checkUploadQuota, ownerOrAdmin, createRateLimit } = require('../middleware/auth');
const { asyncHandler, validationError, notFoundError, authorizationError } = require('../middleware/errorHandler');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// Helper function to escape regex special characters
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Rate limiting disabled per request

// @desc    Get all listings with filtering and search
// @route   GET /api/listings
// @access  Public
router.get('/', [
  optionalAuth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('listingType').optional().isIn(['real_estate', 'vehicle', 'other', 'home_appliances']).withMessage('Invalid listing type'),
  query('category').optional().isIn(['rental', 'sale', 'service']).withMessage('Invalid category'),
  query('city').optional().isIn(['nicosia', 'kyrenia', 'famagusta', 'morphou', 'lefka', 'lapithos', 'bellapais', 'bogaz', 'catalkoy', 'esentepe', 'iskele', 'karaoglanoglu', 'kayalar', 'ozankoy', 'tatlisu', 'yenibogazici', 'zeytinlik', 'dipkarpaz', 'karpas', 'alsancak', 'lapta', 'lefke', 'other', 'Nicosia', 'Kyrenia', 'Famagusta', 'Morphou', 'Lefke', 'İskele', 'Alsancak', 'Lapta', 'Çatalköy', 'Esentepe', 'Boğaz', 'Dipkarpaz']).withMessage('Invalid city'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be non-negative'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be non-negative'),
  query('pricing_frequency').optional().isIn(['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'fixed', 'negotiable', 'free']).withMessage('Invalid pricing frequency'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search query must not be empty'),
  query('tags').optional().trim().isLength({ min: 1 }).withMessage('Tags filter must not be empty'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'price-low', 'price-high']).withMessage('Invalid sort option')
], asyncHandler(async (req, res, next) => {
  console.log('🔍 GET ALL LISTINGS - Request params:', req.query);

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const {
    page = 1,
    limit = 12,
    search,
    listingType,
    category,
    city,
    minPrice,
    maxPrice,
    pricing_frequency,
    tags,
    sortBy = 'newest'
  } = req.query;

  // Build query for all approved and active listings
  const query = {
    moderationStatus: 'approved',
    status: 'active',
    expiresAt: { $gt: new Date() }
  };

  // Apply filters
  if (listingType) {
    query.listingType = listingType;
  }

  if (category) {
    query.category = category;
  }

  // Apply location filter and search query properly
  if (city && search) {
    // When both city filter and search are present, combine them with $and
    const escapedSearch = escapeRegex(search);
    query.$and = [
      { 'location.city': { $regex: new RegExp(`^${city}$`, 'i') } },
      {
        $or: [
          // Core fields
          { title: { $regex: escapedSearch, $options: 'i' } },
          { description: { $regex: escapedSearch, $options: 'i' } },
          { tags: { $regex: escapedSearch, $options: 'i' } },

          // Type and category fields
          { listingType: { $regex: escapedSearch, $options: 'i' } },
          { category: { $regex: escapedSearch, $options: 'i' } },
          { pricing_frequency: { $regex: escapedSearch, $options: 'i' } },

          // Currency field
          { currency: { $regex: escapedSearch, $options: 'i' } },

          // Location fields (excluding city since it's filtered separately)
          { 'location.area': { $regex: escapedSearch, $options: 'i' } },
          { 'location.region': { $regex: escapedSearch, $options: 'i' } },
          { 'location.address': { $regex: escapedSearch, $options: 'i' } },

          // Contact information
          { 'contact.phone': { $regex: escapedSearch, $options: 'i' } },
          { 'contact.email': { $regex: escapedSearch, $options: 'i' } },
          { 'contact.preferredMethod': { $regex: escapedSearch, $options: 'i' } },

          // Video URL
          { video_url: { $regex: escapedSearch, $options: 'i' } },

          // Status fields (for admin searches)
          { status: { $regex: escapedSearch, $options: 'i' } },
          { moderationStatus: { $regex: escapedSearch, $options: 'i' } },
          { moderationNotes: { $regex: escapedSearch, $options: 'i' } }
        ]
      }
    ];
  } else if (city) {
    // Only city filter
    query['location.city'] = { $regex: new RegExp(`^${city}$`, 'i') };
  } else if (search) {
    // Only search query
    const escapedSearch = escapeRegex(search);
    query.$or = [
      // Core fields
      { title: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
      { tags: { $regex: escapedSearch, $options: 'i' } },

      // Type and category fields
      { listingType: { $regex: escapedSearch, $options: 'i' } },
      { category: { $regex: escapedSearch, $options: 'i' } },
      { pricing_frequency: { $regex: escapedSearch, $options: 'i' } },

      // Currency field
      { currency: { $regex: escapedSearch, $options: 'i' } },

      // Location fields
      { 'location.city': { $regex: escapedSearch, $options: 'i' } },
      { 'location.area': { $regex: escapedSearch, $options: 'i' } },
      { 'location.region': { $regex: escapedSearch, $options: 'i' } },
      { 'location.address': { $regex: escapedSearch, $options: 'i' } },

      // Contact information
      { 'contact.phone': { $regex: escapedSearch, $options: 'i' } },
      { 'contact.email': { $regex: escapedSearch, $options: 'i' } },
      { 'contact.preferredMethod': { $regex: escapedSearch, $options: 'i' } },

      // Video URL
      { video_url: { $regex: escapedSearch, $options: 'i' } },

      // Status fields (for admin searches)
      { status: { $regex: escapedSearch, $options: 'i' } },
      { moderationStatus: { $regex: escapedSearch, $options: 'i' } },
      { moderationNotes: { $regex: escapedSearch, $options: 'i' } }
    ];
  }

  if (tags) {
    // Filter by tags - support comma-separated tags
    const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
    query.tags = { $in: tagArray };
  }

  if (minPrice !== undefined) {
    query.price = { ...query.price, $gte: parseFloat(minPrice) };
  }

  if (maxPrice !== undefined) {
    query.price = { ...query.price, $lte: parseFloat(maxPrice) };
  }

  if (pricing_frequency) {
    query.pricing_frequency = pricing_frequency;
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
    case 'price-low':
      sortOptions = { price: 1 };
      break;
    case 'price-high':
      sortOptions = { price: -1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }

  console.log('🔍 Sort options:', sortOptions);

  // Execute query with pagination
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: sortOptions,
    populate: {
      path: 'owner',
      select: 'username firstName lastName'
    },
    lean: true
  };

  console.log('🔍 Pagination options:', options);

  try {
    const result = await Listing.paginate(query, options);
    console.log('✅ Query successful, found', result.totalDocs, 'listings');

    // Format response data
    const formattedListings = result.docs.map(listing => ({
      id: listing._id,
      title: listing.title,
      description: listing.description,
      listingType: listing.listingType || 'other',
      category: listing.category,
      tags: listing.tags || [],
      price: listing.price,
      pricing_frequency: listing.pricing_frequency,
      currency: listing.currency || 'USD',
      status: listing.status || 'active',
      image_urls: listing.image_urls,
      created_at: listing.createdAt,
      owner: listing.owner,
      location: listing.location || {},
      views: listing.views,
      is_paid: listing.is_paid,
      primaryImage: listing.image_urls && listing.image_urls.length > 0 ? listing.image_urls[0] : null
    }));

    res.status(200).json({
      success: true,
      data: formattedListings,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        limit: result.limit
      },
      filters: {
        listingType,
        category,
        city,
        minPrice,
        maxPrice,
        pricing_frequency,
        search,
        tags,
        sortBy
      }
    });
  } catch (error) {
    console.error('❌ Error fetching listings:', error);
    return next(error);
  }
}));

// @desc    Create a free listing
// @route   POST /api/listings/free
// @access  Private
router.post('/free', [
  protect,
  // rate limit removed
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('listingType')
    .isIn(['real_estate', 'vehicle', 'other', 'home_appliances'])
    .withMessage('Listing type must be one of: real_estate, vehicle, other, home_appliances'),
  body('category')
    .isIn(['rental', 'sale', 'service'])
    .withMessage('Category must be one of: rental, sale, service'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters')
    .matches(/^[a-zA-Z0-9\s\-]+$/)
    .withMessage('Tags can only contain letters, numbers, spaces, and hyphens'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('pricing_frequency')
    .isIn(['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'fixed', 'negotiable', 'free'])
    .withMessage('Pricing frequency must be one of: hourly, daily, weekly, monthly, yearly, fixed, negotiable, free'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'TRY'])
    .withMessage('Currency must be one of: USD, EUR, GBP, TRY'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'sold', 'rented', 'unavailable', 'available_soon'])
    .withMessage('Status must be one of: active, inactive, sold, rented, unavailable, available_soon'),
  body('image_urls')
    .isArray({ min: 1 })
    .withMessage('At least one image URL is required'),
  body('image_urls.*')
    .isURL()
    .withMessage('Each image URL must be a valid URL'),
  body('image_urls')
    .custom((arr) => Array.isArray(arr) && arr.length <= 10)
    .withMessage('Maximum 10 images are allowed per listing'),
  body('video_url')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Video URL must be a valid URL'),
  body('contact')
    .optional()
    .isObject()
    .withMessage('Contact must be an object'),
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object')
], asyncHandler(async (req, res, next) => {
  console.log('🚀 LISTING CREATION STARTED');
  console.log('📥 RECEIVED PAYLOAD:', JSON.stringify(req.body, null, 2));

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ EXPRESS VALIDATION ERRORS:', errors.array());
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const {
    title,
    description,
    listingType,
    category,
    tags = [],
    price,
    pricing_frequency,
    currency = 'USD',
    status = 'active',
    image_urls,
    video_url,
    contact = {},
    location = {}
  } = req.body;

  console.log('🔍 EXTRACTED DATA:', {
    title,
    titleLength: title ? title.length : 0,
    description: description ? description.substring(0, 50) + '...' : description,
    descriptionLength: description ? description.length : 0,
    listingType,
    category,
    tags,
    tagsCount: tags ? tags.length : 0,
    price,
    priceType: typeof price,
    pricing_frequency,
    image_urls,
    imageUrlsCount: image_urls ? image_urls.length : 0,
    contact,
    location,
    owner: req.user._id
  });

  // Additional validation for pricing frequency based on category
  const validFrequencies = {
    'rental': ['daily', 'weekly', 'monthly', 'yearly', 'negotiable'],
    'service': ['hourly', 'daily', 'fixed', 'negotiable', 'free', 'yearly'],
    'sale': ['fixed', 'negotiable', 'free']
  };

  if (!validFrequencies[category].includes(pricing_frequency)) {
    console.log('❌ PRICING FREQUENCY VALIDATION FAILED:', {
      category,
      pricing_frequency,
      validOptions: validFrequencies[category]
    });
    return next(validationError(`Invalid pricing frequency '${pricing_frequency}' for category '${category}'. Valid options are: ${validFrequencies[category].join(', ')}`));
  }

  console.log('✅ PRICING FREQUENCY VALIDATION PASSED');

  // Check upload quota before creating listing
  console.log('🔍 CHECKING UPLOAD QUOTA...');
  const user = await req.user.constructor.findById(req.user._id);
  if (!user.canUpload) {
    console.log('❌ UPLOAD QUOTA EXCEEDED:', {
      freeUploadsUsed: user.uploadQuota.freeUploadsUsed,
      freeUploadsLimit: user.uploadQuota.freeUploadsLimit,
      paidUploadsRemaining: user.uploadQuota.paidUploadsRemaining
    });
    return next(validationError('Upload quota exceeded. You cannot create more listings at this time.'));
  }
  console.log('✅ UPLOAD QUOTA CHECK PASSED');

  try {
    console.log('🔨 CREATING LISTING DOCUMENT...');
    
    // Process tags - ensure they're lowercase and trimmed
    const processedTags = tags && Array.isArray(tags) 
      ? tags.map(tag => tag.toString().trim().toLowerCase()).filter(tag => tag.length > 0)
      : [];

    // Create the listing document
    const listingData = {
      title: title.trim(),
      description: description.trim(),
      listingType,
      category,
      tags: processedTags,
      price: Number(price),
      pricing_frequency,
      currency: currency.toUpperCase(),
      status,
      image_urls,
      ...(video_url ? { video_url } : {}),
      owner: req.user._id,
      is_paid: false,
      contact: contact || {},
      location: location || {}
    };

    console.log('📋 FINAL LISTING DATA:', JSON.stringify(listingData, null, 2));

    const listing = new Listing(listingData);
    console.log('🔍 LISTING DOCUMENT CREATED, VALIDATING...');
    
    await listing.save();
    console.log('✅ LISTING SAVED SUCCESSFULLY');

    // Consume upload quota (free listing)
    try {
      await user.consumeUpload(false); // false = free upload
      console.log('✅ UPLOAD QUOTA CONSUMED');
    } catch (quotaError) {
      console.log('⚠️ UPLOAD QUOTA CONSUMPTION FAILED:', quotaError.message);
      // Note: Listing was already created, but quota wasn't consumed
      // This could indicate a race condition or database issue
    }

    // Populate owner information
    await listing.populate('owner', 'username firstName lastName email');

    console.log('🎉 LISTING CREATION COMPLETED:', {
      id: listing._id,
      title: listing.title,
      category: listing.category
    });

    res.status(201).json({
      success: true,
      data: listing,
      message: 'Listing created successfully'
    });

  } catch (error) {
    console.log('❌ LISTING CREATION ERROR:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // If it's a validation error from the model
    if (error.name === 'ValidationError') {
      console.log('❌ MONGOOSE VALIDATION ERROR:', error.errors);
      const messages = Object.values(error.errors).map(err => err.message);
      return next(validationError(messages.join(', ')));
    }
    
    // For any other error
    console.log('❌ UNEXPECTED ERROR:', error);
    return next(error);
  }
}));

// @desc    Get all free listings
// @route   GET /api/listings/free
// @access  Public
router.get('/free', [
  optionalAuth,
  query('category')
    .optional()
    .isIn(['rental', 'sale', 'service'])
    .withMessage('Category must be one of: rental, sale, service'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be non-negative'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be non-negative'),
  query('pricing_frequency')
    .optional()
    .isIn(['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'fixed', 'negotiable', 'free'])
    .withMessage('Pricing frequency must be one of: hourly, daily, weekly, monthly, yearly, fixed, negotiable, free'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query must not be empty')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const {
    category,
    page = 1,
    limit = 12,
    minPrice,
    maxPrice,
    pricing_frequency,
    search,
    sortBy = 'newest'
  } = req.query;

  // Build query for free listings only
  const query = {
    is_paid: false,
    moderationStatus: 'approved',
    status: 'active',
    expiresAt: { $gt: new Date() }
  };

  // Apply filters
  if (category) {
    query.category = category;
  }

  if (search) {
    // Comprehensive search across ALL relevant listing fields
    const escapedSearch = escapeRegex(search);
    query.$or = [
      // Core fields
      { title: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
      { tags: { $regex: escapedSearch, $options: 'i' } },

      // Type and category fields
      { listingType: { $regex: escapedSearch, $options: 'i' } },
      { category: { $regex: escapedSearch, $options: 'i' } },
      { pricing_frequency: { $regex: escapedSearch, $options: 'i' } },

      // Currency field
      { currency: { $regex: escapedSearch, $options: 'i' } },

      // Location fields
      { 'location.city': { $regex: escapedSearch, $options: 'i' } },
      { 'location.area': { $regex: escapedSearch, $options: 'i' } },
      { 'location.region': { $regex: escapedSearch, $options: 'i' } },
      { 'location.address': { $regex: escapedSearch, $options: 'i' } },

      // Contact information
      { 'contact.phone': { $regex: escapedSearch, $options: 'i' } },
      { 'contact.email': { $regex: escapedSearch, $options: 'i' } },
      { 'contact.preferredMethod': { $regex: escapedSearch, $options: 'i' } },

      // Video URL
      { video_url: { $regex: escapedSearch, $options: 'i' } },

      // Status fields (for admin searches)
      { status: { $regex: escapedSearch, $options: 'i' } },
      { moderationStatus: { $regex: escapedSearch, $options: 'i' } },
      { moderationNotes: { $regex: escapedSearch, $options: 'i' } }
    ];
  }

  if (minPrice !== undefined) {
    query.price = { ...query.price, $gte: parseFloat(minPrice) };
  }

  if (maxPrice !== undefined) {
    query.price = { ...query.price, $lte: parseFloat(maxPrice) };
  }

  if (pricing_frequency) {
    query.pricing_frequency = pricing_frequency;
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
    case 'price-low':
      sortOptions = { price: 1 };
      break;
    case 'price-high':
      sortOptions = { price: -1 };
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
        path: 'owner',
      select: 'username firstName lastName'
    },
    lean: true
  };

  const result = await Listing.paginate(query, options);

  // Format response data
  const formattedListings = result.docs.map(listing => ({
    id: listing._id,
    title: listing.title,
    description: listing.description,
    listingType: listing.listingType || 'other',
    category: listing.category,
    tags: listing.tags || [],
    price: listing.price,
    pricing_frequency: listing.pricing_frequency,
    currency: listing.currency || 'USD',
    status: listing.status || 'active',
    image_urls: listing.image_urls,
    created_at: listing.createdAt,
    owner: listing.owner,
    views: listing.views,
    primaryImage: listing.image_urls && listing.image_urls.length > 0 ? listing.image_urls[0] : null
  }));

  res.status(200).json({
    success: true,
    data: formattedListings,
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalItems: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      limit: result.limit
    },
    filters: {
      category,
      minPrice,
      maxPrice,
      pricing_frequency,
      search,
      sortBy
    }
  });
}));

// @desc    Get user's favorite listings
// @route   GET /api/listings/favorites
// @access  Private
router.get('/favorites', protect, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  // Get user with populated favorites
  const user = await User.findById(req.user._id)
    .populate({
      path: 'favorites.listing',
      match: { 
        moderationStatus: 'approved',
        status: 'active',
        expiresAt: { $gt: new Date() }
      },
      populate: {
        path: 'owner',
        select: 'username firstName lastName avatar role'
      }
    });

  if (!user) {
    return next(notFoundError('User not found'));
  }

  // Filter out null listings (deleted or unapproved)
  const validFavorites = user.favorites.filter(fav => fav.listing);

  // Sort by addedAt descending
  validFavorites.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

  // Calculate pagination
  const totalItems = validFavorites.length;
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = parseInt(page);
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  
  const paginatedFavorites = validFavorites.slice(startIndex, endIndex);

  // Format response data
  const formattedListings = paginatedFavorites.map(fav => {
    const listing = fav.listing;
    return {
      id: listing._id,
      title: listing.title,
      description: listing.description,
      listingType: listing.listingType || 'other',
      category: listing.category,
      tags: listing.tags || [],
      price: listing.price,
      pricing_frequency: listing.pricing_frequency,
      currency: listing.currency || 'USD',
      status: listing.status || 'active',
      image_urls: listing.image_urls,
      created_at: listing.createdAt,
      owner: listing.owner,
      views: listing.views,
      is_paid: listing.is_paid,
      primaryImage: listing.image_urls && listing.image_urls.length > 0 ? listing.image_urls[0] : null,
      favorited_at: fav.addedAt
    };
  });

  res.status(200).json({
    success: true,
    data: formattedListings,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      limit: parseInt(limit)
    }
  });
}));

// @desc    Get single listing
// @route   GET /api/listings/:id
// @access  Public
router.get('/:id', [
  optionalAuth
], asyncHandler(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id)
    .populate('owner', 'username firstName lastName avatar role phone email')
   // .populate('favorites.user', 'username')
   // .populate('inquiries.user', 'username firstName lastName');

  if (!listing) {
    return next(notFoundError('Listing not found'));
  }

  // Check if listing is accessible
  if (listing.moderationStatus !== 'approved' && (!req.user || (req.user._id.toString() !== listing.owner._id.toString() && !req.user.isAdmin))) {
    return next(notFoundError('Listing not found'));
  }

  // Increment view count (only for non-owners)
  if (!req.user || req.user._id.toString() !== listing.owner._id.toString()) {
    await listing.incrementViews();
  }

  // Add user-specific data if authenticated
  let listingData = listing.toObject();
  
  // Add fallback values for fields that might not exist in older listings
  listingData.listingType = listingData.listingType || 'other';
  listingData.tags = listingData.tags || [];
  listingData.currency = listingData.currency || 'USD';
  listingData.status = listingData.status || 'active';
  
  if (req.user) {
    // Check if listing is favorited by current user
    const user = await User.findById(req.user._id);
    listingData.isFavorited = user.isFavorited(listing._id);
    listingData.isOwner = listing.owner._id.toString() === req.user._id.toString();
  }

  res.status(200).json({
    success: true,
    data: listingData
  });
}));

// @desc    Update listing (owner only)
// @route   PUT /api/listings/:id
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
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .optional()
    .isIn(['rental', 'sale', 'service'])
    .withMessage('Category must be one of: rental, sale, service'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('pricing_frequency')
    .optional()
    .isIn(['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'fixed', 'negotiable', 'free'])
    .withMessage('Pricing frequency must be one of: hourly, daily, weekly, monthly, yearly, fixed, negotiable, free'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'TRY'])
    .withMessage('Currency must be one of: USD, EUR, GBP, TRY'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'sold', 'rented', 'unavailable', 'available_soon'])
    .withMessage('Status must be one of: active, inactive, sold, rented, unavailable, available_soon')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    return next(notFoundError('Listing not found'));
  }

  // Check if user is the owner
  if (listing.owner.toString() !== req.user._id.toString()) {
    return next(new Error('Not authorized to update this listing'));
  }

  // Update fields
  const updateFields = {};
  const allowedFields = ['title', 'description', 'category', 'price', 'pricing_frequency', 'currency', 'status', 'contact', 'location'];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateFields[field] = req.body[field];
    }
  });

  // Ensure currency is uppercase if provided
  if (updateFields.currency) {
    updateFields.currency = updateFields.currency.toUpperCase();
  }

  // Validate pricing frequency if both category and pricing_frequency are being updated
  if (updateFields.category || updateFields.pricing_frequency) {
    const category = updateFields.category || listing.category;
    const pricing_frequency = updateFields.pricing_frequency || listing.pricing_frequency;
    
    const validFrequencies = {
      'rental': ['daily', 'weekly', 'monthly', 'yearly', 'negotiable'],
      'service': ['hourly', 'daily', 'fixed', 'negotiable', 'free', 'yearly'],
      'sale': ['fixed', 'negotiable', 'free']
    };

    if (!validFrequencies[category].includes(pricing_frequency)) {
      return next(validationError(`Invalid pricing frequency '${pricing_frequency}' for category '${category}'`));
    }
  }

  const updatedListing = await Listing.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  ).populate('owner', 'username firstName lastName');

  res.status(200).json({
    success: true,
    data: updatedListing,
    message: 'Listing updated successfully'
  });
}));

// @desc    Delete listing (owner only)
// @route   DELETE /api/listings/:id
// @access  Private
router.delete('/:id', [
  protect
], asyncHandler(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    return next(notFoundError('Listing not found'));
  }

  // Check if user is the owner
  if (listing.owner.toString() !== req.user._id.toString()) {
    return next(new Error('Not authorized to delete this listing'));
  }

  // Delete images from Cloudinary (if they are Cloudinary URLs)
  if (listing.image_urls && listing.image_urls.length > 0) {
    const deletePromises = listing.image_urls.map(async (url) => {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = url.split('/').pop().split('.')[0];
        if (url.includes('cloudinary.com')) {
          await deleteFromCloudinary(publicId);
        }
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        // Continue with deletion even if image deletion fails
      }
    });

    await Promise.allSettled(deletePromises);
  }

  await Listing.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Listing deleted successfully'
  });
}));

// @desc    Get user's listings
// @route   GET /api/listings/user/me
// @access  Private
router.get('/user/me', [
  protect,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 12 } = req.query;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    lean: true
  };

  const result = await Listing.paginate(
    { owner: req.user._id },
    options
  );

  // Format response data to ensure consistency and backward compatibility
  const formattedListings = result.docs.map(listing => ({
    id: listing._id,
    title: listing.title,
    description: listing.description,
    listingType: listing.listingType || 'other',
    category: listing.category,
    tags: listing.tags || [],
    price: listing.price,
    pricing_frequency: listing.pricing_frequency,
    currency: listing.currency || 'USD',
    status: listing.status || 'active',
    image_urls: listing.image_urls,
    created_at: listing.createdAt,
    updated_at: listing.updatedAt,
    moderationStatus: listing.moderationStatus,
    views: listing.views,
    is_paid: listing.is_paid,
    primaryImage: listing.image_urls && listing.image_urls.length > 0 ? listing.image_urls[0] : null
  }));

  res.status(200).json({
    success: true,
    data: formattedListings,
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

// @desc    Add listing to favorites
// @route   POST /api/listings/:id/favorite
// @access  Private
router.post('/:id/favorite', protect, asyncHandler(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    return next(notFoundError('Listing not found'));
  }

  if (listing.moderationStatus !== 'approved') {
    return next(validationError('Cannot favorite unapproved listing'));
  }

  if (listing.owner.toString() === req.user._id.toString()) {
    return next(validationError('Cannot favorite your own listing'));
  }

  const user = await User.findById(req.user._id);
  await user.addToFavorites(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Listing added to favorites'
  });
}));

// @desc    Remove listing from favorites
// @route   DELETE /api/listings/:id/favorite
// @access  Private
router.delete('/:id/favorite', protect, asyncHandler(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    return next(notFoundError('Listing not found'));
  }

  const user = await User.findById(req.user._id);
  await user.removeFromFavorites(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Listing removed from favorites'
  });
}));

// @desc    Add inquiry to listing
// @route   POST /api/listings/:id/inquire
// @access  Private
router.post('/:id/inquire', [
  protect,
  // rate limit removed
  body('message').trim().isLength({ min: 10, max: 500 }).withMessage('Message must be between 10 and 500 characters')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    return next(notFoundError('Listing not found'));
  }

  if (listing.owner.toString() === req.user._id.toString()) {
    return next(validationError('Cannot inquire about your own listing'));
  }

  if (listing.moderationStatus !== 'approved') {
    return next(validationError('Cannot inquire about unapproved listing'));
  }

  await listing.addInquiry(req.user._id, req.body.message);

  res.status(200).json({
    success: true,
    message: 'Inquiry sent successfully'
  });
}));

// @desc    Report listing
// @route   POST /api/listings/:id/report
// @access  Private
router.post('/:id/report', [
  protect,
  // rate limit removed
  body('reason').isIn(['inappropriate', 'spam', 'scam', 'duplicate', 'other']).withMessage('Invalid reason'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    return next(notFoundError('Listing not found'));
  }

  // Check if user already reported this listing
  const existingReport = listing.reports.find(report => 
    report.reportedBy.toString() === req.user._id.toString()
  );

  if (existingReport) {
    return next(validationError('You have already reported this listing'));
  }

  listing.reports.push({
    reportedBy: req.user._id,
    reason: req.body.reason,
    description: req.body.description
  });

  // Update the isReported flag
  listing.isReported = true;

  await listing.save();

  res.status(200).json({
    success: true,
    message: 'Listing reported successfully'
  });
}));

module.exports = router; 