const mongoose = require('mongoose');

const educationalProgramSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Program title is required'],
    trim: true,
    maxlength: [200, 'Program title cannot exceed 200 characters']
  },
  institution: {
    name: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true,
      maxlength: [100, 'Institution name cannot exceed 100 characters']
    },
    website: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/.+\..+/,
        'Please enter a valid website URL'
      ]
    },
    accreditation: {
      type: String,
      trim: true
    }
  },
  description: {
    type: String,
    required: [true, 'Program description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  level: {
    type: String,
    required: [true, 'Program level is required'],
    enum: {
      values: ['undergraduate', 'undergraduate_transfer', 'postgraduate_masters', 'postgraduate_phd', 'certificate', 'diploma', 'language_course'],
      message: 'Program level must be undergraduate, undergraduate_transfer, postgraduate_masters, postgraduate_phd, certificate, diploma, or language_course'
    }
  },
  field: {
    type: String,
    required: [true, 'Field of study is required'],
    enum: {
      values: [
        'computer_science', 'engineering', 'business', 'medicine', 'law', 'education',
        'arts_humanities', 'social_sciences', 'natural_sciences', 'mathematics',
        'psychology', 'tourism_hospitality', 'architecture', 'design', 'music',
        'sports_science', 'agriculture', 'veterinary', 'pharmacy', 'dentistry',
        'nursing', 'languages', 'communications', 'international_relations', 'economics',
        'other'
      ],
      message: 'Invalid field of study'
    }
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
      enum: {
        values: ['months', 'years', 'semesters'],
        message: 'Duration unit must be months, years, or semesters'
      }
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
      enum: {
        values: ['USD', 'EUR', 'TRY', 'GBP'],
        message: 'Currency must be USD, EUR, TRY, or GBP'
      }
    },
    period: {
      type: String,
      required: [true, 'Tuition period is required'],
      enum: {
        values: ['per_semester', 'per_year', 'total', 'per_month'],
        message: 'Period must be per_semester, per_year, total, or per_month'
      }
    },
    scholarshipAvailable: {
      type: Boolean,
      default: false
    },
    scholarshipDetails: {
      type: String,
      maxlength: [500, 'Scholarship details cannot exceed 500 characters']
    }
  },
  location: {
    city: {
      type: String,
      required: [true, 'City is required'],
      enum: {
        values: [
          'Nicosia', 'Lefkoşa', 'Famagusta', 'Gazimağusa', 'Kyrenia', 'Girne',
          'Morphou', 'Güzelyurt', 'İskele', 'Lefke'
        ],
        message: 'Invalid city'
      }
    },
    campus: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  requirements: {
    academic: {
      undergraduate: {
        waecNeco: {
          type: Boolean,
          default: false
        },
        credits: {
          type: Number,
          min: 0,
          max: 10
        }
      },
      postgraduate: {
        bachelorDegree: {
          type: Boolean,
          default: false
        },
        transcript: {
          type: Boolean,
          default: false
        },
        cv: {
          type: Boolean,
          default: false
        },
        researchProposal: {
          type: Boolean,
          default: false
        }
      }
    },
    documents: {
      passportIdDatapage: {
        type: Boolean,
        default: true
      },
      passportPhotograph: {
        type: Boolean,
        default: true
      },
      fatherName: {
        type: Boolean,
        default: true
      },
      motherName: {
        type: Boolean,
        default: true
      },
      highSchoolName: {
        type: Boolean,
        default: true
      }
    },
    language: {
      englishProficiency: {
        type: String,
        enum: ['none', 'ielts', 'toefl', 'toeic', 'institutional_test'],
        default: 'none'
      },
      minimumScore: {
        type: String,
        trim: true
      }
    }
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
  startDates: {
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
  images: [{
    url: {
      type: String,
      required: true
    },
    description: {
      type: String,
      maxlength: [200, 'Image description cannot exceed 200 characters']
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  features: [{
    type: String,
    maxlength: [100, 'Feature cannot exceed 100 characters']
  }],
  contactInfo: {
    email: {
      type: String,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email'
      ]
    },
    phone: {
      type: String,
      trim: true
    },
    admissionsOfficer: {
      name: {
        type: String,
        trim: true
      },
      email: {
        type: String,
        match: [
          /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
          'Please enter a valid email'
        ]
      },
      phone: {
        type: String,
        trim: true
      }
    }
  },
  status: {
    type: String,
    required: [true, 'Program status is required'],
    enum: {
      values: ['active', 'inactive', 'pending', 'archived'],
      message: 'Status must be active, inactive, pending, or archived'
    },
    default: 'pending'
  },
  moderationStatus: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected'],
      message: 'Moderation status must be pending, approved, or rejected'
    },
    default: 'pending'
  },
  moderationNotes: {
    type: String,
    maxlength: [1000, 'Moderation notes cannot exceed 1000 characters']
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  applications: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  tags: [{
    type: String,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9\s\-]+$/, 'Tags can only contain letters, numbers, spaces, and hyphens']
  }],
  metadata: {
    accreditationBodies: [{
      type: String,
      trim: true
    }],
    partnerUniversities: [{
      type: String,
      trim: true
    }],
    exchangePrograms: [{
      type: String,
      trim: true
    }],
    careerProspects: [{
      type: String,
      trim: true
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
educationalProgramSchema.index({ level: 1, field: 1 });
educationalProgramSchema.index({ 'location.city': 1 });
educationalProgramSchema.index({ status: 1, moderationStatus: 1 });
educationalProgramSchema.index({ featured: -1, createdAt: -1 });
educationalProgramSchema.index({ tags: 1 });
educationalProgramSchema.index({ 'tuition.amount': 1 });

// Text search index
educationalProgramSchema.index({
  title: 'text',
  description: 'text',
  'institution.name': 'text',
  tags: 'text'
});

// Virtual for formatted tuition
educationalProgramSchema.virtual('formattedTuition').get(function() {
  const currencySymbols = {
    USD: '$',
    EUR: '€',
    TRY: '₺',
    GBP: '£'
  };
  
  const symbol = currencySymbols[this.tuition.currency] || this.tuition.currency;
  return `${symbol}${this.tuition.amount.toLocaleString()}/${this.tuition.period.replace('per_', '').replace('_', ' ')}`;
});

// Virtual for primary image
educationalProgramSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images.length > 0 ? this.images[0].url : null);
});

// Middleware to ensure only one primary image
educationalProgramSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    if (primaryImages.length > 1) {
      // Keep only the first primary image
      this.images.forEach((img, index) => {
        if (index > 0 && img.isPrimary) {
          img.isPrimary = false;
        }
      });
    } else if (primaryImages.length === 0) {
      // Set first image as primary if none is set
      this.images[0].isPrimary = true;
    }
  }
  next();
});

// Static method to get programs by level
educationalProgramSchema.statics.getByLevel = function(level) {
  return this.find({ 
    level, 
    status: 'active', 
    moderationStatus: 'approved' 
  }).sort({ featured: -1, createdAt: -1 });
};

// Static method to get featured programs
educationalProgramSchema.statics.getFeatured = function() {
  return this.find({ 
    featured: true, 
    status: 'active', 
    moderationStatus: 'approved' 
  }).sort({ createdAt: -1 });
};

// Instance method to increment views
educationalProgramSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to increment applications
educationalProgramSchema.methods.incrementApplications = function() {
  this.applications += 1;
  return this.save();
};

module.exports = mongoose.model('EducationalProgram', educationalProgramSchema); 