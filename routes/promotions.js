const express = require('express');
const { body, query, validationResult } = require('express-validator');
const QRCode = require('qrcode');
const router = express.Router();

const Promotion = require('../models/Promotion');
const PromotionConfig = require('../models/PromotionConfig');
const Listing = require('../models/Listing');
const { protect, adminOnly, createRateLimit } = require('../middleware/auth');
const { asyncHandler, validationError, notFoundError, authorizationError } = require('../middleware/errorHandler');
const { sendPromotionApprovedEmail, sendPromotionRejectedEmail } = require('../services/emailService');

// Utils
async function getConfigOrDefault() {
  let cfg = await PromotionConfig.findOne();
  if (!cfg) {
    cfg = await PromotionConfig.create({
      prices: {
        homepage: [{ days: 7, amount: 50, currency: 'USD' }, { days: 30, amount: 150, currency: 'USD' }],
        category_top: [{ days: 7, amount: 20, currency: 'USD' }, { days: 30, amount: 60, currency: 'USD' }],
      },
      wallets: { btc: '', eth: '', usdt_erc20: '', usdt_trc20: '' },
      limits: { homepageMaxSlots: 10 },
      settings: { rotation: 'recent' },
    });
  }
  return cfg;
}

function computePrice(cfg, placement, durationDays) {
  const options = cfg.prices?.[placement] || [];
  const match = options.find(p => p.days === durationDays);
  if (!match) throw new Error('No pricing for selected duration');
  return { amount: match.amount, currency: match.currency };
}

// @route POST /api/promotions
// Create promotion request
router.post('/', [
  protect,
  body('listingId').isMongoId(),
  body('placement').isIn(['homepage', 'category_top']),
  body('durationDays').isInt({ min: 1 }),
  body('chain').isIn(['btc', 'eth', 'usdt_erc20', 'usdt_trc20', 'bitcoin', 'ethereum', 'other'])
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(validationError(errors.array().map(e => e.msg).join(', ')));

  const { listingId, placement, durationDays, chain } = req.body;
  const listing = await Listing.findById(listingId);
  if (!listing) return next(notFoundError('Listing not found'));
  if (listing.owner.toString() !== req.user._id.toString()) return next(authorizationError('Not your listing'));
  if (listing.moderationStatus !== 'approved' || listing.status !== 'active') return next(validationError('Listing must be approved and active'));

  // Map display chain names to internal wallet keys
  const chainToWalletKey = {
    'bitcoin': 'btc',
    'btc': 'btc',
    'ethereum': 'eth', 
    'eth': 'eth',
    'usdt_erc20': 'usdt_erc20',
    'usdt_trc20': 'usdt_trc20',
    'other': 'other'
  };

  // Prevent duplicate active/pending for same placement
  const existing = await Promotion.findOne({ listing: listing._id, placement, status: { $in: ['awaiting_payment','submitted','under_review','active'] } });
  if (existing) {
    // Return the existing promotion instead of an error
    const cfg = await getConfigOrDefault();
    const walletKey = chainToWalletKey[chain] || chain;
    const walletAddress = cfg.wallets?.[walletKey] || '';
    
    let qrDataUrl = '';
    try { qrDataUrl = await QRCode.toDataURL(walletAddress || ''); } catch {}
    
    return res.status(200).json({
      success: true,
      existingPromotion: true,
      message: 'You have an existing promotion for this placement. Continue with the payment process.',
      data: { 
        promotion: existing, 
        payment: { 
          walletAddress, 
          amount: existing.pricing.amount, 
          currency: existing.pricing.currency, 
          chain: existing.pricing.chain, 
          qrDataUrl 
        } 
      }
    });
  }

  const cfg = await getConfigOrDefault();
  const { amount, currency } = computePrice(cfg, placement, parseInt(durationDays));
  
  const walletKey = chainToWalletKey[chain] || chain;
  const walletAddress = cfg.wallets?.[walletKey] || '';

  const promo = await Promotion.create({
    listing: listing._id,
    owner: req.user._id,
    placement,
    listingCategory: listing.category,
    pricing: { placement, durationDays: parseInt(durationDays), amount, currency, chain: walletKey },
    payment: { walletAddress },
    status: 'awaiting_payment',
  });

  // Generate QR data (text payload is just the address; amount not used to avoid chain variations)
  let qrDataUrl = '';
  try { qrDataUrl = await QRCode.toDataURL(walletAddress || ''); } catch {}

  res.status(201).json({
    success: true,
    data: { promotion: promo, payment: { walletAddress, amount, currency, chain, qrDataUrl } }
  });
}));

// @route PUT /api/promotions/:id/payment-proof
router.put('/:id/payment-proof', [
  protect,
  body('txHash').trim().isLength({ min: 6 }),
  body('screenshotUrl').isURL()
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(validationError(errors.array().map(e => e.msg).join(', ')));

  const promo = await Promotion.findById(req.params.id).populate('listing');
  if (!promo) return next(notFoundError('Promotion not found'));
  if (promo.owner.toString() !== req.user._id.toString()) return next(authorizationError('Not allowed'));
  if (!['awaiting_payment','submitted','under_review','rejected'].includes(promo.status)) return next(validationError('Cannot submit payment proof at this status'));

  promo.payment.txHash = req.body.txHash;
  promo.payment.screenshotUrl = req.body.screenshotUrl;
  promo.status = 'submitted';
  await promo.save();

  res.json({ success: true, message: 'Payment proof submitted', data: promo });
}));

// @route GET /api/promotions/me
router.get('/me', protect, asyncHandler(async (req, res) => {
  const promotions = await Promotion.find({ owner: req.user._id }).populate('listing', 'title image_urls category');
  res.json({ success: true, data: promotions });
}));

// @route GET /api/promotions/active
router.get('/active', [
  query('placement').isIn(['homepage','category_top'])
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(validationError(errors.array().map(e => e.msg).join(', ')));

  const { placement } = req.query;
  const now = new Date();
  const cfg = await getConfigOrDefault();

  let q = { placement, status: 'active', 'schedule.startAt': { $lte: now }, 'schedule.endAt': { $gt: now } };
  let query = Promotion.find(q).populate({ path: 'listing', select: 'title image_urls category price pricing_frequency owner', populate: { path: 'owner', select: 'username firstName lastName' } });

  if (placement === 'homepage') {
    const limit = cfg.limits?.homepageMaxSlots || 10;
    if (cfg.settings?.rotation === 'random') {
      query = query.sort({}).limit(limit);
    } else {
      query = query.sort({ createdAt: -1 }).limit(limit);
    }
  } else {
    query = query.sort({ createdAt: -1 });
  }

  const promos = await query.lean();
  res.json({ success: true, data: promos });
}));

// @route GET /api/promotions/active-top
router.get('/active-top', [
  query('category').isIn(['rental','sale','service'])
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(validationError(errors.array().map(e => e.msg).join(', ')));

  const { category } = req.query;
  const now = new Date();
  const promos = await Promotion.find({ placement: 'category_top', listingCategory: category, status: 'active', 'schedule.startAt': { $lte: now }, 'schedule.endAt': { $gt: now } })
    .populate({ path: 'listing', select: 'title image_urls category price pricing_frequency owner', populate: { path: 'owner', select: 'username firstName lastName' } })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: promos });
}));

// @route POST /api/promotions/:id/click
router.post('/:id/click', asyncHandler(async (req, res, next) => {
  const promo = await Promotion.findById(req.params.id);
  if (!promo) return next(notFoundError('Promotion not found'));
  const now = new Date();
  const active = promo.status === 'active' && promo.schedule?.startAt <= now && promo.schedule?.endAt > now;
  if (!active) return next(validationError('Promotion not active'));
  await Promotion.updateOne({ _id: promo._id }, { $inc: { 'metrics.clicks': 1 }, $set: { 'metrics.lastClickAt': new Date() } });
  res.json({ success: true });
}));

// Admin routes
// Use a relaxed rate limit for admin list operations if needed
router.get('/admin/promotions', [protect, adminOnly], asyncHandler(async (req, res) => {
  const { status, placement } = req.query;
  const q = {};
  if (status) q.status = status;
  if (placement) q.placement = placement;
  const promos = await Promotion.find(q)
    .populate('listing', 'title category')
    .populate('owner', 'username email')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: promos });
}));

router.patch('/admin/promotions/:id/status', [protect, adminOnly, body('action').isIn(['approve','reject','expire']), body('durationDays').optional().isInt({ min: 1 })], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(validationError(errors.array().map(e => e.msg).join(', ')));

  const { action, durationDays } = req.body;
  const promo = await Promotion.findById(req.params.id);
  if (!promo) return next(notFoundError('Promotion not found'));

  if (action === 'reject') {
    promo.status = 'rejected';
    await promo.save();

    // Populate user and listing data for email
    await promo.populate([
      { path: 'owner', select: 'username firstName lastName email' },
      { path: 'listing', select: 'title category' }
    ]);

    // Send rejection email
    try {
      await sendPromotionRejectedEmail(promo.owner, promo, 'Payment verification failed or invalid transaction details');
    } catch (error) {
      console.error('Failed to send promotion rejection email:', error);
    }

    return res.json({ success: true, message: 'Promotion rejected', data: promo });
  }

  if (action === 'expire') {
    promo.status = 'expired';
    promo.schedule.endAt = new Date();
    await promo.save();
    return res.json({ success: true, message: 'Promotion expired', data: promo });
  }

  // approve
  const now = new Date();
  const days = parseInt(durationDays || promo.pricing.durationDays || 7);
  promo.status = 'active';
  promo.schedule.startAt = now;
  promo.schedule.endAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  promo.payment.verifiedAt = new Date();
  promo.payment.reviewer = req.user._id;
  await promo.save();

  // Populate user and listing data for email
  await promo.populate([
    { path: 'owner', select: 'username firstName lastName email' },
    { path: 'listing', select: 'title category' }
  ]);

  // Send approval email
  try {
    await sendPromotionApprovedEmail(promo.owner, promo);
  } catch (error) {
    console.error('Failed to send promotion approval email:', error);
  }

  res.json({ success: true, message: 'Promotion approved', data: promo });
}));

router.get('/admin/promotion-config', [protect, adminOnly], asyncHandler(async (req, res) => {
  const cfg = await getConfigOrDefault();
  res.json({ success: true, data: cfg });
}));

router.put('/admin/promotion-config', [protect, adminOnly], asyncHandler(async (req, res) => {
  let cfg = await getConfigOrDefault();
  const { prices, wallets, limits, settings } = req.body || {};
  if (prices) cfg.prices = prices;
  if (wallets) cfg.wallets = wallets;
  if (limits) cfg.limits = limits;
  if (settings) cfg.settings = settings;
  await cfg.save();
  res.json({ success: true, message: 'Config updated', data: cfg });
}));

module.exports = router;

// Public config (prices and available chains)
router.get('/config-public', asyncHandler(async (req, res) => {
  const cfg = await getConfigOrDefault();
  
  // Transform wallet addresses to chains format
  const chains = [
    {
      name: 'ethereum',
      displayName: 'Ethereum',
      enabled: !!cfg.wallets?.eth,
      walletAddress: cfg.wallets?.eth || '',
      symbol: 'ETH'
    },
    {
      name: 'bitcoin',
      displayName: 'Bitcoin',
      enabled: !!cfg.wallets?.btc,
      walletAddress: cfg.wallets?.btc || '',
      symbol: 'BTC'
    },
    {
      name: 'usdt_erc20',
      displayName: 'USDT (ERC20)',
      enabled: !!cfg.wallets?.usdt_erc20,
      walletAddress: cfg.wallets?.usdt_erc20 || '',
      symbol: 'USDT'
    },
    {
      name: 'usdt_trc20',
      displayName: 'USDT (TRC20)',
      enabled: !!cfg.wallets?.usdt_trc20,
      walletAddress: cfg.wallets?.usdt_trc20 || '',
      symbol: 'USDT'
    }
  ].filter(chain => chain.enabled);

  res.json({ 
    success: true, 
    data: { 
      prices: cfg.prices || {
        homepage: [{ days: 7, amount: 100, currency: 'USD' }],
        category_top: [{ days: 7, amount: 50, currency: 'USD' }]
      }, 
      chains 
    } 
  });
}));

// User Promotion Routes
// @desc    Get user's promotions
// @route   GET /api/promotions/user/promotions
// @access  Private
router.get('/user/promotions', [protect], asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 12, 
    status, 
    placement, 
    search, 
    sortBy = 'newest' 
  } = req.query;

  // Build query
  const query = { owner: req.user._id };

  if (status && status !== 'all') {
    query.status = status;
  }

  if (placement && placement !== 'all') {
    query.placement = placement;
  }

  if (search) {
    // Search in listing title (requires population)
    const listings = await Listing.find({
      $or: [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ]
    }).select('_id');
    query.listing = { $in: listings.map(l => l._id) };
  }

  // Build sort options
  let sortOptions = {};
  switch (sortBy) {
    case 'newest':
      sortOptions = { createdAt: -1 };
      break;
    case 'oldest':
      sortOptions = { createdAt: 1 };
      break;
    case 'status':
      sortOptions = { status: 1, createdAt: -1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const promotions = await Promotion.find(query)
    .populate('listing', 'title description price category images')
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Promotion.countDocuments(query);

  res.status(200).json({
    success: true,
    data: promotions,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    total
  });
}));
