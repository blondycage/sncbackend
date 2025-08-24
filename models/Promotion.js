const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
    index: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  placement: {
    type: String,
    enum: ['homepage', 'category_top'],
    required: true,
    index: true,
  },
  listingCategory: {
    type: String,
    enum: ['rental', 'sale', 'service'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['awaiting_payment', 'submitted', 'under_review', 'active', 'expired', 'rejected', 'cancelled'],
    default: 'awaiting_payment',
    index: true,
  },
  pricing: {
    placement: { type: String, enum: ['homepage', 'category_top'], required: true },
    durationDays: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    chain: { type: String, enum: ['btc', 'eth', 'usdt_erc20', 'usdt_trc20', 'other'], required: true },
  },
  payment: {
    walletAddress: { type: String },
    txHash: { type: String },
    screenshotUrl: { type: String },
    verifiedAt: { type: Date },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  schedule: {
    startAt: { type: Date },
    endAt: { type: Date, index: true },
  },
  metrics: {
    clicks: { type: Number, default: 0 },
    lastClickAt: { type: Date },
  },
}, {
  timestamps: true,
});

PromotionSchema.index({ placement: 1, status: 1, 'schedule.startAt': 1, 'schedule.endAt': 1 });
PromotionSchema.index({ placement: 1, listing: 1, status: 1 }, { unique: false });

// Helper to check active status by time and status
PromotionSchema.virtual('isCurrentlyActive').get(function () {
  const now = new Date();
  if (this.status !== 'active') return false;
  if (!this.schedule?.startAt || !this.schedule?.endAt) return false;
  return this.schedule.startAt <= now && this.schedule.endAt > now;
});

module.exports = mongoose.model('Promotion', PromotionSchema);
