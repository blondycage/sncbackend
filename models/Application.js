const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Applicant is required']
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EducationalProgram',
    required: [true, 'Educational program is required']
  },
  applicationId: {
    type: String,
    unique: true,
    required: [true, 'Application ID is required']
  },
  personalInfo: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    nationality: {
      type: String,
      required: [true, 'Nationality is required'],
      trim: true
    },
    address: {
      street: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
      },
      state: {
        type: String,
        trim: true
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true
      },
      postalCode: {
        type: String,
        trim: true
      }
    },
    emergencyContact: {
      name: {
        type: String,
        required: [true, 'Emergency contact name is required'],
        trim: true
      },
      relationship: {
        type: String,
        required: [true, 'Emergency contact relationship is required'],
        trim: true
      },
      phone: {
        type: String,
        required: [true, 'Emergency contact phone is required'],
        trim: true
      }
    }
  },
  familyInfo: {
    fatherName: {
      type: String,
      required: [true, 'Father name is required'],
      trim: true,
      maxlength: [100, 'Father name cannot exceed 100 characters']
    },
    motherName: {
      type: String,
      required: [true, 'Mother name is required'],
      trim: true,
      maxlength: [100, 'Mother name cannot exceed 100 characters']
    },
    fatherOccupation: {
      type: String,
      trim: true
    },
    motherOccupation: {
      type: String,
      trim: true
    }
  },
  academicBackground: {
    highSchool: {
      name: {
        type: String,
        required: [true, 'High school name is required'],
        trim: true
      },
      graduationYear: {
        type: Number,
        required: [true, 'High school graduation year is required'],
        min: 1950,
        max: new Date().getFullYear() + 5
      },
      country: {
        type: String,
        required: [true, 'High school country is required'],
        trim: true
      }
    },
    waecNeco: {
      hasResults: {
        type: Boolean,
        default: false
      },
      credits: {
        type: Number,
        min: 0,
        max: 10
      },
      subjects: [{
        name: {
          type: String,
          trim: true
        },
        grade: {
          type: String,
          trim: true
        }
      }]
    },
    undergraduate: {
      institution: {
        type: String,
        trim: true
      },
      degree: {
        type: String,
        trim: true
      },
      fieldOfStudy: {
        type: String,
        trim: true
      },
      graduationYear: {
        type: Number,
        min: 1950,
        max: new Date().getFullYear() + 5
      },
      gpa: {
        type: Number,
        min: 0,
        max: 4.0
      },
      country: {
        type: String,
        trim: true
      }
    },
    postgraduate: {
      institution: {
        type: String,
        trim: true
      },
      degree: {
        type: String,
        trim: true
      },
      fieldOfStudy: {
        type: String,
        trim: true
      },
      graduationYear: {
        type: Number,
        min: 1950,
        max: new Date().getFullYear() + 5
      },
      gpa: {
        type: Number,
        min: 0,
        max: 4.0
      },
      country: {
        type: String,
        trim: true
      }
    }
  },
  documents: {
    passportIdDatapage: {
      uploaded: {
        type: Boolean,
        default: false
      },
      url: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    passportPhotograph: {
      uploaded: {
        type: Boolean,
        default: false
      },
      url: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    highSchoolTranscript: {
      uploaded: {
        type: Boolean,
        default: false
      },
      url: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    waecNecoResults: {
      uploaded: {
        type: Boolean,
        default: false
      },
      url: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    bachelorDiploma: {
      uploaded: {
        type: Boolean,
        default: false
      },
      url: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    bachelorTranscript: {
      uploaded: {
        type: Boolean,
        default: false
      },
      url: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    masterDiploma: {
      uploaded: {
        type: Boolean,
        default: false
      },
      url: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    masterTranscript: {
      uploaded: {
        type: Boolean,
        default: false
      },
      url: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    cv: {
      uploaded: {
        type: Boolean,
        default: false
      },
      url: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    researchProposal: {
      uploaded: {
        type: Boolean,
        default: false
      },
      url: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    englishProficiency: {
      uploaded: {
        type: Boolean,
        default: false
      },
      url: {
        type: String,
        trim: true
      },
      testType: {
        type: String,
        enum: ['ielts', 'toefl', 'toeic', 'institutional_test', 'other']
      },
      score: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    },
    additional: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      url: {
        type: String,
        required: true,
        trim: true
      },
      uploaded: {
        type: Boolean,
        default: true
      },
      verified: {
        type: Boolean,
        default: false
      }
    }]
  },
  applicationInfo: {
    intendedStartSemester: {
      type: String,
      required: [true, 'Intended start semester is required'],
      enum: ['fall', 'spring', 'summer']
    },
    intendedStartYear: {
      type: Number,
      required: [true, 'Intended start year is required'],
      min: new Date().getFullYear(),
      max: new Date().getFullYear() + 5
    },
    previousApplications: {
      type: Boolean,
      default: false
    },
    previousApplicationDetails: {
      type: String,
      maxlength: [500, 'Previous application details cannot exceed 500 characters']
    },
    motivation: {
      type: String,
      required: [true, 'Motivation statement is required'],
      maxlength: [2000, 'Motivation statement cannot exceed 2000 characters']
    },
    scholarshipInterest: {
      type: Boolean,
      default: false
    },
    scholarshipDetails: {
      type: String,
      maxlength: [1000, 'Scholarship details cannot exceed 1000 characters']
    }
  },
  status: {
    type: String,
    required: [true, 'Application status is required'],
    enum: {
      values: [
        'draft', 'submitted', 'under_review', 'documents_required',
        'approved', 'conditionally_approved', 'rejected', 'withdrawn',
        'enrolled', 'deferred'
      ],
      message: 'Invalid application status'
    },
    default: 'draft'
  },
  timeline: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: [500, 'Timeline notes cannot exceed 500 characters']
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  reviewNotes: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      required: [true, 'Review notes are required'],
      maxlength: [2000, 'Review notes cannot exceed 2000 characters']
    },
    recommendation: {
      type: String,
      enum: ['approve', 'reject', 'request_documents', 'conditionally_approve'],
      required: [true, 'Recommendation is required']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  submittedAt: {
    type: Date
  },
  reviewedAt: {
    type: Date
  },
  decisionDate: {
    type: Date
  },
  enrollmentDeadline: {
    type: Date
  },
  fees: {
    applicationFee: {
      amount: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'USD'
      },
      paid: {
        type: Boolean,
        default: false
      },
      paidAt: {
        type: Date
      }
    },
    tuitionDeposit: {
      amount: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'USD'
      },
      paid: {
        type: Boolean,
        default: false
      },
      paidAt: {
        type: Date
      }
    }
  },
  communicationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    phone: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    source: {
      type: String,
      enum: ['website', 'agent', 'referral', 'social_media', 'other'],
      default: 'website'
    },
    referralCode: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      maxlength: [1000, 'Metadata notes cannot exceed 1000 characters']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
applicationSchema.index({ applicant: 1, program: 1 });
applicationSchema.index({ applicationId: 1 }, { unique: true });
applicationSchema.index({ status: 1 });
applicationSchema.index({ 'applicationInfo.intendedStartSemester': 1, 'applicationInfo.intendedStartYear': 1 });
applicationSchema.index({ submittedAt: -1 });
applicationSchema.index({ createdAt: -1 });

// Virtual for full name
applicationSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Virtual for documents completion percentage
applicationSchema.virtual('documentsCompletion').get(function() {
  const documentFields = Object.keys(this.documents);
  const uploadedCount = documentFields.reduce((count, field) => {
    if (field === 'additional') {
      return count + this.documents.additional.length;
    }
    return count + (this.documents[field].uploaded ? 1 : 0);
  }, 0);
  
  const totalRequired = documentFields.length - 1 + this.documents.additional.length; // -1 for additional field
  return totalRequired > 0 ? Math.round((uploadedCount / totalRequired) * 100) : 0;
});

// Pre-save middleware to generate application ID
applicationSchema.pre('save', async function(next) {
  if (this.isNew && !this.applicationId) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.applicationId = `APP-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Pre-save middleware to update timeline
applicationSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      notes: `Status changed to ${this.status}`
    });
    
    // Set specific timestamps based on status
    if (this.status === 'submitted' && !this.submittedAt) {
      this.submittedAt = new Date();
    } else if (['approved', 'rejected', 'conditionally_approved'].includes(this.status) && !this.decisionDate) {
      this.decisionDate = new Date();
    }
  }
  next();
});

// Static method to get applications by status
applicationSchema.statics.getByStatus = function(status) {
  return this.find({ status })
    .populate('applicant', 'firstName lastName email')
    .populate('program', 'title institution.name level')
    .sort({ updatedAt: -1 });
};

// Static method to get pending applications
applicationSchema.statics.getPending = function() {
  return this.find({ 
    status: { $in: ['submitted', 'under_review', 'documents_required'] }
  })
    .populate('applicant', 'firstName lastName email')
    .populate('program', 'title institution.name level')
    .sort({ submittedAt: 1 }); // Oldest first for FIFO processing
};

// Instance method to submit application
applicationSchema.methods.submit = function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  return this.save();
};

// Instance method to approve application
applicationSchema.methods.approve = function(reviewerId, notes) {
  this.status = 'approved';
  this.decisionDate = new Date();
  this.reviewNotes.push({
    reviewer: reviewerId,
    notes: notes || 'Application approved',
    recommendation: 'approve',
    timestamp: new Date()
  });
  return this.save();
};

// Instance method to reject application
applicationSchema.methods.reject = function(reviewerId, notes) {
  this.status = 'rejected';
  this.decisionDate = new Date();
  this.reviewNotes.push({
    reviewer: reviewerId,
    notes: notes || 'Application rejected',
    recommendation: 'reject',
    timestamp: new Date()
  });
  return this.save();
};

module.exports = mongoose.model('Application', applicationSchema); 