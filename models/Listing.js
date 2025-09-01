const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const listingSchema = new mongoose.Schema({
  // Basic listing information
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
    validate: {
      validator: function(v) {
        console.log('🔍 TITLE VALIDATION:', {
          value: v,
          type: typeof v,
          length: v ? v.length : 0,
          trimmed: v ? v.trim() : '',
          trimmedLength: v ? v.trim().length : 0
        });
        return v && v.trim().length >= 5 && v.trim().length <= 100;
      },
      message: 'Title validation failed in custom validator'
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    validate: {
      validator: function(v) {
        console.log('🔍 DESCRIPTION VALIDATION:', {
          value: v ? v.substring(0, 50) + '...' : v,
          type: typeof v,
          length: v ? v.length : 0,
          trimmed: v ? v.trim().substring(0, 50) + '...' : '',
          trimmedLength: v ? v.trim().length : 0
        });
        return v && v.trim().length >= 10 && v.trim().length <= 2000;
      },
      message: 'Description validation failed in custom validator'
    }
  },
  
  // Listing type - main categories
  listingType: {
    type: String,
    required: [true, 'Listing type is required'],
    enum: {
      values: ['real_estate', 'vehicle', 'other'],
      message: '{VALUE} is not a valid listing type'
    },
    validate: {
      validator: function(v) {
        console.log('🔍 LISTING TYPE VALIDATION:', {
          value: v,
          type: typeof v,
          isValid: ['real_estate', 'vehicle', 'other'].includes(v)
        });
        return ['real_estate', 'vehicle', 'other'].includes(v);
      },
      message: 'Listing type validation failed in custom validator'
    }
  },
  
  // Category - sub-categories based on listing type
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['rental', 'sale', 'service'],
      message: '{VALUE} is not a valid category'
    },
    validate: {
      validator: function(v) {
        console.log('🔍 CATEGORY VALIDATION:', {
          value: v,
          type: typeof v,
          isValid: ['rental', 'sale', 'service'].includes(v)
        });
        return ['rental', 'sale', 'service'].includes(v);
      },
      message: 'Category validation failed in custom validator'
    }
  },

  // Tags for searchability
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Tag cannot exceed 30 characters'],
    validate: {
      validator: function(v) {
        // Only allow alphanumeric characters, spaces, and hyphens
        return /^[a-zA-Z0-9\s\-]+$/.test(v);
      },
      message: 'Tags can only contain letters, numbers, spaces, and hyphens'
    }
  }],
  
  // Pricing
  price: {
      type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(v) {
        console.log('🔍 PRICE VALIDATION:', {
          value: v,
          type: typeof v,
          isNumber: typeof v === 'number',
          isPositive: v >= 0,
          isValid: typeof v === 'number' && v >= 0
        });
        return typeof v === 'number' && v >= 0;
      },
      message: 'Price validation failed in custom validator'
    }
  },
  
  // Pricing frequency based on category
  pricing_frequency: {
      type: String,
    required: [true, 'Pricing frequency is required'],
    enum: {
      values: ['hourly', 'daily', 'weekly', 'monthly', 'fixed',"negotiable","free","yearly"],
      message: '{VALUE} is not a valid pricing frequency'
    },
    validate: {
      validator: function(value) {
        console.log('🔍 PRICING FREQUENCY VALIDATION:', {
          value: value,
          type: typeof value,
          category: this.category,
          allValidValues: ['hourly', 'daily', 'weekly', 'monthly', 'fixed',"negotiable","free","yearly"]
        });
        
        // Validate pricing frequency based on category
        if (this.category === 'rental') {
          const valid = ['daily', 'weekly', 'monthly',"yearly","negotiable"].includes(value);
          console.log('🔍 RENTAL PRICING VALIDATION:', {
            value: value,
            validOptions: ['daily', 'weekly', 'monthly',"yearly","negotiable"],
            isValid: valid
          });
          return valid;
        } else if (this.category === 'service') {
          const valid = ['hourly', 'daily', 'fixed',"negotiable","free","yearly"].includes(value);
          console.log('🔍 SERVICE PRICING VALIDATION:', {
            value: value,
            validOptions: ['hourly', 'daily', 'fixed',"negotiable","free","yearly"],
            isValid: valid
          });
          return valid;
        } else if (this.category === 'sale') {
          const valid = value === 'fixed' || value === 'negotiable' ;
          console.log('🔍 SALE PRICING VALIDATION:', {
            value: value,
            validOptions: ['fixed',"negotiable"],
            isValid: valid
          });
          return valid;
        }
        console.log('🔍 PRICING FREQUENCY - NO CATEGORY MATCH:', {
          category: this.category,
          value: value
        });
        return false;
      },
      message: 'Invalid pricing frequency for the selected category'
    }
  },
  
  // Image URLs
  image_urls: [{
      type: String,
    required: true,
    validate: {
      validator: function(v) {
        console.log('🔍 IMAGE URL VALIDATION:', {
          value: v,
          type: typeof v,
          isString: typeof v === 'string',
          length: v ? v.length : 0
        });
        return typeof v === 'string' && v.length > 0;
      },
      message: 'Image URL must be a non-empty string'
    }
  }],

  // Optional YouTube video URL
  video_url: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        try {
          const url = new URL(v);
          return typeof v === 'string' && v.length > 0 && /^https?:$/.test(url.protocol);
        } catch {
          return false;
        }
      },
      message: 'Video URL must be a valid URL'
    }
  },
  
  // Automatically set fields
  is_paid: {
    type: Boolean,
    default: false
  },
  
  // Owner information
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  
  // Status and moderation
  status: {
    type: String,
    enum: ['active', 'inactive', 'sold', 'rented'],
    default: 'active'
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
    type: String
  },
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
  
  // Contact information (optional - can use owner's contact)
  contact: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    preferredMethod: {
      type: String,
      enum: ['phone', 'email', 'telegram'],
      default: 'phone'
    }
  },
  
  // Location (optional but recommended)
  location: {
    city: {
      type: String,
      trim: true
    },
    region: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }
  }
}, {
  timestamps: true, // This adds created_at and updated_at
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for search and filtering
listingSchema.index({ category: 1, moderationStatus: 1, status: 1 });
listingSchema.index({ owner: 1, createdAt: -1 });
listingSchema.index({ title: 'text', description: 'text' });
listingSchema.index({ price: 1 });
listingSchema.index({ createdAt: -1 });
listingSchema.index({ expiresAt: 1 });

// Virtual for checking if listing is expired
listingSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Virtual for primary image (first image)
listingSchema.virtual('primaryImage').get(function() {
  return this.image_urls && this.image_urls.length > 0 ? this.image_urls[0] : null;
});

// Pre-save middleware to validate pricing frequency
listingSchema.pre('save', function(next) {
  console.log('🚀 PRE-SAVE MIDDLEWARE STARTED');
  console.log('📋 FULL DOCUMENT DATA:', {
    title: this.title,
    description: this.description ? this.description.substring(0, 50) + '...' : this.description,
    category: this.category,
    price: this.price,
    pricing_frequency: this.pricing_frequency,
    image_urls: this.image_urls,
    contact: this.contact,
    location: this.location,
    owner: this.owner
  });
  
  // Additional validation for pricing frequency
  const validFrequencies = {
    'rental': ['daily', 'weekly', 'monthly',"yearly","negotiable"],
    'service': ['hourly', 'daily', 'fixed',"negotiable","free","yearly"],
    'sale': ['fixed',"negotiable","free"]
  };
  
  console.log('🔍 PRE-SAVE PRICING VALIDATION:', {
    category: this.category,
    pricing_frequency: this.pricing_frequency,
    validForCategory: validFrequencies[this.category],
    isValid: validFrequencies[this.category]?.includes(this.pricing_frequency)
  });
  
  if (!validFrequencies[this.category]?.includes(this.pricing_frequency)) {
    console.log('❌ PRE-SAVE VALIDATION FAILED:', {
      error: `Invalid pricing frequency '${this.pricing_frequency}' for category '${this.category}'`,
      validOptions: validFrequencies[this.category]
    });
    return next(new Error(`Invalid pricing frequency '${this.pricing_frequency}' for category '${this.category}'`));
  }
  
  console.log('✅ PRE-SAVE VALIDATION PASSED');
  next();
});

// Add validation debugging middleware
listingSchema.pre('validate', function(next) {
  console.log('🔍 PRE-VALIDATE MIDDLEWARE STARTED');
  console.log('📋 DOCUMENT BEFORE VALIDATION:', {
    title: this.title,
    titleLength: this.title ? this.title.length : 0,
    description: this.description ? this.description.substring(0, 50) + '...' : this.description,
    descriptionLength: this.description ? this.description.length : 0,
    category: this.category,
    price: this.price,
    priceType: typeof this.price,
    pricing_frequency: this.pricing_frequency,
    image_urls: this.image_urls,
    imageUrlsLength: this.image_urls ? this.image_urls.length : 0,
    contact: this.contact,
    location: this.location,
    owner: this.owner
  });
  next();
});

// Post-validate middleware to catch validation errors
listingSchema.post('validate', function(error, doc, next) {
  if (error) {
    console.log('❌ VALIDATION ERROR CAUGHT:', {
      name: error.name,
      message: error.message,
      errors: error.errors,
      stack: error.stack
    });
    
    // Log individual field errors
    if (error.errors) {
      Object.keys(error.errors).forEach(field => {
        console.log(`❌ FIELD ERROR [${field}]:`, {
          message: error.errors[field].message,
          value: error.errors[field].value,
          kind: error.errors[field].kind,
          path: error.errors[field].path
        });
      });
    }
  } else {
    console.log('✅ VALIDATION PASSED SUCCESSFULLY');
  }
  next(error);
});

// Instance method to increment views
listingSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static method to find by category
listingSchema.statics.findByCategory = function(category, filters = {}) {
  const query = {
    category,
    moderationStatus: 'approved',
    status: 'active',
    expiresAt: { $gt: new Date() },
    ...filters
  };
  
  return this.find(query).populate('owner', 'username firstName lastName');
};

// Static method to search listings
listingSchema.statics.searchListings = function(searchQuery, filters = {}) {
  const query = {
    moderationStatus: 'approved',
    status: 'active',
    expiresAt: { $gt: new Date() }
  };
  
  // Text search
  if (searchQuery) {
    query.$text = { $search: searchQuery };
  }
  
  // Apply filters
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.minPrice !== undefined) {
    query.price = { ...query.price, $gte: filters.minPrice };
  }
  
  if (filters.maxPrice !== undefined) {
    query.price = { ...query.price, $lte: filters.maxPrice };
  }
  
  if (filters.pricing_frequency) {
    query.pricing_frequency = filters.pricing_frequency;
  }
  
  return this.find(query).populate('owner', 'username firstName lastName');
};

// Add pagination plugin
listingSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Listing', listingSchema); 