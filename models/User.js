const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mongoosePaginate = require('mongoose-paginate-v2');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Traditional auth fields
  username: {
    type: String,
    sparse: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    sparse: true,
    unique: true
  },
  password: {
    type: String,
    minlength: 6,
    select: false
  },
  
  // Telegram authentication fields
  telegramId: {
    type: String,
    sparse: true,
    unique: true
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  photoUrl: {
    type: String,
    trim: true
  },
  authDate: {
    type: Date
  },
  
  // User profile fields
  role: {
    type: String,
   // enum: ['user','Student', 'Local','advertiser', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Activity tracking
  lastLogin: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String,
  
  // Account management
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  confirmEmailToken: String,
  confirmEmailExpire: Date,
  
  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      telegram: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' }
  },
  
  // Profile information
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  avatar: {
    type: String, // Cloudinary URL
    default: null
  },
  
  // Location information
  location: {
    city: {
      type: String,
      trim: true
    },
    region: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Account status and verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  
  // Upload quota tracking (MVP requirement)
  uploadQuota: {
    freeUploadsUsed: {
      type: Number,
      default: 0
    },
    freeUploadsLimit: {
      type: Number,
      default: 3 // MVP: 3 free uploads per month
    },
    lastQuotaReset: {
      type: Date,
      default: Date.now
    },
    paidUploadsRemaining: {
      type: Number,
      default: 0
    }
  },
  
  // Subscription and payments
  subscription: {
    type: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
    },
    expiresAt: Date,
    stripeCustomerId: String
  },
  
  // Admin fields
  isAdmin: {
    type: Boolean,
    default: false
  },
  adminRole: {
    type: String,
    enum: ['super', 'moderator'],
    default: null
  },
  
  // Security fields
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Metadata
  createdAt: Date,
  updatedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.username || 'Unknown User';
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  if (this.firstName) {
    return this.firstName;
  }
  return this.username || `User${this.telegramId}`;
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for checking if user can upload
userSchema.virtual('canUpload').get(function() {
  const now = new Date();
  const lastReset = new Date(this.uploadQuota.lastQuotaReset);
  const monthsPassed = (now.getFullYear() - lastReset.getFullYear()) * 12 + (now.getMonth() - lastReset.getMonth());
  
  // Reset quota if a month has passed
  if (monthsPassed >= 1) {
    return true;
  }
  
  return this.uploadQuota.freeUploadsUsed < this.uploadQuota.freeUploadsLimit || this.uploadQuota.paidUploadsRemaining > 0;
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Pre-save middleware to validate email uniqueness
userSchema.pre('save', async function(next) {
  // Only check email uniqueness if email is provided and modified
  if (this.email && this.isModified('email')) {
    const existingUser = await this.constructor.findOne({ 
      email: this.email, 
      _id: { $ne: this._id } 
    });
    
    if (existingUser) {
      const error = new Error('Email address is already registered');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

// Pre-save middleware to reset quota monthly
userSchema.pre('save', function(next) {
  const now = new Date();
  const lastReset = new Date(this.uploadQuota.lastQuotaReset);
  const monthsPassed = (now.getFullYear() - lastReset.getFullYear()) * 12 + (now.getMonth() - lastReset.getMonth());
  
  if (monthsPassed >= 1) {
    this.uploadQuota.freeUploadsUsed = 0;
    this.uploadQuota.lastQuotaReset = now;
  }
  
  next();
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      telegramId: this.telegramId,
      username: this.username,
      role: this.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Generate email confirm token
userSchema.methods.getConfirmEmailToken = function() {
  // Generate token
  const confirmToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to confirmEmailToken field
  this.confirmEmailToken = crypto
    .createHash('sha256')
    .update(confirmToken)
    .digest('hex');

  // Set expire
  this.confirmEmailExpire = Date.now() + 24 * 60 * 60 * 1000;

  return confirmToken;
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If this is the 5th attempt and we're not locked yet, lock the account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Instance method to use upload quota
userSchema.methods.useUploadQuota = function(isPaid = false) {
  if (isPaid && this.uploadQuota.paidUploadsRemaining > 0) {
    this.uploadQuota.paidUploadsRemaining -= 1;
  } else if (!isPaid && this.uploadQuota.freeUploadsUsed < this.uploadQuota.freeUploadsLimit) {
    this.uploadQuota.freeUploadsUsed += 1;
  } else {
    throw new Error('Upload quota exceeded');
  }
  
  return this.save();
};

// Static method to find user by telegram ID
userSchema.statics.findByTelegramId = function(telegramId) {
  return this.findOne({ telegramId });
};

// Static method to find user by email or username
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier },
      { username: identifier }
    ]
  });
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function(ipAddress, userAgent) {
  this.lastLogin = new Date();
  if (ipAddress) this.ipAddress = ipAddress;
  if (userAgent) this.userAgent = userAgent;
  return this.save();
};

// Instance method to get safe user data (without sensitive fields)
userSchema.methods.getSafeUserData = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    telegramId: this.telegramId,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    displayName: this.displayName,
    photoUrl: this.photoUrl,
    role: this.role,
    isActive: this.isActive,
    isVerified: this.isVerified,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    preferences: this.preferences
  };
};

// Add pagination plugin
userSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('User', userSchema); 