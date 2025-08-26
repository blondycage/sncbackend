const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  itemType: {
    type: String,
    enum: ['promotion', 'listing', 'property', 'education_application', 'featured_listing'],
    required: true,
    index: true,
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  // Reference to the specific item (promotion, listing, etc.)
  refModel: {
    type: String,
    required: true,
    enum: ['Promotion', 'Listing', 'EducationalProgram', 'Application']
  },
  paymentType: {
    type: String,
    enum: ['promotion_fee', 'listing_fee', 'featured_listing', 'application_fee', 'premium_placement'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'under_review', 'verified', 'rejected', 'refunded'],
    default: 'pending',
    index: true,
  },
  pricing: {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    chain: { type: String, enum: ['btc', 'eth', 'usdt_erc20', 'usdt_trc20', 'other'], required: true },
    description: { type: String }, // e.g., "Homepage promotion for 7 days"
  },
  payment: {
    walletAddress: { type: String, required: true },
    txHash: { type: String },
    screenshotUrl: { type: String },
    verifiedAt: { type: Date },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blockchainConfirmed: { type: Boolean, default: false },
    confirmationBlocks: { type: Number, default: 0 },
  },
  metadata: {
    // Additional data specific to payment type
    duration: { type: Number }, // For time-based services like promotions
    placement: { type: String }, // For promotions: 'homepage', 'category_top'
    features: [String], // For listing features: ['featured', 'urgent', 'highlighted']
    validUntil: { type: Date }, // For time-limited payments
  },
  timeline: [{
    status: String,
    date: { type: Date, default: Date.now },
    notes: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  refundInfo: {
    reason: String,
    refundedAt: Date,
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    refundTxHash: String,
  }
}, {
  timestamps: true,
});

// Indexes for efficient queries
PaymentSchema.index({ user: 1, status: 1 });
PaymentSchema.index({ itemType: 1, itemId: 1 });
PaymentSchema.index({ paymentType: 1, status: 1 });
PaymentSchema.index({ 'payment.txHash': 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ paymentId: 1 });

// Pre-save middleware to generate payment ID
PaymentSchema.pre('save', function(next) {
  if (this.isNew && !this.paymentId) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    this.paymentId = `PAY${year}${random}`;
  }
  next();
});

// Instance method to update status with timeline
PaymentSchema.methods.updateStatus = function(newStatus, notes, updatedBy) {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    date: new Date(),
    notes: notes || `Status changed to ${newStatus}`,
    updatedBy: updatedBy
  });
  return this.save();
};

// Instance method to verify payment
PaymentSchema.methods.verifyPayment = function(reviewerId, txHash, screenshotUrl) {
  this.status = 'verified';
  this.payment.verifiedAt = new Date();
  this.payment.reviewer = reviewerId;
  if (txHash) this.payment.txHash = txHash;
  if (screenshotUrl) this.payment.screenshotUrl = screenshotUrl;
  
  this.timeline.push({
    status: 'verified',
    date: new Date(),
    notes: 'Payment verified by admin',
    updatedBy: reviewerId
  });
  
  return this.save();
};

// Instance method to reject payment
PaymentSchema.methods.rejectPayment = function(reviewerId, reason) {
  this.status = 'rejected';
  this.timeline.push({
    status: 'rejected',
    date: new Date(),
    notes: reason || 'Payment rejected',
    updatedBy: reviewerId
  });
  
  return this.save();
};

// Static method to get payments by type
PaymentSchema.statics.getPaymentsByType = function(paymentType, status = null) {
  const query = { paymentType };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('user', 'firstName lastName email username')
    .populate('payment.reviewer', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get user payments
PaymentSchema.statics.getUserPayments = function(userId, status = null) {
  const query = { user: userId };
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 });
};

// Virtual for payment reference
PaymentSchema.virtual('itemReference', {
  ref: function() { return this.refModel; },
  localField: 'itemId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
PaymentSchema.set('toJSON', { virtuals: true });
PaymentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Payment', PaymentSchema);