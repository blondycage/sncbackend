const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const jobSchema = new mongoose.Schema({
  // Basic job information
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  role: {
    type: String,
    required: [true, 'Job role is required'],
    trim: true,
    minlength: [3, 'Role must be at least 3 characters'],
    maxlength: [50, 'Role cannot exceed 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 50 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  salary: {
    min: {
      type: Number,
      required: [true, 'Minimum salary is required'],
      min: [0, 'Salary cannot be negative']
    },
    max: {
      type: Number,
      required: [true, 'Maximum salary is required'],
      min: [0, 'Salary cannot be negative'],
      validate: {
        validator: function(value) {
          return value >= this.salary.min;
        },
        message: 'Maximum salary must be greater than or equal to minimum salary'
      }
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: ['USD', 'EUR', 'GBP', 'TRY'],
      default: 'USD'
    },
    frequency: {
      type: String,
      required: [true, 'Salary frequency is required'],
      default: 'monthly'
    }
  },
  
  // Job details
  jobType: {
    type: String,
    required: [true, 'Job type is required'],
    enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
    default: 'full-time'
  },
  workLocation: {
    type: String,
    required: [true, 'Work location is required'],
    enum: ['remote', 'on-site', 'hybrid'],
    default: 'on-site'
  },
  requirements: [{
    type: String,
    trim: true,
    maxlength: [500, 'Each requirement cannot exceed 500 characters']
  }],
  benefits: [{
    type: String,
    trim: true,
    maxlength: [500, 'Each benefit cannot exceed 500 characters']
  }],
  
  // Location information
  location: {
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    region: {
      type: String,
      required: [true, 'Region is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Company information
  company: {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    logo: {
      type: String, // Cloudinary URL
      default: null
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Company description cannot exceed 1000 characters']
    }
  },
  
  // Contact information
  contact: {
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
    }
  },
  
  // Job status
  status: {
    type: String,
    enum: ['open', 'closed', 'filled'],
    default: 'open'
  },
  
  // Application deadline
  applicationDeadline: {
    type: Date,
    required: [true, 'Application deadline is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Application deadline must be in the future'
    }
  },
  
  // Job poster information
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Job poster is required']
  },
  
  // Moderation fields
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  moderationNotes: {
    type: String,
    maxlength: [500, 'Moderation notes cannot exceed 500 characters']
  },
  
  // Application tracking
  applications: [{
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
      default: 'pending'
    },
    coverLetter: {
      type: String,
      maxlength: [2000, 'Cover letter cannot exceed 2000 characters']
    },
    resume: {
      type: String // Cloudinary URL
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
  }],
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  
  // Flags and reports
  isReported: {
    type: Boolean,
    default: false
  },
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true,
      
    },
    description: {
      type: String,
      maxlength: [500, 'Report description cannot exceed 500 characters']
    },
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
jobSchema.index({ moderationStatus: 1, status: 1 });
jobSchema.index({ postedBy: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ applicationDeadline: 1 });
jobSchema.index({ 'location.city': 1, 'location.region': 1 });
jobSchema.index({ jobType: 1, workLocation: 1 });
jobSchema.index({ 'salary.min': 1, 'salary.max': 1 });

// Text search index
jobSchema.index({
  title: 'text',
  role: 'text',
  description: 'text',
  'company.name': 'text',
  'company.description': 'text',
  requirements: 'text',
  benefits: 'text'
});

// Virtual for salary range display (robust against missing fields)
jobSchema.virtual('salaryRange').get(function() {
  const s = this.salary || {};
  const min = typeof s.min === 'number' ? s.min : null;
  const max = typeof s.max === 'number' ? s.max : null;
  const currency = s.currency || 'USD';
  const frequency = s.frequency || '';

  if (min == null && max == null) return '';
  if (min != null && max != null) {
    if (min === max) {
      return `${currency} ${min.toLocaleString()}${frequency ? `/${frequency}` : ''}`;
    }
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}${frequency ? `/${frequency}` : ''}`;
  }
  const value = (min != null ? min : max);
  return `${currency} ${value.toLocaleString()}${frequency ? `/${frequency}` : ''}`;
});

// Virtual for checking if job is still active
jobSchema.virtual('isActive').get(function() {
  return this.status === 'open' && 
         this.moderationStatus === 'approved' && 
         this.applicationDeadline > new Date();
});

// Virtual for application count
jobSchema.virtual('totalApplications').get(function() {
  return this.applications ? this.applications.length : 0;
});

// Middleware to update applicationCount when applications change
jobSchema.pre('save', function(next) {
  if (this.isModified('applications')) {
    this.applicationCount = this.applications.length;
  }
  this.updatedAt = new Date();
  next();
});

// Static method to get jobs with filters
jobSchema.statics.getJobsWithFilters = function(filters = {}) {
  const query = {
    moderationStatus: 'approved',
    status: 'open',
    applicationDeadline: { $gt: new Date() }
  };
  
  // Apply filters
  if (filters.jobType) query.jobType = filters.jobType;
  if (filters.workLocation) query.workLocation = filters.workLocation;
  if (filters.city) query['location.city'] = new RegExp(filters.city, 'i');
  if (filters.region) query['location.region'] = new RegExp(filters.region, 'i');
  if (filters.minSalary) query['salary.min'] = { $gte: filters.minSalary };
  if (filters.maxSalary) query['salary.max'] = { $lte: filters.maxSalary };
  if (filters.search) query.$text = { $search: filters.search };
  
  return this.find(query);
};

// Method to apply for a job
jobSchema.methods.applyForJob = function(userId, applicationData) {
  // Check if user already applied
  const existingApplication = this.applications.find(
    app => app.applicant.toString() === userId.toString()
  );
  
  if (existingApplication) {
    throw new Error('You have already applied for this job');
  }
  
  // Check if job is still accepting applications
  if (this.status !== 'open' || this.applicationDeadline <= new Date()) {
    throw new Error('This job is no longer accepting applications');
  }
  
  // Add application
  this.applications.push({
    applicant: userId,
    ...applicationData
  });
  
  return this.save();
};

// Add pagination plugin
jobSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Job', jobSchema); 