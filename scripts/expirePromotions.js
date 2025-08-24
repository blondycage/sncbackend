const mongoose = require('mongoose');
const Promotion = require('../models/Promotion');
require('dotenv').config();

async function expirePromotions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const now = new Date();
    const res = await Promotion.updateMany({ status: 'active', 'schedule.endAt': { $lte: now } }, { $set: { status: 'expired' } });
    console.log(`Expired ${res.modifiedCount} promotions`);
    process.exit(0);
  } catch (e) {
    console.error('Expire error', e);
    process.exit(1);
  }
}

expirePromotions();
