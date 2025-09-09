const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { asyncHandler, validationError } = require('../middleware/errorHandler');

const router = express.Router();

// Get current user's profile (mirrors /api/auth/me)
router.get('/me', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.status(200).json({ success: true, user });
}));

// Update current user's details (username, email, profile fields)
router.put('/me', [
  protect,
  body('username').optional().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('firstName').optional().isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
  body('lastName').optional().isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
  body('phone').optional().matches(/^\+?[\d\s-()]+$/).withMessage('Please enter a valid phone number'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  body('avatar').optional().isString(),
  body('preferences').optional().isObject().withMessage('Preferences must be an object'),
  body('preferences.language').optional().isIn(['en', 'tr', 'es', 'fr', 'gr']).withMessage('Language must be one of: en, tr, es, fr, gr'),
  body('preferences.timezone').optional().isString().withMessage('Timezone must be a string'),
  body('preferences.notifications').optional().isObject().withMessage('Notifications must be an object'),
  body('preferences.notifications.email').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('preferences.notifications.telegram').optional().isBoolean().withMessage('Telegram notifications must be boolean'),
  body('location').optional().isObject().withMessage('Location must be an object'),
  body('location.address').optional().isString(),
  body('location.city').optional().isString(),
  body('location.region').optional().isString(),
  body('location.country').optional().isString(),
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const user = await User.findById(req.user.id).select('+email +username');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const { username, email, firstName, lastName, phone, bio, avatar, preferences, location } = req.body || {};

  // If username is changing, ensure it's not taken
  if (typeof username === 'string' && username !== user.username) {
    const existingUsername = await User.findOne({ username, _id: { $ne: user._id } });
    if (existingUsername) {
      return next(validationError('Username is already taken'));
    }
    user.username = username;
  }

  // If email is changing, ensure it's not taken; also reset verification
  if (typeof email === 'string' && email !== user.email) {
    const existingEmail = await User.findOne({ email, _id: { $ne: user._id } });
    if (existingEmail) {
      return next(validationError('Email address is already registered'));
    }
    user.email = email;
    user.emailVerified = false;
  }

  if (typeof firstName !== 'undefined') user.firstName = firstName;
  if (typeof lastName !== 'undefined') user.lastName = lastName;
  if (typeof phone !== 'undefined') user.phone = phone;
  if (typeof bio !== 'undefined') user.bio = bio;
  if (typeof avatar !== 'undefined') user.avatar = avatar;

  if (preferences && typeof preferences === 'object') {
    user.preferences = {
      ...user.preferences,
      ...preferences,
      notifications: {
        ...user.preferences?.notifications,
        ...preferences.notifications,
      }
    };
  }

  if (location && typeof location === 'object') {
    user.location = {
      ...user.location,
      ...location,
    };
  }

  await user.save();

  const updated = await User.findById(user._id).select('-password');

  res.status(200).json({
    success: true,
    message: 'User details updated successfully',
    user: updated,
  });
}));

module.exports = router;
