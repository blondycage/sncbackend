const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const User = require('../models/User');
const { protect, telegramAuth, createRateLimit } = require('../middleware/auth');
const { asyncHandler, validationError, authenticationError } = require('../middleware/errorHandler');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');

// Rate limiting disabled per request

// Store for pending authentications (in production, use Redis or database)
const pendingAuth = new Map();

// Helper function to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Remove password from output
  user.password = undefined;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        preferences: user.preferences,
        uploadQuota: {
          freeUploadsUsed: user.uploadQuota.freeUploadsUsed,
          freeUploadsLimit: user.uploadQuota.freeUploadsLimit,
          paidUploadsRemaining: user.uploadQuota.paidUploadsRemaining,
          canUpload: user.canUpload
        }
      }
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  // Remove authRateLimit for registration
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['Student', 'Local', 'Foreigner', 'Worker', 'Business Owner', 'Agent', 'Owner', 'Local Resident', 'Real Estate Agent', 'Property Owner', 'user', 'advertiser', 'admin'])
    .withMessage('Please select a valid role'),
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please enter a valid phone number')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const { username, email, password, role, firstName, lastName, phone, language } = req.body;

  // Map frontend role values to backend role values
  const roleMapping = {
    'Student': 'user',
    'Local': 'user', 
    'Local Resident': 'user',
    'Foreigner': 'user',
    'Worker': 'user',
    'Business Owner': 'advertiser',
    'Agent': 'advertiser',
    'Owner': 'advertiser',
    'Real Estate Agent': 'advertiser',
    'Property Owner': 'advertiser',
    'user': 'user',
    'advertiser': 'advertiser', 
    'admin': 'admin'
  };
  
  const mappedRole = roleMapping[role] || 'user';

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    if (existingUser.email === email) {
      return next(validationError('Email address is already registered'));
    }
    if (existingUser.username === username) {
      return next(validationError('Username is already taken'));
    }
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    role: mappedRole,
    firstName,
    lastName,
    phone,
    preferences: {
      language: language || 'en'
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Send welcome email
  try {
    await sendWelcomeEmail(user);
    console.log('Welcome email sent successfully to:', user.email);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't fail registration if email fails
  }

  sendTokenResponse(user, 201, res, 'User registered successfully');
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  // Remove authRateLimit for login
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], asyncHandler(async (req, res, next) => {
  const { identifier, email, password } = req.body;
  console.log('🔍 LOGIN REQUEST:', { identifier, email, password });
  // Use identifier if provided, otherwise use email
  const loginIdentifier = identifier || email;
  
  if (!loginIdentifier) {
    return next(validationError('Email or username is required'));
  }
  
  if (!password) {
    return next(validationError('Password is required'));
  }

  // Check for user
  const user = await User.findByEmailOrUsername(loginIdentifier).select('+password');

  if (!user) {
    console.log('🔍 USER NOT FOUND');
    return next(authenticationError('Invalid credentials'));
  }

  // Check password
  console.log('🔍 CHECKING PASSWORD:', {
    providedPassword: password,
    hashedPassword: user.password,
    matchResult: await user.matchPassword(password)
  });
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    console.log('🔍 INVALID CREDENTIALS2');
    return next(authenticationError('Invalid credentials'));
  }

  // Update last login
  user.lastLogin = new Date();
  user.ipAddress = req.ip;
  user.userAgent = req.get('User-Agent');
  await user.save();

  sendTokenResponse(user, 200, res, 'Login successful');
}));

// @desc    Login with Telegram
// @route   POST /api/auth/telegram
// @access  Public
router.post('/telegram', async (req, res) => {
  try {
    const { 
      id, 
      first_name, 
      last_name, 
      username, 
      photo_url, 
      auth_date, 
      hash 
    } = req.body;

    // Validate required fields
    if (!id || !first_name || !auth_date || !hash) {
      return res.status(400).json({ 
        error: 'Missing required Telegram authentication data' 
      });
    }

    // Verify Telegram authentication data
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ 
        error: 'Bot token not configured' 
      });
    }

    // Create data string for verification
    const dataCheckString = Object.keys(req.body)
      .filter(key => key !== 'hash')
      .sort()
      .map(key => `${key}=${req.body[key]}`)
      .join('\n');

    // Create secret key
    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest();

    // Create hash for verification
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Verify hash
    if (computedHash !== hash) {
      return res.status(401).json({ 
        error: 'Invalid Telegram authentication data' 
      });
    }

    // Check if auth_date is not too old (1 day)
    const authDate = parseInt(auth_date);
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - authDate > 86400) {
      return res.status(401).json({ 
        error: 'Authentication data is too old' 
      });
    }

    // Find or create user
    let user = await User.findOne({ telegramId: id });
    
    if (!user) {
      // Create new user
      user = new User({
        telegramId: id,
        firstName: first_name,
        lastName: last_name || '',
        username: username || '',
        photoUrl: photo_url || '',
        authDate: new Date(authDate * 1000),
        isActive: true,
        lastLogin: new Date()
      });
      await user.save();
    } else {
      // Update existing user
      user.firstName = first_name;
      user.lastName = last_name || '';
      user.username = username || '';
      user.photoUrl = photo_url || '';
    user.lastLogin = new Date();
      user.isActive = true;
    await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        telegramId: user.telegramId,
        username: user.username 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(500).json({ 
      error: 'Internal server error during authentication' 
    });
  }
});

// @desc    Check authentication status for chat widget
// @route   POST /api/auth/telegram/check
// @access  Public
router.post('/telegram/check', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Authentication code is required' 
      });
    }

    // Check if authentication is complete
    const authData = pendingAuth.get(code);
    
    if (authData && authData.authenticated) {
      // Remove from pending auth
      pendingAuth.delete(code);
      
      return res.json({
        success: true,
        authenticated: true,
        token: authData.token,
        user: authData.user
      });
    }

    res.json({
      success: true,
      authenticated: false,
      message: 'Authentication pending'
    });

  } catch (error) {
    console.error('Check auth error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// @desc    Manual authentication with chat ID
// @route   POST /api/auth/telegram/manual
// @access  Public
router.post('/telegram/manual', async (req, res) => {
  try {
    const { chatId, code } = req.body;
    
    if (!chatId || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Chat ID and code are required' 
      });
    }

    // Check if we have this chat ID in our pending auth
    const authData = pendingAuth.get(code);
    
    if (!authData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired authentication code' 
      });
    }

    // Verify the chat ID matches
    if (authData.chatId !== chatId.toString()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Chat ID does not match' 
      });
    }

    // Complete the authentication
    pendingAuth.delete(code);
    
    res.json({
      success: true,
      token: authData.token,
      user: authData.user
    });

  } catch (error) {
    console.error('Manual auth error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Webhook endpoint for Telegram bot
router.post('/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    // Log webhook for debugging
    console.log('Telegram webhook received:', JSON.stringify(update, null, 2));
    
    // Check if bot token is configured
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return res.status(500).json({ error: 'Bot token not configured' });
    }
    
    // Handle different types of updates
    if (update.message && update.message.from && !update.message.from.is_bot) {
      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;
      const text = message.text;
      const user = message.from;

      // Only respond to real users, not test data
      if (userId && userId !== 123456789) {
        try {
          // Handle /start command with auth code
          if (text && text.startsWith('/start')) {
            const parts = text.split(' ');
            
            if (parts.length > 1) {
              // This is an authentication request
              const authCode = parts[1];
              
              // Create or find user
              let dbUser = await User.findOne({ telegramId: userId });
              
              if (!dbUser) {
                // Create new user
                dbUser = new User({
                  telegramId: userId,
                  firstName: user.first_name,
                  lastName: user.last_name || '',
                  username: user.username || '',
                  isActive: true,
                  lastLogin: new Date()
                });
                await dbUser.save();
              } else {
                // Update existing user
                dbUser.firstName = user.first_name;
                dbUser.lastName = user.last_name || '';
                dbUser.username = user.username || '';
                dbUser.lastLogin = new Date();
                dbUser.isActive = true;
                await dbUser.save();
              }

              // Generate JWT token
              const token = jwt.sign(
                { 
                  userId: dbUser._id, 
                  telegramId: dbUser.telegramId,
                  username: dbUser.username 
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
              );

              // Store authentication data
              pendingAuth.set(authCode, {
                chatId: chatId.toString(),
                authenticated: true,
                token: token,
                user: {
                  id: dbUser._id,
                  telegramId: dbUser.telegramId,
                  firstName: dbUser.firstName,
                  lastName: dbUser.lastName,
                  username: dbUser.username,
                  photoUrl: dbUser.photoUrl,
                  createdAt: dbUser.createdAt,
                  lastLogin: dbUser.lastLogin
                }
              });

              await sendTelegramMessage(chatId, 
                `🎉 Authentication successful!\n\n` +
                `Welcome ${user.first_name}!\n` +
                `You can now return to the website and continue.`
              );
  } else {
              // Regular start command
              await sendTelegramMessage(chatId, 
                `🎉 Welcome to SearchNorthCyprus!\n\n` +
                `Your Telegram ID: ${userId}\n` +
                `Your Chat ID: ${chatId}\n\n` +
                `You can now use this bot for authentication.\n\n` +
                `Visit our website and click "Login with Telegram" to get started!`
              );
            }
          }

          // Handle /getchatid command
          if (text && text.startsWith('/getchatid')) {
            await sendTelegramMessage(chatId, 
              `🔑 Your Chat ID: ${chatId}\n\n` +
              `Use this ID for manual authentication on our platform.`
            );
          }
        } catch (messageError) {
          console.error('Error handling message:', messageError);
          // Don't fail the webhook if message sending fails
        }
      }
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper function to send Telegram messages
async function sendTelegramMessage(chatId, text) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      throw new Error('Bot token not configured');
    }
    
    console.log(`Sending message to chat ${chatId}: ${text.substring(0, 50)}...`);
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Telegram API error: ${response.status} - ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    const result = await response.json();
    console.log('Message sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
}

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      avatar: user.avatar,
      phone: user.phone,
      location: user.location,
      isVerified: user.isVerified,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      preferences: user.preferences,
      subscription: user.subscription,
      uploadQuota: {
        freeUploadsUsed: user.uploadQuota.freeUploadsUsed,
        freeUploadsLimit: user.uploadQuota.freeUploadsLimit,
        paidUploadsRemaining: user.uploadQuota.paidUploadsRemaining,
        canUpload: user.canUpload,
        lastQuotaReset: user.uploadQuota.lastQuotaReset
      },
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }
  });
}));

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', [
  protect,
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please enter a valid phone number'),
  body('preferences.language')
    .optional()
    .isIn(['en', 'tr', 'es', 'fr', 'gr'])
    .withMessage('Language must be one of: en, tr, es, fr, gr'),
  body('preferences.timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
  body('preferences.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be a boolean'),
  body('preferences.notifications.telegram')
    .optional()
    .isBoolean()
    .withMessage('Telegram notifications must be a boolean'),
  body('location.city')
    .optional()
    .isString()
    .withMessage('City must be a string'),
  body('location.region')
    .optional()
    .isString()
    .withMessage('Region must be a string'),
  body('location.address')
    .optional()
    .isString()
    .withMessage('Address must be a string'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const allowedFields = [
    'firstName',
    'lastName',
    'phone',
    'bio',
    'location',
    'preferences'
  ];

  console.log('🔍 PROFILE UPDATE - Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 PROFILE UPDATE - User ID:', req.user.id);
  console.log('🔍 PROFILE UPDATE - Allowed fields:', allowedFields);

  const updateData = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = req.body[key];
    }
  });

  console.log('🔍 PROFILE UPDATE - Update data:', JSON.stringify(updateData, null, 2));

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  console.log('✅ PROFILE UPDATE - Database updated, returning user:', user ? 'User found' : 'No user');
  console.log('✅ PROFILE UPDATE - Updated user data:', JSON.stringify(user?.toObject(), null, 2));

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user
  });
}));

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', [
  protect,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(currentPassword))) {
    return next(authenticationError('Current password is incorrect'));
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password updated successfully');
}));

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if email exists or not for security
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to user
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire to 30 minutes (increased from 10 minutes)
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

  console.log('Before saving token to database:', {
    email: user.email,
    hashedToken: user.resetPasswordToken.substring(0, 10) + '...',
    expiresAt: new Date(user.resetPasswordExpire).toISOString()
  });
  
  await user.save({ validateBeforeSave: false });
  
  console.log('Token saved successfully to database for user:', user.email);

  // Immediately verify the token was saved by querying the database
  const verifyUser = await User.findById(user._id).select('resetPasswordToken resetPasswordExpire email');
  console.log('Verification after save - Token in database:', {
    email: verifyUser.email,
    hasStoredToken: !!verifyUser.resetPasswordToken,
    storedTokenHash: verifyUser.resetPasswordToken ? verifyUser.resetPasswordToken.substring(0, 10) + '...' : 'none',
    expiresAt: verifyUser.resetPasswordExpire ? new Date(verifyUser.resetPasswordExpire).toISOString() : 'none'
  });

  // Create reset URL using request host
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = req.headers.host || req.headers['x-forwarded-host'] || 'localhost:3000';
  const resetUrl = `${protocol}://${host}/reset-password/${resetToken}`;
  
  console.log('Password reset request details:', {
    email: user.email,
    resetUrl: resetUrl,
    tokenExpires: new Date(user.resetPasswordExpire).toISOString()
  });

  // Send password reset email
  try {
    await sendPasswordResetEmail(user, resetToken, resetUrl);
    console.log('Password reset email sent successfully to:', user.email);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    
    // In development, don't clear the token to allow testing
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV) {
      // Reset the token fields if email fails in production
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      return next(validationError('Email could not be sent. Please try again later.'));
    } else {
      console.log('Development mode: Token preserved despite email failure');
    }
  }

  res.status(200).json({
    success: true,
    message: 'Password reset email sent successfully'
  });
}));

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
router.put('/reset-password/:resettoken', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  console.log('Reset password attempt:', {
    originalToken: req.params.resettoken,
    hashedToken: resetPasswordToken,
    currentTime: new Date(Date.now()).toISOString()
  });

  const user = await User.findOne({
    resetPasswordToken: resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    // Check if token exists but expired
    const expiredUser = await User.findOne({
      resetPasswordToken: resetPasswordToken
    });
    
    if (expiredUser) {
      console.log('Token found but expired:', {
        tokenExpires: new Date(expiredUser.passwordResetExpires).toISOString(),
        currentTime: new Date(Date.now()).toISOString()
      });
      return next(validationError('Reset token has expired. Please request a new password reset.'));
    } else {
      console.log('No user found with token:', resetPasswordToken);
      return next(validationError('Invalid reset token. Please request a new password reset.'));
    }
  }

  console.log('Valid token found for user:', user.email);

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password reset successful');
}));

// @desc    Debug reset token (development only)
// @route   GET /api/auth/debug-token/:resettoken
// @access  Public (development only)
if (process.env.NODE_ENV === 'development') {
  router.get('/debug-token/:resettoken', asyncHandler(async (req, res) => {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetPasswordToken
    });

    if (!user) {
      return res.json({
        success: false,
        message: 'No user found with this token',
        hashedToken: resetPasswordToken,
        originalToken: req.params.resettoken
      });
    }

    const isExpired = user.resetPasswordExpire < Date.now();

    return res.json({
      success: true,
      user: user.email,
      tokenExpires: new Date(user.resetPasswordExpire).toISOString(),
      currentTime: new Date(Date.now()).toISOString(),
      isExpired,
      minutesRemaining: isExpired ? 0 : Math.round((user.resetPasswordExpire - Date.now()) / (1000 * 60))
    });
  }));
}

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
router.get('/verify-email/:token', asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(validationError('Invalid or expired verification token'));
  }

  user.emailVerified = true;
  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
}));

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private
router.post('/resend-verification', [
  protect,
  createRateLimit(3, 60 * 60 * 1000, 'Too many verification email requests')
], asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.emailVerified) {
    return res.status(400).json({
      success: false,
      message: 'Email is already verified'
    });
  }

  // Generate new verification token
  const verificationToken = crypto.randomBytes(20).toString('hex');
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save();

  // TODO: Send verification email

  res.status(200).json({
    success: true,
    message: 'Verification email sent'
  });
}));

module.exports = router; 