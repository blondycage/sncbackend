const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const Subscriber = require('../models/Subscriber');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, validationError, notFoundError } = require('../middleware/errorHandler');

// @desc    Subscribe to newsletter
// @route   POST /api/subscribers/subscribe
// @access  Public
router.post('/subscribe', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('source')
    .optional()
    .isIn(['homepage', 'search_page', 'listing_page', 'manual'])
    .withMessage('Invalid source'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(e => e.msg).join(', ')));
  }

  const { email, source = 'homepage', preferences = {} } = req.body;

  try {
    // Check if subscriber already exists
    const existingSubscriber = await Subscriber.findOne({ email });

    if (existingSubscriber) {
      if (existingSubscriber.status === 'active') {
        return res.status(200).json({
          success: true,
          message: 'You are already subscribed to our newsletter!',
          data: { subscriber: existingSubscriber }
        });
      } else if (existingSubscriber.status === 'unsubscribed') {
        // Resubscribe
        await existingSubscriber.resubscribe();
        return res.status(200).json({
          success: true,
          message: 'Welcome back! You have been resubscribed to our newsletter.',
          data: { subscriber: existingSubscriber }
        });
      }
    }

    // Collect metadata
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.get('Referrer')
    };

    // Create new subscriber
    const subscriber = await Subscriber.create({
      email,
      source,
      metadata,
      preferences: {
        newsletter: true,
        updates: true,
        promotions: false,
        ...preferences
      }
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for subscribing! You will receive updates about our latest features and listings.',
      data: { subscriber }
    });

  } catch (error) {
    console.error('Subscription error:', error);
    
    if (error.code === 11000) {
      // Duplicate email error
      return res.status(400).json({
        success: false,
        message: 'This email is already subscribed'
      });
    }

    return next(error);
  }
}));

// @desc    Unsubscribe from newsletter
// @route   POST /api/subscribers/unsubscribe
// @access  Public
router.post('/unsubscribe', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(e => e.msg).join(', ')));
  }

  const { email, reason = 'user_request' } = req.body;

  const subscriber = await Subscriber.findOne({ email });
  if (!subscriber) {
    return next(notFoundError('Email not found in our subscription list'));
  }

  if (subscriber.status === 'unsubscribed') {
    return res.status(200).json({
      success: true,
      message: 'You are already unsubscribed from our newsletter'
    });
  }

  await subscriber.unsubscribe(reason);

  res.json({
    success: true,
    message: 'You have been successfully unsubscribed from our newsletter'
  });
}));

// @desc    Get subscription status
// @route   GET /api/subscribers/status/:email
// @access  Public
router.get('/status/:email', asyncHandler(async (req, res, next) => {
  const { email } = req.params;

  if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    return next(validationError('Please provide a valid email address'));
  }

  const subscriber = await Subscriber.findOne({ 
    email: email.toLowerCase().trim() 
  }).select('email status subscribedAt preferences');

  if (!subscriber) {
    return res.json({
      success: true,
      data: {
        subscribed: false,
        status: 'not_found'
      }
    });
  }

  res.json({
    success: true,
    data: {
      subscribed: subscriber.status === 'active',
      status: subscriber.status,
      subscribedAt: subscriber.subscribedAt,
      preferences: subscriber.preferences
    }
  });
}));

// Admin routes
// @desc    Get all subscribers
// @route   GET /api/subscribers/admin/subscribers
// @access  Admin
router.get('/admin/subscribers', [
  protect, 
  adminOnly,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['active', 'unsubscribed', 'bounced', 'all']),
  query('search').optional().isString(),
  query('source').optional().isString()
], asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const status = req.query.status || 'all';
  const search = req.query.search || '';
  const source = req.query.source;

  const skip = (page - 1) * limit;

  // Build query
  const query = {};
  
  if (status !== 'all') {
    query.status = status;
  }
  
  if (search) {
    query.email = { $regex: search, $options: 'i' };
  }
  
  if (source) {
    query.source = source;
  }

  const [subscribers, total, stats] = await Promise.all([
    Subscriber.find(query)
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(limit),
    Subscriber.countDocuments(query),
    Subscriber.getStats()
  ]);

  res.json({
    success: true,
    data: {
      subscribers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats
    }
  });
}));

// @desc    Get subscriber statistics
// @route   GET /api/subscribers/admin/stats
// @access  Admin
router.get('/admin/stats', [protect, adminOnly], asyncHandler(async (req, res) => {
  const stats = await Subscriber.getStats();
  const recentSubscribers = await Subscriber.getRecent(5);

  // Get growth data for the last 12 months
  const growthData = await Subscriber.aggregate([
    {
      $match: {
        subscribedAt: {
          $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$subscribedAt' },
          month: { $month: '$subscribedAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  res.json({
    success: true,
    data: {
      stats,
      recentSubscribers,
      growthData
    }
  });
}));

// @desc    Update subscriber status (Admin)
// @route   PUT /api/subscribers/admin/:id/status
// @access  Admin
router.put('/admin/:id/status', [
  protect,
  adminOnly,
  body('status').isIn(['active', 'unsubscribed', 'bounced']),
  body('reason').optional().isString()
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(e => e.msg).join(', ')));
  }

  const { status, reason } = req.body;
  const subscriber = await Subscriber.findById(req.params.id);

  if (!subscriber) {
    return next(notFoundError('Subscriber not found'));
  }

  if (status === 'unsubscribed') {
    await subscriber.unsubscribe(reason || 'admin_action');
  } else if (status === 'active' && subscriber.status === 'unsubscribed') {
    await subscriber.resubscribe();
  } else {
    subscriber.status = status;
    await subscriber.save();
  }

  res.json({
    success: true,
    message: `Subscriber status updated to ${status}`,
    data: { subscriber }
  });
}));

// @desc    Delete subscriber (Admin)
// @route   DELETE /api/subscribers/admin/:id
// @access  Admin
router.delete('/admin/:id', [protect, adminOnly], asyncHandler(async (req, res, next) => {
  const subscriber = await Subscriber.findById(req.params.id);

  if (!subscriber) {
    return next(notFoundError('Subscriber not found'));
  }

  await subscriber.deleteOne();

  res.json({
    success: true,
    message: 'Subscriber deleted successfully'
  });
}));

// @desc    Export subscribers (Admin)
// @route   GET /api/subscribers/admin/export
// @access  Admin
router.get('/admin/export', [
  protect, 
  adminOnly,
  query('status').optional().isIn(['active', 'unsubscribed', 'bounced', 'all']),
  query('format').optional().isIn(['json', 'csv'])
], asyncHandler(async (req, res) => {
  const status = req.query.status || 'active';
  const format = req.query.format || 'json';

  const query = status === 'all' ? {} : { status };
  const subscribers = await Subscriber.find(query)
    .select('email status subscribedAt source preferences')
    .sort({ subscribedAt: -1 });

  if (format === 'csv') {
    const csvHeader = 'Email,Status,Subscribed At,Source,Newsletter,Updates,Promotions\n';
    const csvRows = subscribers.map(sub => 
      `${sub.email},${sub.status},${sub.subscribedAt.toISOString()},${sub.source},${sub.preferences.newsletter},${sub.preferences.updates},${sub.preferences.promotions}`
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=subscribers-${Date.now()}.csv`);
    res.send(csvHeader + csvRows);
  } else {
    res.json({
      success: true,
      data: { subscribers, total: subscribers.length }
    });
  }
}));

module.exports = router;