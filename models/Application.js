const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    unique: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EducationalProgram',
    required: true
  },
  personalInfo: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true
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
    passportNumber: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      email: String
    }
  },
  familyInfo: {
    fatherName: {
      type: String,
      required: [true, 'Father name is required'],
      trim: true
    },
    motherName: {
      type: String,
      required: [true, 'Mother name is required'],
      trim: true
    },
    fatherOccupation: {
      type: String,
      trim: true
    },
    motherOccupation: {
      type: String,
      trim: true
    },
    familyIncome: {
      type: String,
      enum: ['below_25000', '25000_50000', '50000_75000', '75000_100000', 'above_100000', 'prefer_not_to_say'],
      required: false
    }
  },
  academicBackground: {
    highSchool: {
      name: {
        type: String,
        required: [true, 'High school name is required'],
        trim: true
      },
      city: String,
      country: String,
      graduationYear: {
        type: Number,
        required: [true, 'Graduation year is required'],
        min: 1950,
        max: new Date().getFullYear() + 1
      },
      gpa: {
        type: Number,
        min: 0,
        max: 100
      },
      gradeScale: {
        type: String,
        enum: ['percentage', '4.0', '5.0', 'other']
      }
    },
    previousEducation: [{
      institution: String,
      degree: String,
      field: String,
      graduationYear: Number,
      gpa: Number,
      gradeScale: String
    }],
    standardizedTests: {
      sat: {
        score: Number,
        date: Date
      },
      act: {
        score: Number,
        date: Date
      },
      toefl: {
        score: Number,
        date: Date
      },
      ielts: {
        score: Number,
        date: Date
      },
      other: [{
        testName: String,
        score: String,
        date: Date
      }]
    }
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
      min: new Date().getFullYear()
    },
    motivation: {
      type: String,
      required: [true, 'Motivation statement is required'],
      maxlength: [2000, 'Motivation statement cannot exceed 2000 characters']
    },
    careerGoals: {
      type: String,
      maxlength: [1000, 'Career goals cannot exceed 1000 characters']
    },
    whyThisProgram: {
      type: String,
      maxlength: [1000, 'Why this program cannot exceed 1000 characters']
    },
    extracurricularActivities: {
      type: String,
      maxlength: [1000, 'Extracurricular activities cannot exceed 1000 characters']
    },
    workExperience: [{
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
      description: String,
      isCurrent: Boolean
    }],
    volunteerExperience: [{
      organization: String,
      role: String,
      startDate: Date,
      endDate: Date,
      description: String
    }],
    awards: [{
      title: String,
      organization: String,
      date: Date,
      description: String
    }],
    references: [{
      name: String,
      title: String,
      organization: String,
      email: String,
      phone: String,
      relationship: String
    }]
  },
  documents: {
    passportDatapage: {
      uploaded: { type: Boolean, default: false },
      url: String,
      cloudinaryId: String,
      verified: { type: Boolean, default: false }
    },
    passportPhotograph: {
      uploaded: { type: Boolean, default: false },
      url: String,
      cloudinaryId: String,
      verified: { type: Boolean, default: false }
    },
    waecNecoResults: {
      uploaded: { type: Boolean, default: false },
      url: String,
      cloudinaryId: String,
      verified: { type: Boolean, default: false }
    },
    bachelorTranscript: {
      uploaded: { type: Boolean, default: false },
      url: String,
      cloudinaryId: String,
      verified: { type: Boolean, default: false }
    },
    bachelorDiploma: {
      uploaded: { type: Boolean, default: false },
      url: String,
      cloudinaryId: String,
      verified: { type: Boolean, default: false }
    },
    masterTranscript: {
      uploaded: { type: Boolean, default: false },
      url: String,
      cloudinaryId: String,
      verified: { type: Boolean, default: false }
    },
    masterDiploma: {
      uploaded: { type: Boolean, default: false },
      url: String,
      cloudinaryId: String,
      verified: { type: Boolean, default: false }
    },
    cv: {
      uploaded: { type: Boolean, default: false },
      url: String,
      cloudinaryId: String,
      verified: { type: Boolean, default: false }
    },
    researchProposal: {
      uploaded: { type: Boolean, default: false },
      url: String,
      cloudinaryId: String,
      verified: { type: Boolean, default: false }
    },
    englishProficiency: {
      uploaded: { type: Boolean, default: false },
      url: String,
      cloudinaryId: String,
      verified: { type: Boolean, default: false }
    },
    additional: [{
      name: String,
      url: String,
      cloudinaryId: String,
      uploaded: { type: Boolean, default: false },
      verified: { type: Boolean, default: false }
    }]
  },
  status: {
    type: String,
    enum: [
      'draft', 'submitted', 'under_review', 'documents_required',
      'approved', 'conditionally_approved', 'rejected', 'withdrawn',
      'enrolled', 'deferred'
    ],
    default: 'draft'
  },
  timeline: [{
    status: String,
    date: { type: Date, default: Date.now },
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  reviewNotes: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    recommendation: {
      type: String,
      enum: ['approve', 'reject', 'conditionally_approve', 'request_documents']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  admissionDecision: {
    decision: {
      type: String,
      enum: ['accepted', 'rejected', 'waitlisted', 'conditional']
    },
    conditions: [String],
    scholarshipOffered: {
      type: Boolean,
      default: false
    },
    scholarshipAmount: Number,
    scholarshipType: String,
    decisionDate: Date,
    responseDeadline: Date,
    decisionLetter: String
  },
  submittedAt: Date,
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
ApplicationSchema.index({ applicant: 1 });
ApplicationSchema.index({ program: 1 });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ createdAt: -1 });
ApplicationSchema.index({ submittedAt: -1 });
ApplicationSchema.index({ applicationId: 1 });

// Pre-save middleware to generate application ID
ApplicationSchema.pre('save', function(next) {
  if (this.isNew && !this.applicationId) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.applicationId = `APP${year}${random}`;
  }
  
  this.lastModified = new Date();
  next();
});

// Instance method to submit application
ApplicationSchema.methods.submit = function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  this.timeline.push({
    status: 'submitted',
    date: new Date(),
    notes: 'Application submitted by applicant'
  });
  return this.save();
};

// Instance method to update status with timeline
ApplicationSchema.methods.updateStatus = function(newStatus, notes, updatedBy) {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    date: new Date(),
    notes: notes || `Status changed to ${newStatus}`,
    updatedBy: updatedBy
  });
  return this.save();
};

// Virtual for full name
ApplicationSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Virtual for application progress
ApplicationSchema.virtual('progress').get(function() {
  const totalSteps = 5; // personal info, family info, academic background, application info, documents
  let completedSteps = 0;
  
  if (this.personalInfo && this.personalInfo.firstName && this.personalInfo.lastName && this.personalInfo.email) {
    completedSteps++;
  }
  if (this.familyInfo && this.familyInfo.fatherName && this.familyInfo.motherName) {
    completedSteps++;
  }
  if (this.academicBackground && this.academicBackground.highSchool && this.academicBackground.highSchool.name) {
    completedSteps++;
  }
  if (this.applicationInfo && this.applicationInfo.motivation) {
    completedSteps++;
  }
  
  // Check if at least 3 required documents are uploaded
  const requiredDocs = ['passport', 'highSchoolDiploma', 'transcripts'];
  const uploadedRequiredDocs = requiredDocs.filter(doc => this.documents[doc] && this.documents[doc].uploaded);
  if (uploadedRequiredDocs.length >= 3) {
    completedSteps++;
  }
  
  return Math.round((completedSteps / totalSteps) * 100);
});

// Ensure virtual fields are serialized
ApplicationSchema.set('toJSON', { virtuals: true });
ApplicationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Application', ApplicationSchema);