const mongoose = require('mongoose');

const PriceOptionSchema = new mongoose.Schema({
  days: { type: Number, required: true, min: 1 },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
}, { _id: false });

const PromotionConfigSchema = new mongoose.Schema({
  prices: {
    homepage: { type: [PriceOptionSchema], default: [] },
    category_top: { type: [PriceOptionSchema], default: [] },
  },
  wallets: {
    btc: { type: String, default: '' },
    eth: { type: String, default: '' },
    usdt_erc20: { type: String, default: '' },
    usdt_trc20: { type: String, default: '' },
  },
  limits: {
    homepageMaxSlots: { type: Number, default: 10 },
  },
  settings: {
    rotation: { type: String, enum: ['recent', 'random'], default: 'recent' },
  },
}, { timestamps: true });

module.exports = mongoose.model('PromotionConfig', PromotionConfigSchema);
