const Dormitory = require('../../models/Dormitory');
const { AppError, validationError } = require('../../middleware/errorHandler');
const { validationResult } = require('express-validator');

const adminDormitoriesController = {
  // Get all dormitories with filters and pagination
  getAllDormitories: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        moderationStatus,
        isReported,
        availability,
        city,
        university,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {};
      if (status) query.status = status;
      if (moderationStatus) query.moderationStatus = moderationStatus;
      if (isReported === 'true') query.isReported = true;
      if (availability) query.availability = availability;
      if (city) query['location.city'] = new RegExp(city, 'i');
      if (university) query['university.name'] = new RegExp(university, 'i');

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const dormitories = await Dormitory.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('owner', 'firstName lastName email phone')
        .populate('reports.reportedBy', 'firstName lastName email');

      const total = await Dormitory.countDocuments(query);

      res.json({
        success: true,
        data: {
          dormitories,
          pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('❌ Admin getAllDormitories error:', error);
      throw new AppError('Error fetching dormitories', 500);
    }
  },

  // Get dormitories statistics
  getDormitoriesStats: async (req, res) => {
    try {
      const total = await Dormitory.countDocuments();
      const active = await Dormitory.countDocuments({ status: 'active' });
      const pending = await Dormitory.countDocuments({ moderationStatus: 'pending' });
      const approved = await Dormitory.countDocuments({ moderationStatus: 'approved' });
      const rejected = await Dormitory.countDocuments({ moderationStatus: 'rejected' });
      const reported = await Dormitory.countDocuments({ isReported: true });
      const available = await Dormitory.countDocuments({ availability: 'available' });
      const runningOut = await Dormitory.countDocuments({ availability: 'running_out' });
      const unavailable = await Dormitory.countDocuments({ availability: 'unavailable' });

      // Recent dormitories (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentDormitories = await Dormitory.countDocuments({
        createdAt: { $gte: weekAgo }
      });

      // Top cities by dormitory count
      const topCities = await Dormitory.aggregate([
        { $match: { moderationStatus: 'approved', status: 'active' } },
        { $group: { _id: '$location.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      // Top universities by dormitory count
      const topUniversities = await Dormitory.aggregate([
        { $match: { moderationStatus: 'approved', status: 'active' } },
        { $group: { _id: '$university.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      res.json({
        success: true,
        data: {
          total,
          active,
          pending,
          approved,
          rejected,
          reported,
          availability: {
            available,
            runningOut,
            unavailable
          },
          recentDormitories,
          topCities,
          topUniversities
        }
      });
    } catch (error) {
      console.error('❌ Admin getDormitoriesStats error:', error);
      throw new AppError('Error fetching dormitories statistics', 500);
    }
  },

  // Get single dormitory with full details
  getDormitory: async (req, res) => {
    try {
      const dormitory = await Dormitory.findById(req.params.id)
        .populate('owner', 'firstName lastName email phone createdAt')
        .populate('reports.reportedBy', 'firstName lastName email')
        .populate('moderatedBy', 'firstName lastName email');

      if (!dormitory) {
        throw new AppError('Dormitory not found', 404);
      }

      res.json({
        success: true,
        data: dormitory
      });
    } catch (error) {
      console.error('❌ Admin getDormitory error:', error);
      if (error.name === 'CastError') {
        throw new AppError('Invalid dormitory ID', 400);
      }
      throw error;
    }
  },

  // Create new dormitory (admin)
  createDormitory: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array().map(err => err.msg).join(', '), 400);
      }

      const dormitoryData = {
        ...req.body,
        owner: req.user._id,
        moderationStatus: 'approved', // Admin created, auto-approve
        moderatedBy: req.user._id,
        moderatedAt: new Date()
      };

      const dormitory = await Dormitory.create(dormitoryData);
      await dormitory.populate('owner', 'firstName lastName email phone');

      res.status(201).json({
        success: true,
        data: dormitory
      });
    } catch (error) {
      console.error('❌ Admin createDormitory error:', error);
      throw error;
    }
  },

  // Update dormitory
  updateDormitory: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array().map(err => err.msg).join(', '), 400);
      }

      const dormitory = await Dormitory.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('owner', 'firstName lastName email phone');

      if (!dormitory) {
        throw new AppError('Dormitory not found', 404);
      }

      res.json({
        success: true,
        data: dormitory
      });
    } catch (error) {
      console.error('❌ Admin updateDormitory error:', error);
      if (error.name === 'CastError') {
        throw new AppError('Invalid dormitory ID', 400);
      }
      throw error;
    }
  },

  // Delete dormitory
  deleteDormitory: async (req, res) => {
    try {
      const dormitory = await Dormitory.findById(req.params.id);

      if (!dormitory) {
        throw new AppError('Dormitory not found', 404);
      }

      await dormitory.deleteOne();

      res.json({
        success: true,
        message: 'Dormitory deleted successfully'
      });
    } catch (error) {
      console.error('❌ Admin deleteDormitory error:', error);
      if (error.name === 'CastError') {
        throw new AppError('Invalid dormitory ID', 400);
      }
      throw error;
    }
  },

  // Moderate dormitory (approve/reject)
  moderateDormitory: async (req, res) => {
    try {
      const { action, notes } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        throw new AppError('Invalid moderation action', 400);
      }

      const dormitory = await Dormitory.findByIdAndUpdate(
        req.params.id,
        {
          moderationStatus: action === 'approve' ? 'approved' : 'rejected',
          moderatedBy: req.user._id,
          moderatedAt: new Date(),
          moderationNotes: notes || ''
        },
        { new: true, runValidators: true }
      ).populate('owner', 'firstName lastName email phone');

      if (!dormitory) {
        throw new AppError('Dormitory not found', 404);
      }

      // TODO: Send email notification to owner

      res.json({
        success: true,
        data: dormitory,
        message: `Dormitory ${action}d successfully`
      });
    } catch (error) {
      console.error('❌ Admin moderateDormitory error:', error);
      if (error.name === 'CastError') {
        throw new AppError('Invalid dormitory ID', 400);
      }
      throw error;
    }
  },

  // Clear dormitory reports
  clearReports: async (req, res) => {
    try {
      const dormitory = await Dormitory.findByIdAndUpdate(
        req.params.id,
        {
          isReported: false,
          reports: []
        },
        { new: true }
      );

      if (!dormitory) {
        throw new AppError('Dormitory not found', 404);
      }

      res.json({
        success: true,
        message: 'Reports cleared successfully',
        data: dormitory
      });
    } catch (error) {
      console.error('❌ Admin clearReports error:', error);
      if (error.name === 'CastError') {
        throw new AppError('Invalid dormitory ID', 400);
      }
      throw error;
    }
  },

  // Get dormitory analytics
  getAnalytics: async (req, res) => {
    try {
      const { period = '30d' } = req.query;

      let startDate;
      const now = new Date();

      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Dormitories created over time
      const dormitoriesOverTime = await Dormitory.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Popular room types
      const roomTypeStats = await Dormitory.aggregate([
        { $match: { moderationStatus: 'approved', status: 'active' } },
        { $unwind: '$roomVariants' },
        { $group: { _id: '$roomVariants.type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Price distribution
      const priceStats = await Dormitory.aggregate([
        { $match: { moderationStatus: 'approved', status: 'active' } },
        { $unwind: '$roomVariants' },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$roomVariants.price' },
            minPrice: { $min: '$roomVariants.price' },
            maxPrice: { $max: '$roomVariants.price' }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          dormitoriesOverTime,
          roomTypeStats,
          priceStats: priceStats[0] || { avgPrice: 0, minPrice: 0, maxPrice: 0 }
        }
      });
    } catch (error) {
      console.error('❌ Admin getAnalytics error:', error);
      throw new AppError('Error fetching analytics', 500);
    }
  }
};

module.exports = adminDormitoriesController;