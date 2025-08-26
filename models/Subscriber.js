const mongoose = require('mongoose');

const SubscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed', 'bounced'],
    default: 'active',
    index: true
  },
  source: {
    type: String,
    enum: ['homepage', 'search_page', 'listing_page', 'manual'],
    default: 'homepage'
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  unsubscribedAt: {
    type: Date
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    location: {
      city: String,
      country: String
    }
  },
  preferences: {
    newsletter: { type: Boolean, default: true },
    updates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
SubscriberSchema.index({ email: 1 });
SubscriberSchema.index({ status: 1, subscribedAt: -1 });
SubscriberSchema.index({ createdAt: -1 });

// Virtual for days since subscription
SubscriberSchema.virtual('daysSinceSubscription').get(function() {
  const now = new Date();
  const subscribed = this.subscribedAt;
  const diffTime = Math.abs(now - subscribed);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to unsubscribe
SubscriberSchema.methods.unsubscribe = function(reason = 'user_request') {
  this.status = 'unsubscribed';
  this.unsubscribedAt = new Date();
  this.metadata = this.metadata || {};
  this.metadata.unsubscribeReason = reason;
  return this.save();
};

// Instance method to resubscribe
SubscriberSchema.methods.resubscribe = function() {
  this.status = 'active';
  this.unsubscribedAt = undefined;
  this.metadata = this.metadata || {};
  this.metadata.unsubscribeReason = undefined;
  return this.save();
};

// Static method to get subscription stats
SubscriberSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const total = await this.countDocuments();
  const thisMonth = await this.countDocuments({
    subscribedAt: {
      $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    }
  });

  const result = {
    total,
    thisMonth,
    active: 0,
    unsubscribed: 0,
    bounced: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
  });

  return result;
};

// Static method to get recent subscribers
SubscriberSchema.statics.getRecent = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ subscribedAt: -1 })
    .limit(limit)
    .select('email subscribedAt source');
};

// Pre-save middleware to update timestamps
SubscriberSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'unsubscribed' && !this.unsubscribedAt) {
    this.unsubscribedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Subscriber', SubscriberSchema);