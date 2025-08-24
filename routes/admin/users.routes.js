const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../../middleware/auth');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  // toggleUserLock removed - account locking disabled
  sendVerificationEmail,
  sendPasswordResetEmail,
  resetUploadQuota,
  getUserStats
} = require('../../controllers/admin/users.controller');

// Middleware to check for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Apply authentication and admin authorization to all routes
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/users/stats
// @desc    Get user statistics
// @access  Private/Admin
router.get('/stats', getUserStats);

// @route   GET /api/admin/users
// @desc    Get all users with filters and pagination
// @access  Private/Admin
router.get('/', getUsers);

// @route   GET /api/admin/users/:id
// @desc    Get single user by ID
// @access  Private/Admin
router.get('/:id', getUser);

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Private/Admin
router.post('/', [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('role')
    .optional()
    .isIn(['user', 'advertiser', 'admin'])
    .withMessage('Role must be user, advertiser, or admin'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors
], createUser);

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/:id', [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('role')
    .optional()
    .isIn(['user', 'advertiser', 'admin'])
    .withMessage('Role must be user, advertiser, or admin'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean'),
  handleValidationErrors
], updateUser);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', deleteUser);

// Removed lock/unlock route - account locking feature has been disabled

// @route   POST /api/admin/users/:id/send-verification
// @desc    Send verification email to user
// @access  Private/Admin
router.post('/:id/send-verification', sendVerificationEmail);

// @route   POST /api/admin/users/:id/send-password-reset
// @desc    Send password reset email to user
// @access  Private/Admin
router.post('/:id/send-password-reset', sendPasswordResetEmail);

// @route   POST /api/admin/users/:id/reset-quota
// @desc    Reset user's upload quota
// @access  Private/Admin
router.post('/:id/reset-quota', [
  body('freeUploadsLimit')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Free uploads limit must be between 0 and 100'),
  body('paidUploadsRemaining')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('Paid uploads remaining must be between 0 and 1000'),
  handleValidationErrors
], resetUploadQuota);

module.exports = router; 