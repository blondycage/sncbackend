const Listing = require('../../models/Listing');
const { AppError, validationError } = require('../../middleware/errorHandler');
const { validationResult } = require('express-validator');

const adminListingsController = {
  // Get all listings with filters and pagination
  getAllListings: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        moderationStatus,
        isReported,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {};
      if (status) query.status = status;
      if (moderationStatus) query.moderationStatus = moderationStatus;
      if (isReported === 'true') query.isReported = true;

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const listings = await Listing.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('owner', 'username email firstName lastName')
        .populate('reports.reportedBy', 'username email firstName lastName');

      const total = await Listing.countDocuments(query);

      res.json({
        success: true,
        data: {
          listings,
          pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('❌ Admin getAllListings error:', error);
      throw new AppError('Error fetching listings', 500);
    }
  },

  // Get a single listing
  getListing: async (req, res) => {
    try {
      const listing = await Listing.findById(req.params.id)
        .populate('owner', 'username email firstName lastName')
        .populate('reports.reportedBy', 'username email firstName lastName');

      if (!listing) {
        throw new AppError('Listing not found', 404);
      }

      res.json({
        success: true,
        data: { listing }
      });
    } catch (error) {
      console.error('❌ Admin getListing error:', error);
      throw new AppError('Error fetching listing', 500);
    }
  },

  // Create a new listing
  createListing: async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(validationError(errors.array().map(err => err.msg).join(', ')));
      }

      const listing = new Listing({
        ...req.body,
        moderationStatus: 'approved', // Admins can create pre-approved listings
        moderatedBy: req.user._id,
        moderatedAt: new Date()
      });

      await listing.save();

      res.status(201).json({
        success: true,
        data: { listing }
      });
    } catch (error) {
      throw new AppError('Error creating listing', 500);
    }
  },

  // Update a listing
  updateListing: async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(validationError(errors.array().map(err => err.msg).join(', ')));
      }

      const listing = await Listing.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          moderatedBy: req.user._id,
          moderatedAt: new Date()
        },
        { new: true }
      );

      if (!listing) {
        throw new AppError('Listing not found', 404);
      }

      res.json({
        success: true,
        data: { listing }
      });
    } catch (error) {
      throw new AppError('Error updating listing', 500);
    }
  },

  // Delete a listing
  deleteListing: async (req, res) => {
    try {
      const listing = await Listing.findByIdAndDelete(req.params.id);

      if (!listing) {
        throw new AppError('Listing not found', 404);
      }

      res.json({
        success: true,
        message: 'Listing deleted successfully'
      });
    } catch (error) {
      throw new AppError('Error deleting listing', 500);
    }
  },

  // Update moderation status
  updateModerationStatus: async (req, res) => {
    try {
      const { status, notes } = req.body;

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        throw new AppError('Invalid moderation status', 400);
      }

      const listing = await Listing.findByIdAndUpdate(
        req.params.id,
        {
          moderationStatus: status,
          moderationNotes: notes,
          moderatedBy: req.user._id,
          moderatedAt: new Date(),
          // If approved, also set the listing status to active
          ...(status === 'approved' && { status: 'active' }),
          ...(status === 'rejected' && { status: 'inactive' })
        },
        { new: true }
      );

      if (!listing) {
        throw new AppError('Listing not found', 404);
      }

      res.json({
        success: true,
        data: { listing }
      });
    } catch (error) {
      throw new AppError('Error updating moderation status', 500);
    }
  },

  // Get listings statistics
  getListingsStats: async (req, res) => {
    try {
      const stats = await Listing.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
              }
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ['$moderationStatus', 'pending'] }, 1, 0]
              }
            },
            reported: {
              $sum: {
                $cond: [{ $eq: ['$isReported', true] }, 1, 0]
              }
            }
          }
        }
      ]);

      res.json({
        success: true,
        data: stats[0] || {
          total: 0,
          active: 0,
          pending: 0,
          reported: 0
        }
      });
    } catch (error) {
      throw new AppError('Error fetching listings statistics', 500);
    }
  }
};

module.exports = adminListingsController; 