const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Promotion = require('../models/Promotion');
const PromotionConfig = require('../models/PromotionConfig');
require('dotenv').config();

async function seedPromotions() {
  try {
    await mongoose.connect("mongodb+srv://yakson500:ouUZk1W29tDYenor@cluster0.wbprcly.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) throw new Error('Admin user not found. Seed users/listings first.');

    const listings = await Listing.find({ moderationStatus: 'approved', status: 'active' }).limit(6);
    if (listings.length === 0) throw new Error('No approved listings found');

    // Seed default config
    let cfg = await PromotionConfig.findOne();
    if (!cfg) {
      cfg = await PromotionConfig.create({
        prices: {
          homepage: [ { days: 7, amount: 50, currency: 'USD' }, { days: 30, amount: 150, currency: 'USD' } ],
          category_top: [ { days: 7, amount: 20, currency: 'USD' }, { days: 30, amount: 60, currency: 'USD' } ]
        },
        wallets: { btc: 'bc1qexamplebtcaddr', eth: '0xExampleEthAddress', usdt_erc20: '0xExampleERC20', usdt_trc20: 'TExampleTRC20' },
        limits: { homepageMaxSlots: 5 },
        settings: { rotation: 'recent' }
      });
      console.log('Seeded PromotionConfig');
    }

    await Promotion.deleteMany({});

    const now = new Date();
    const activeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const docs = [];
    // Create 3 homepage promos and 3 category_top promos
    for (let i = 0; i < Math.min(3, listings.length); i++) {
      const l = listings[i];
      docs.push({
        listing: l._id,
        owner: admin._id,
        placement: 'homepage',
        listingCategory: l.category,
        status: 'active',
        pricing: { placement: 'homepage', durationDays: 7, amount: 50, currency: 'USD', chain: 'btc' },
        payment: { walletAddress: cfg.wallets.btc, verifiedAt: now, reviewer: admin._id },
        schedule: { startAt: now, endAt: activeEnd },
        metrics: { clicks: Math.floor(Math.random() * 20) }
      });
    }

    for (let i = 0; i < Math.min(3, listings.length); i++) {
      const l = listings[(i + 3) % listings.length];
      docs.push({
        listing: l._id,
        owner: admin._id,
        placement: 'category_top',
        listingCategory: l.category,
        status: 'active',
        pricing: { placement: 'category_top', durationDays: 7, amount: 20, currency: 'USD', chain: 'eth' },
        payment: { walletAddress: cfg.wallets.eth, verifiedAt: now, reviewer: admin._id },
        schedule: { startAt: now, endAt: activeEnd },
        metrics: { clicks: Math.floor(Math.random() * 20) }
      });
    }

    await Promotion.insertMany(docs);
    console.log(`Inserted ${docs.length} promotions`);

    console.log('Promotion seed complete');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedPromotions();
