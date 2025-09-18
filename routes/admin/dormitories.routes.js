const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const adminDormitoriesController = require('../../controllers/admin/dormitories.controller');
const { protect, adminOnly } = require('../../middleware/auth');

// All routes are prefixed with /api/admin/dormitories
// Protect all routes with authentication and admin middleware
router.use(protect, adminOnly);

// Get all dormitories with filters and pagination
router.get('/', adminDormitoriesController.getAllDormitories);

// Get dormitories statistics
router.get('/stats', adminDormitoriesController.getDormitoriesStats);

// Get dormitories analytics
router.get('/analytics', adminDormitoriesController.getAnalytics);

// Get pending dormitories (must come before /:id route)
router.get('/pending', (req, res, next) => {
  req.query.moderationStatus = 'pending';
  adminDormitoriesController.getAllDormitories(req, res, next);
});

// Get reported dormitories (must come before /:id route)
router.get('/reported', (req, res, next) => {
  req.query.isReported = 'true';
  adminDormitoriesController.getAllDormitories(req, res, next);
});

// Get a single dormitory
router.get('/:id', adminDormitoriesController.getDormitory);

// Create a new dormitory with validation
router.post('/', [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('university.name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('University name is required'),
  body('location.city')
    .trim()
    .isLength({ min: 2 })
    .withMessage('City is required'),
  body('location.address')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Address is required'),
  body('availability')
    .isIn(['available', 'running_out', 'unavailable'])
    .withMessage('Invalid availability status'),
  body('image_urls')
    .isArray({ min: 1, max: 10 })
    .withMessage('At least 1 and maximum 10 images required'),
  body('roomVariants')
    .isArray({ min: 1 })
    .withMessage('At least one room variant is required'),
  body('contact.phone')
    .trim()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Valid phone number is required'),
  body('genderRestriction')
    .optional()
    .isIn(['male', 'female', 'mixed'])
    .withMessage('Invalid gender restriction')
], adminDormitoriesController.createDormitory);

// Update dormitory with validation
router.put('/:id', [
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
  body('university.name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('University name is required'),
  body('location.city')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('City is required'),
  body('location.address')
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage('Address is required'),
  body('availability')
    .optional()
    .isIn(['available', 'running_out', 'unavailable'])
    .withMessage('Invalid availability status'),
  body('image_urls')
    .optional()
    .isArray({ min: 1, max: 10 })
    .withMessage('At least 1 and maximum 10 images required'),
  body('roomVariants')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one room variant is required'),
  body('contact.phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Valid phone number is required'),
  body('genderRestriction')
    .optional()
    .isIn(['male', 'female', 'mixed'])
    .withMessage('Invalid gender restriction')
], adminDormitoriesController.updateDormitory);

// Delete dormitory
router.delete('/:id', adminDormitoriesController.deleteDormitory);

// Moderate dormitory (approve/reject)
router.patch('/:id/moderate', [
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be either approve or reject'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], adminDormitoriesController.moderateDormitory);

// Clear reports for a dormitory
router.delete('/:id/reports', adminDormitoriesController.clearReports);

module.exports = router;