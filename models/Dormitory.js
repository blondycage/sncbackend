const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const dormitorySchema = new mongoose.Schema({
  // Basic dormitory information
  title: {
    type: String,
    required: [true, 'Dormitory title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  // University information
  university: {
    name: {
      type: String,
      required: [true, 'University name is required'],
      trim: true
    },
    isFromDropdown: {
      type: Boolean,
      default: false
    }
  },

  // Location information
  location: {
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    region: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Availability status
  availability: {
    type: String,
    required: [true, 'Availability status is required'],
    enum: {
      values: ['available', 'running_out', 'unavailable'],
      message: '{VALUE} is not a valid availability status'
    },
    default: 'available'
  },

  // Images (max 10 via Cloudinary)
  image_urls: [{
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return typeof v === 'string' && v.length > 0;
      },
      message: 'Image URL must be a non-empty string'
    }
  }],

  // Room variants and pricing
  roomVariants: [{
    type: {
      type: String,
      required: [true, 'Room type is required'],
      enum: {
        values: ['single', 'double', 'triple', 'quad', 'five_person', 'six_person'],
        message: '{VALUE} is not a valid room type'
      }
    },
    capacity: {
      type: Number,
      required: [true, 'Room capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [6, 'Capacity cannot exceed 6']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    priceFrequency: {
      type: String,
      required: [true, 'Price frequency is required'],
      enum: {
        values: ['monthly', 'semester', 'yearly'],
        message: '{VALUE} is not a valid price frequency'
      }
    },
    available: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Room variant description cannot exceed 500 characters']
    }
  }],

  // Facilities and amenities
  facilities: [{
    type: String,
    trim: true,
    maxlength: [50, 'Facility name cannot exceed 50 characters']
  }],

  // Contact information
  contact: {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    whatsapp: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-()]+$/, 'Please enter a valid WhatsApp number']
    },
    preferredMethod: {
      type: String,
      enum: ['phone', 'email', 'whatsapp'],
      default: 'whatsapp'
    }
  },

  // Rules and policies
  rules: [{
    type: String,
    trim: true,
    maxlength: [200, 'Rule cannot exceed 200 characters']
  }],

  // Owner/Admin information
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },

  // Status and moderation
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
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

  // Reporting system
  isReported: {
    type: Boolean,
    default: false
  },
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      required: true
    },
    description: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Analytics
  views: {
    type: Number,
    default: 0
  },
  inquiries: {
    type: Number,
    default: 0
  },

  // Gender restrictions (common in dormitories)
  genderRestriction: {
    type: String,
    enum: ['male', 'female', 'mixed'],
    default: 'mixed'
  },

  // Academic year/semester availability
  academicInfo: {
    availableFrom: {
      type: Date
    },
    availableTo: {
      type: Date
    },
    acceptingSemester: [{
      type: String,
      enum: ['fall', 'spring', 'summer']
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for search and filtering
dormitorySchema.index({ 'university.name': 1, 'location.city': 1 });
dormitorySchema.index({ availability: 1, moderationStatus: 1, status: 1 });
dormitorySchema.index({ owner: 1, createdAt: -1 });
dormitorySchema.index({ title: 'text', description: 'text', 'university.name': 'text' });
dormitorySchema.index({ 'roomVariants.price': 1 });
dormitorySchema.index({ createdAt: -1 });
dormitorySchema.index({ 'location.city': 1 });

// Virtual for primary image
dormitorySchema.virtual('primaryImage').get(function() {
  return this.image_urls && this.image_urls.length > 0 ? this.image_urls[0] : null;
});

// Virtual for price range
dormitorySchema.virtual('priceRange').get(function() {
  if (!this.roomVariants || this.roomVariants.length === 0) return null;

  const prices = this.roomVariants.map(variant => variant.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    min: minPrice,
    max: maxPrice,
    currency: 'USD' // Default currency
  };
});

// Virtual for available room types
dormitorySchema.virtual('availableRoomTypes').get(function() {
  if (!this.roomVariants) return [];
  return this.roomVariants
    .filter(variant => variant.available)
    .map(variant => variant.type);
});

// Pre-save middleware to validate image URLs limit
dormitorySchema.pre('save', function(next) {
  if (this.image_urls && this.image_urls.length > 10) {
    return next(new Error('Cannot upload more than 10 images per dormitory'));
  }

  // Validate room variant capacity matches type
  if (this.roomVariants) {
    for (let variant of this.roomVariants) {
      const expectedCapacity = {
        'single': 1,
        'double': 2,
        'triple': 3,
        'quad': 4,
        'five_person': 5,
        'six_person': 6
      };

      if (expectedCapacity[variant.type] !== variant.capacity) {
        return next(new Error(`Room type ${variant.type} should have capacity ${expectedCapacity[variant.type]}`));
      }
    }
  }

  next();
});

// Instance method to increment views
dormitorySchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to increment inquiries
dormitorySchema.methods.incrementInquiries = function() {
  this.inquiries += 1;
  return this.save();
};

// Static method to search dormitories
dormitorySchema.statics.searchDormitories = function(searchQuery, filters = {}) {
  const query = {
    moderationStatus: 'approved',
    status: 'active'
  };

  // Text search
  if (searchQuery) {
    query.$text = { $search: searchQuery };
  }

  // Apply filters
  if (filters.city) {
    query['location.city'] = new RegExp(filters.city, 'i');
  }

  if (filters.university) {
    query['university.name'] = new RegExp(filters.university, 'i');
  }

  if (filters.availability) {
    query.availability = filters.availability;
  }

  if (filters.genderRestriction) {
    query.genderRestriction = filters.genderRestriction;
  }

  if (filters.roomType) {
    query['roomVariants.type'] = filters.roomType;
  }

  if (filters.minPrice !== undefined) {
    query['roomVariants.price'] = { $gte: filters.minPrice };
  }

  if (filters.maxPrice !== undefined) {
    query['roomVariants.price'] = {
      ...query['roomVariants.price'],
      $lte: filters.maxPrice
    };
  }

  return this.find(query).populate('owner', 'firstName lastName phone email');
};

// Static method to get universities list (for dropdown)
dormitorySchema.statics.getUniversitiesList = function() {
  return this.distinct('university.name', {
    moderationStatus: 'approved',
    status: 'active'
  });
};

// Static method to get cities list
dormitorySchema.statics.getCitiesList = function() {
  return this.distinct('location.city', {
    moderationStatus: 'approved',
    status: 'active'
  });
};

// Add pagination plugin
dormitorySchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Dormitory', dormitorySchema);