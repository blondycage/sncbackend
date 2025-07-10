const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const adminListingsController = require('../../controllers/admin/listings.controller');
const { protect, adminOnly } = require('../../middleware/auth');

// All routes are prefixed with /api/admin/listings
// Protect all routes with authentication and admin middleware
router.use(protect, adminOnly);

// Get all listings with filters and pagination
router.get('/', adminListingsController.getAllListings);

// Get listings statistics
router.get('/stats', adminListingsController.getListingsStats);

// Get pending listings (must come before /:id route)
router.get('/pending', (req, res, next) => {
  req.query.moderationStatus = 'pending';
  adminListingsController.getAllListings(req, res, next);
});

// Get reported listings (must come before /:id route)
router.get('/reported', (req, res, next) => {
  req.query.isReported = 'true';
  adminListingsController.getAllListings(req, res, next);
});

// Get a single listing
router.get('/:id', adminListingsController.getListing);

// Create a new listing with validation
router.post('/', [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .isIn(['rental', 'sale', 'service'])
    .withMessage('Category must be one of: rental, sale, service'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('pricing_frequency')
    .isIn(['hourly', 'daily', 'weekly', 'monthly', 'fixed'])
    .withMessage('Pricing frequency must be one of: hourly, daily, weekly, monthly, fixed')
], adminListingsController.createListing);

// Update a listing with validation
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
    .isIn(['hourly', 'daily', 'weekly', 'monthly', 'fixed'])
    .withMessage('Pricing frequency must be one of: hourly, daily, weekly, monthly, fixed')
], adminListingsController.updateListing);

// Delete a listing
router.delete('/:id', adminListingsController.deleteListing);

// Update moderation status
router.patch('/:id/moderate', adminListingsController.updateModerationStatus);

module.exports = router; 