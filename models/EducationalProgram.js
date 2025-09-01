const mongoose = require('mongoose');

const EducationalProgramSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Program title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Program description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  institution: {
    name: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    logo: {
      type: String,
      trim: true
    }
  },
  level: {
    type: String,
    required: [true, 'Program level is required'],
   
  },
  fieldOfStudy: {
    type: String,
    required: false, // Make optional to avoid validation issues
   
  },
  duration: {
    value: {
      type: Number,
      required: [true, 'Duration value is required'],
      min: [1, 'Duration must be at least 1']
    },
    unit: {
      type: String,
      required: [true, 'Duration unit is required'],
      enum: ['months', 'years', 'semesters']
    }
  },
  tuition: {
    amount: {
      type: Number,
      required: [true, 'Tuition amount is required'],
      min: [0, 'Tuition amount cannot be negative']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: ['USD', 'EUR', 'TRY', 'GBP'],
      default: 'USD'
    },
    period: {
      type: String,
      required: [true, 'Tuition period is required'],
      enum: ['per_semester', 'per_year', 'total', 'per_month']
    }
  },
  location: {
    city: {
      type: String,
      required: [true, 'City is required'],
      enum: [
        'Nicosia', 'Lefkoşa', 'Famagusta', 'Gazimağusa', 'Kyrenia', 'Girne',
        'Morphou', 'Güzelyurt', 'İskele', 'Lefke'
      ]
    },
    address: {
      type: String,
      trim: true
    },
    campus: {
      type: String,
      trim: true
    }
  },
  language: {
    instruction: {
      type: String,
      required: false, // Make optional to avoid validation issues
      enum: ['English', 'Turkish', 'Greek', 'French', 'German', 'Other'],
      default: 'English'
    },
    requirements: {
      type: String,
      trim: true
    }
  },
  admissionRequirements: {
    academicRequirements: [String],
    languageRequirements: [String],
    documentsRequired: [String],
    additionalRequirements: [String]
  },
  applicationDeadlines: {
    fall: {
      type: Date
    },
    spring: {
      type: Date
    },
    summer: {
      type: Date
    }
  },
  contactInfo: {
    email: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    admissionsOffice: {
      type: String,
      trim: true
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  brochure: {
    url: {
      type: String
    },
    filename: {
      type: String
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
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
    type: String
  },
  views: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
EducationalProgramSchema.index({ title: 'text', description: 'text', 'institution.name': 'text' });
EducationalProgramSchema.index({ level: 1 });
EducationalProgramSchema.index({ fieldOfStudy: 1 });
EducationalProgramSchema.index({ 'location.city': 1 });
EducationalProgramSchema.index({ featured: 1 });
EducationalProgramSchema.index({ status: 1 });
EducationalProgramSchema.index({ moderationStatus: 1 });
EducationalProgramSchema.index({ createdAt: -1 });
EducationalProgramSchema.index({ 'tuition.amount': 1 });

// Virtual for primary image
EducationalProgramSchema.virtual('primaryImage').get(function() {
  if (!this.images || !Array.isArray(this.images)) return null;
  const primaryImg = this.images.find(img => img.isPrimary);
  return primaryImg ? primaryImg.url : (this.images.length > 0 ? this.images[0].url : null);
});

// Static method to get featured programs
EducationalProgramSchema.statics.getFeatured = function() {
  return this.find({ 
    featured: true, 
    status: 'active', 
    moderationStatus: 'approved' 
  });
};

// Instance method to increment views
EducationalProgramSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to increment applications
EducationalProgramSchema.methods.incrementApplications = function() {
  this.applicationCount += 1;
  return this.save();
};

// Middleware to update lastUpdated
EducationalProgramSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }
  next();
});

// Ensure virtual fields are serialized
EducationalProgramSchema.set('toJSON', { virtuals: true });
EducationalProgramSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EducationalProgram', EducationalProgramSchema);