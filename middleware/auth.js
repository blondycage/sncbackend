const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

// Protect routes middleware
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Check for token in cookies
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Admin access middleware
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Role-based access middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (error) {
      req.user = null;
    }
  }

  next();
};

// Upload quota check middleware
const checkUploadQuota = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    // Check if user can upload
    if (!req.user.canUpload) {
      return res.status(403).json({
        success: false,
        message: 'Upload quota exceeded. Please upgrade your plan or wait for next month.',
        quota: {
          freeUploadsUsed: req.user.uploadQuota.freeUploadsUsed,
          freeUploadsLimit: req.user.uploadQuota.freeUploadsLimit,
          paidUploadsRemaining: req.user.uploadQuota.paidUploadsRemaining
        }
      });
    }

    // Free users have a limit of 3 uploads per day
    if (req.user.role === 'user') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const Listing = require('../models/Listing');
      const uploadsToday = await Listing.countDocuments({
        owner: req.user._id,
        createdAt: { $gte: today }
      });

      if (uploadsToday >= 3) {
        return res.status(403).json({
          success: false,
          message: 'Daily upload quota exceeded. Please upgrade to post more listings.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Upload quota check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking upload quota'
    });
  }
};

// Owner or admin middleware (for listing management)
const ownerOrAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const listingId = req.params.id || req.params.listingId;
    
    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: 'Listing ID required'
      });
    }

    const Listing = require('../models/Listing');
    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Check if user is owner or admin
    if (listing.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this listing'
      });
    }

    // Add listing to request for use in route handler
    req.listing = listing;
    next();
  } catch (error) {
    console.error('Owner or admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking listing ownership'
    });
  }
};

// Rate limiting for specific endpoints
const createRateLimit = (maxRequests, windowMs, message) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + (req.user ? req.user._id : '');
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old attempts
    if (attempts.has(key)) {
      const userAttempts = attempts.get(key).filter(time => time > windowStart);
      attempts.set(key, userAttempts);
    }

    const currentAttempts = attempts.get(key) || [];

    if (currentAttempts.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later',
        retryAfter: Math.ceil((currentAttempts[0] + windowMs - now) / 1000)
      });
    }

    // Add current attempt
    currentAttempts.push(now);
    attempts.set(key, currentAttempts);

    next();
  };
};

// Telegram authentication middleware
const telegramAuth = async (req, res, next) => {
  const { telegramData } = req.body;

  if (!telegramData) {
    return res.status(400).json({
      success: false,
      message: 'Telegram authentication data required'
    });
  }

  try {
    // Verify Telegram authentication data
    const { id, username, first_name, last_name, auth_date, hash } = telegramData;

    if (!id || !auth_date || !hash) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Telegram authentication parameters'
      });
    }

    // For production, you should implement proper hash verification
    // This is a simplified version - implement according to Telegram Bot API docs
    // const botToken = process.env.TELEGRAM_BOT_TOKEN;
    // if (!botToken) {
    //   return res.status(500).json({
    //     success: false,
    //     message: 'Telegram bot token not configured'
    //   });
    // }

    // Create verification string (simplified for now)
    // In production, implement proper hash verification as per Telegram docs
    
    req.telegramUser = {
      telegramId: id.toString(),
      telegramUsername: username,
      firstName: first_name,
      lastName: last_name
    };

    next();
  } catch (error) {
    console.error('Telegram auth error:', error);
    return res.status(400).json({
      success: false,
      message: 'Invalid Telegram authentication data'
    });
  }
};

module.exports = {
  protect,
  adminOnly,
  authorize,
  optionalAuth,
  checkUploadQuota,
  ownerOrAdmin,
  createRateLimit,
  telegramAuth
}; 