const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const Job = require('../../models/Job');
const User = require('../../models/User');
const { protect, adminOnly } = require('../../middleware/auth');
const { asyncHandler, validationError, notFoundError } = require('../../middleware/errorHandler');
const { sendJobApprovedEmail, sendJobRejectedEmail } = require('../../services/emailService');

// @desc    Get all jobs for admin (including pending)
// @route   GET /api/admin/jobs
// @access  Admin only
router.get('/', [
  protect,
  adminOnly,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('moderationStatus').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid moderation status'),
  query('status').optional().isIn(['open', 'closed', 'filled']).withMessage('Invalid job status'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search query must not be empty'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'title', 'company']).withMessage('Invalid sort option')
], asyncHandler(async (req, res, next) => {
  console.log('🔍 ADMIN GET ALL JOBS - Request params:', req.query);

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  const {
    page = 1,
    limit = 20,
    search,
    moderationStatus,
    status,
    sortBy = 'newest'
  } = req.query;

  // Build query
  const query = {};

  if (moderationStatus) query.moderationStatus = moderationStatus;
  if (status) query.status = status;
  if (search) query.$text = { $search: search };

  console.log('🔍 Admin query being executed:', query);

  // Build sort options
  let sortOptions = {};
  switch (sortBy) {
    case 'newest':
      sortOptions = { createdAt: -1 };
      break;
    case 'oldest':
      sortOptions = { createdAt: 1 };
      break;
    case 'title':
      sortOptions = { title: 1 };
      break;
    case 'company':
      sortOptions = { 'company.name': 1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }

  // Execute query with pagination
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: sortOptions,
    populate: [
      {
        path: 'postedBy',
        select: 'username firstName lastName email'
      },
      {
        path: 'moderatedBy',
        select: 'username firstName lastName'
      }
    ],
    lean: true
  };

  try {
    const result = await Job.paginate(query, options);
    console.log('✅ Admin query successful, found', result.totalDocs, 'jobs');

    // Format response data
    const formattedJobs = result.docs.map(job => ({
      id: job._id,
      title: job.title,
      role: job.role,
      description: job.description.substring(0, 200) + '...',
      salary: job.salary,
      jobType: job.jobType,
      workLocation: job.workLocation,
      location: job.location,
      company: job.company,
      status: job.status,
      moderationStatus: job.moderationStatus,
      moderatedBy: job.moderatedBy,
      moderatedAt: job.moderatedAt,
      moderationNotes: job.moderationNotes,
      applicationCount: job.applicationCount,
      views: job.views,
      createdAt: job.createdAt,
      applicationDeadline: job.applicationDeadline,
      postedBy: job.postedBy,
      isReported: job.isReported,
      reports: job.reports
    }));

    res.status(200).json({
      success: true,
      data: formattedJobs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        limit: result.limit
      },
      filters: {
        moderationStatus,
        status,
        search,
        sortBy
      }
    });
  } catch (error) {
    console.error('❌ Error fetching admin jobs:', error);
    return next(error);
  }
}));

// @desc    Get single job for admin (including all details)
// @route   GET /api/admin/jobs/:id
// @access  Admin only
router.get('/:id', [
  protect,
  adminOnly
], asyncHandler(async (req, res, next) => {
  console.log('🔍 ADMIN GET SINGLE JOB - ID:', req.params.id);

  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'username firstName lastName email phone')
      .populate('moderatedBy', 'username firstName lastName')
      .populate('applications.applicant', 'username firstName lastName email')
      .populate('reports.reportedBy', 'username firstName lastName');

    if (!job) {
      return next(notFoundError('Job not found'));
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('❌ Error fetching admin job:', error);
    return next(error);
  }
}));

// @desc    Moderate job (approve/reject)
// @route   PATCH /api/admin/jobs/:id/moderate
// @access  Admin only
router.patch('/:id/moderate', [
  protect,
  adminOnly,
  body('moderationStatus')
    .isIn(['approved', 'rejected'])
    .withMessage('Moderation status must be approved or rejected'),
  body('moderationNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Moderation notes cannot exceed 500 characters')
], asyncHandler(async (req, res, next) => {
  console.log('🛡️ JOB MODERATION STARTED - Job ID:', req.params.id);

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return next(notFoundError('Job not found'));
    }

    // Update moderation fields
    job.moderationStatus = req.body.moderationStatus;
    job.moderatedBy = req.user._id;
    job.moderatedAt = new Date();
    if (req.body.moderationNotes) {
      job.moderationNotes = req.body.moderationNotes;
    }

    await job.save();

    await job.populate([
      { path: 'postedBy', select: 'username firstName lastName email' },
      { path: 'moderatedBy', select: 'username firstName lastName' }
    ]);

    // Send notification email to job poster
    try {
      if (req.body.moderationStatus === 'approved') {
        await sendJobApprovedEmail(job.postedBy, job);
      } else {
        await sendJobRejectedEmail(job.postedBy, job, req.body.moderationNotes);
      }
    } catch (error) {
      console.error('Failed to send job moderation notification email:', error);
    }

    console.log('✅ Job moderated successfully:', job.moderationStatus);

    res.status(200).json({
      success: true,
      message: `Job ${req.body.moderationStatus} successfully`,
      data: {
        id: job._id,
        title: job.title,
        moderationStatus: job.moderationStatus,
        moderatedBy: job.moderatedBy,
        moderatedAt: job.moderatedAt,
        moderationNotes: job.moderationNotes
      }
    });
  } catch (error) {
    console.error('❌ Error moderating job:', error);
    return next(error);
  }
}));

// @desc    Update job status (admin)
// @route   PATCH /api/admin/jobs/:id/status
// @access  Admin only
router.patch('/:id/status', [
  protect,
  adminOnly,
  body('status')
    .isIn(['open', 'closed', 'filled'])
    .withMessage('Status must be one of: open, closed, filled')
], asyncHandler(async (req, res, next) => {
  console.log('🔄 ADMIN JOB STATUS UPDATE - Job ID:', req.params.id);

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('postedBy', 'username firstName lastName');

    if (!job) {
      return next(notFoundError('Job not found'));
    }

    console.log('✅ Job status updated successfully:', job.status);

    res.status(200).json({
      success: true,
      message: 'Job status updated successfully',
      data: {
        id: job._id,
        title: job.title,
        status: job.status,
        updatedAt: job.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Error updating job status:', error);
    return next(error);
  }
}));

// @desc    Delete job (admin)
// @route   DELETE /api/admin/jobs/:id
// @access  Admin only
router.delete('/:id', [
  protect,
  adminOnly
], asyncHandler(async (req, res, next) => {
  console.log('🗑️ ADMIN JOB DELETION - Job ID:', req.params.id);

  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return next(notFoundError('Job not found'));
    }

    await Job.findByIdAndDelete(req.params.id);

    console.log('✅ Job deleted successfully by admin');

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting job:', error);
    return next(error);
  }
}));

// @desc    Get job statistics for admin dashboard
// @route   GET /api/admin/jobs/stats
// @access  Admin only
router.get('/stats/dashboard', [
  protect,
  adminOnly
], asyncHandler(async (req, res, next) => {
  console.log('📊 ADMIN JOB STATS REQUEST');

  try {
    // Get basic counts
    const totalJobs = await Job.countDocuments();
    const pendingJobs = await Job.countDocuments({ moderationStatus: 'pending' });
    const approvedJobs = await Job.countDocuments({ moderationStatus: 'approved' });
    const rejectedJobs = await Job.countDocuments({ moderationStatus: 'rejected' });
    const openJobs = await Job.countDocuments({ status: 'open', moderationStatus: 'approved' });
    const filledJobs = await Job.countDocuments({ status: 'filled' });
    const reportedJobs = await Job.countDocuments({ isReported: true });

    // Get recent activity
    const recentJobs = await Job.find()
      .populate('postedBy', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title company createdAt moderationStatus status');

    // Get jobs by category/type
    const jobsByType = await Job.aggregate([
      { $match: { moderationStatus: 'approved' } },
      { $group: { _id: '$jobType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const jobsByLocation = await Job.aggregate([
      { $match: { moderationStatus: 'approved' } },
      { $group: { _id: '$workLocation', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get total applications
    const totalApplications = await Job.aggregate([
      { $unwind: '$applications' },
      { $count: 'total' }
    ]);

    const stats = {
      overview: {
        total: totalJobs,
        pending: pendingJobs,
        approved: approvedJobs,
        rejected: rejectedJobs,
        open: openJobs,
        filled: filledJobs,
        reported: reportedJobs
      },
      applications: {
        total: totalApplications.length > 0 ? totalApplications[0].total : 0
      },
      breakdown: {
        byType: jobsByType,
        byLocation: jobsByLocation
      },
      recent: recentJobs
    };

    console.log('✅ Job stats compiled successfully');

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error fetching job stats:', error);
    return next(error);
  }
}));

// @desc    Bulk moderate jobs
// @route   PATCH /api/admin/jobs/bulk/moderate
// @access  Admin only
router.patch('/bulk/moderate', [
  protect,
  adminOnly,
  body('jobIds')
    .isArray({ min: 1 })
    .withMessage('Job IDs array is required'),
  body('jobIds.*')
    .isMongoId()
    .withMessage('Each job ID must be valid'),
  body('moderationStatus')
    .isIn(['approved', 'rejected'])
    .withMessage('Moderation status must be approved or rejected'),
  body('moderationNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Moderation notes cannot exceed 500 characters')
], asyncHandler(async (req, res, next) => {
  console.log('🛡️ BULK JOB MODERATION STARTED');

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors.array().map(err => err.msg).join(', ')));
  }

  try {
    const { jobIds, moderationStatus, moderationNotes } = req.body;

    const updateData = {
      moderationStatus,
      moderatedBy: req.user._id,
      moderatedAt: new Date()
    };

    if (moderationNotes) {
      updateData.moderationNotes = moderationNotes;
    }

    const result = await Job.updateMany(
      { _id: { $in: jobIds } },
      updateData
    );

    console.log('✅ Bulk moderation completed:', result.modifiedCount, 'jobs updated');

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} jobs ${moderationStatus} successfully`,
      data: {
        modifiedCount: result.modifiedCount,
        moderationStatus
      }
    });
  } catch (error) {
    console.error('❌ Error in bulk moderation:', error);
    return next(error);
  }
}));

// @desc    Get job applications for admin
// @route   GET /api/admin/jobs/:id/applications
// @access  Admin only
router.get('/:id/applications', [
  protect,
  adminOnly
], asyncHandler(async (req, res, next) => {
  console.log('🔍 ADMIN GET JOB APPLICATIONS - Job ID:', req.params.id);

  try {
    const job = await Job.findById(req.params.id)
      .populate('applications.applicant', 'username firstName lastName email phone')
      .select('title company applications');

    if (!job) {
      return next(notFoundError('Job not found'));
    }

    const formattedApplications = job.applications.map(app => ({
      id: app._id,
      applicant: app.applicant,
      appliedAt: app.appliedAt,
      status: app.status,
      coverLetter: app.coverLetter,
      resume: app.resume,
      notes: app.notes
    }));

    res.status(200).json({
      success: true,
      data: {
        job: {
          id: job._id,
          title: job.title,
          company: job.company
        },
        applications: formattedApplications,
        totalApplications: formattedApplications.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching job applications:', error);
    return next(error);
  }
}));

module.exports = router; 