const express = require('express');
const { body, query, validationResult } = require('express-validator');
const QRCode = require('qrcode');
const router = express.Router();

const Payment = require('../models/Payment');
const PromotionConfig = require('../models/PromotionConfig');
const Listing = require('../models/Listing');
const EducationalProgram = require('../models/EducationalProgram');
const Application = require('../models/Application');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, validationError, notFoundError, authorizationError } = require('../middleware/errorHandler');

// Utils
async function getConfigOrDefault() {
  let cfg = await PromotionConfig.findOne();
  if (!cfg) {
    cfg = await PromotionConfig.create({
      prices: {
        homepage: [{ days: 7, amount: 50, currency: 'USD' }, { days: 30, amount: 150, currency: 'USD' }],
        category_top: [{ days: 7, amount: 20, currency: 'USD' }, { days: 30, amount: 60, currency: 'USD' }],
        featured_listing: [{ days: 7, amount: 25, currency: 'USD' }, { days: 30, amount: 80, currency: 'USD' }],
        listing_fee: [{ days: 30, amount: 10, currency: 'USD' }, { days: 90, amount: 25, currency: 'USD' }],
        application_fee: [{ days: 1, amount: 50, currency: 'USD' }],
      },
      wallets: { btc: '', eth: '', usdt_erc20: '', usdt_trc20: '' },
      limits: { homepageMaxSlots: 10 },
      settings: { rotation: 'recent' },
    });
  }
  return cfg;
}

function computePrice(cfg, paymentType, durationDays = null) {
  const options = cfg.prices?.[paymentType] || [];
  if (durationDays) {
    const match = options.find(p => p.days === durationDays);
    if (!match) throw new Error(`No pricing for ${paymentType} with ${durationDays} days`);
    return { amount: match.amount, currency: match.currency };
  } else {
    // For fixed-price items like application fees
    if (options.length === 0) throw new Error(`No pricing configured for ${paymentType}`);
    return { amount: options[0].amount, currency: options[0].currency };
  }
}

function getWalletAddress(cfg, chain) {
  const chainToWalletKey = {
    'bitcoin': 'btc',
    'btc': 'btc',
    'ethereum': 'eth', 
    'eth': 'eth',
    'usdt_erc20': 'usdt_erc20',
    'usdt_trc20': 'usdt_trc20',
    'other': 'other'
  };
  
  const walletKey = chainToWalletKey[chain] || chain;
  return cfg.wallets?.[walletKey] || '';
}

// @route POST /api/payments/create
// Create payment request for any item type
router.post('/create', [
  protect,
  body('itemType').isIn(['promotion', 'listing', 'property', 'education_application', 'featured_listing']),
  body('itemId').isMongoId(),
  body('paymentType').isIn(['promotion_fee', 'listing_fee', 'featured_listing', 'application_fee', 'premium_placement', 'service_payment']),
  body('chain').isIn(['btc', 'eth', 'usdt_erc20', 'usdt_trc20', 'bitcoin', 'ethereum', 'other']),
  body('durationDays').optional().isInt({ min: 1 }),
  body('placement').optional().isIn(['homepage', 'category_top']),
  body('features').optional().isArray(),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('description').optional().isString(),
  body('serviceDetails').optional().isObject()
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(validationError(errors.array().map(e => e.msg).join(', ')));

  const { itemType, itemId, paymentType, chain, durationDays, placement, features, amount, description, serviceDetails } = req.body;
  
  // Verify item exists and user owns it
  let item, refModel;
  switch (itemType) {
    case 'listing':
    case 'property':
      item = await Listing.findById(itemId).populate('owner', 'firstName lastName email');
      refModel = 'Listing';
      if (!item) return next(notFoundError('Listing not found'));
      
      // For service payments, user should NOT be the owner (they're paying the owner)
      if (paymentType === 'service_payment') {
        if (item.owner._id.toString() === req.user._id.toString()) {
          return next(authorizationError('Cannot pay for your own service'));
        }
      } else {
        // For other payment types (promotions, etc), user should own the listing
        if (item.owner._id.toString() !== req.user._id.toString()) {
          return next(authorizationError('Not your listing'));
        }
      }
      break;
    case 'education_application':
      item = await Application.findById(itemId);
      refModel = 'Application';
      if (!item) return next(notFoundError('Application not found'));
      if (item.applicant.toString() !== req.user._id.toString()) {
        return next(authorizationError('Not your application'));
      }
      break;
    default:
      return next(validationError('Unsupported item type'));
  }

  // Check for existing pending payment
  const existingPayment = await Payment.findOne({
    user: req.user._id,
    itemType,
    itemId,
    paymentType,
    status: { $in: ['pending', 'submitted', 'under_review'] }
  });

  if (existingPayment) {
    return next(validationError('There is already a pending payment for this item'));
  }

  const cfg = await getConfigOrDefault();
  
  // For service payments, use user-provided amount; for others, compute from config
  let paymentAmount, currency;
  if (paymentType === 'service_payment') {
    if (!amount || amount <= 0) {
      return next(validationError('Amount is required for service payments'));
    }
    paymentAmount = amount;
    currency = 'USD';
  } else {
    const priceData = computePrice(cfg, paymentType, durationDays);
    paymentAmount = priceData.amount;
    currency = priceData.currency;
  }
  
  const walletAddress = getWalletAddress(cfg, chain);

  if (!walletAddress) {
    return next(validationError(`No wallet configured for ${chain}`));
  }

  // Map display chain names to internal format
  const normalizedChain = chain === 'bitcoin' ? 'btc' : (chain === 'ethereum' ? 'eth' : chain);

  const paymentData = {
    user: req.user._id,
    itemType,
    itemId,
    refModel,
    paymentType,
    pricing: { 
      amount: paymentAmount, 
      currency, 
      chain: normalizedChain,
      description: description || getPaymentDescription(paymentType, durationDays, placement, features)
    },
    payment: { walletAddress },
    metadata: {
      duration: durationDays,
      placement,
      features: features || [],
      ...(paymentType === 'service_payment' && serviceDetails && { serviceDetails: {
        ...serviceDetails,
        customAmount: paymentAmount
      }})
    }
  };

  const payment = await Payment.create(paymentData);

  // Generate QR code
  let qrDataUrl = '';
  try { 
    qrDataUrl = await QRCode.toDataURL(walletAddress); 
  } catch (error) {
    console.error('QR code generation error:', error);
  }

  res.status(201).json({
    success: true,
    data: { 
      payment,
      paymentInfo: { 
        walletAddress, 
        amount, 
        currency, 
        chain: normalizedChain, 
        qrDataUrl 
      }
    }
  });
}));

function getPaymentDescription(paymentType, durationDays, placement, features) {
  switch (paymentType) {
    case 'promotion_fee':
      return `${placement} promotion for ${durationDays} days`;
    case 'featured_listing':
      return `Featured listing for ${durationDays} days`;
    case 'listing_fee':
      return `Listing fee for ${durationDays} days`;
    case 'application_fee':
      return 'Application processing fee';
    default:
      return paymentType.replace('_', ' ');
  }
}

// @route PUT /api/payments/:id/submit-proof
// Submit payment proof
router.put('/:id/submit-proof', [
  protect,
  body('txHash').trim().isLength({ min: 6 }),
  body('screenshotUrl').optional().isURL()
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(validationError(errors.array().map(e => e.msg).join(', ')));

  const payment = await Payment.findById(req.params.id);
  if (!payment) return next(notFoundError('Payment not found'));
  if (payment.user.toString() !== req.user._id.toString()) {
    return next(authorizationError('Not authorized'));
  }
  if (!['pending', 'submitted', 'under_review', 'rejected'].includes(payment.status)) {
    return next(validationError('Cannot submit proof for this payment status'));
  }

  payment.payment.txHash = req.body.txHash;
  if (req.body.screenshotUrl) {
    payment.payment.screenshotUrl = req.body.screenshotUrl;
  }
  
  await payment.updateStatus('submitted', 'Payment proof submitted by user', req.user._id);

  res.json({ success: true, message: 'Payment proof submitted', data: payment });
}));

// @route GET /api/payments/me
// Get user's payments
router.get('/me', protect, asyncHandler(async (req, res) => {
  const { itemType, status, paymentType } = req.query;
  
  const query = { user: req.user._id };
  if (itemType) query.itemType = itemType;
  if (status) query.status = status;
  if (paymentType) query.paymentType = paymentType;

  const payments = await Payment.find(query)
    .populate('itemReference')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: payments });
}));

// @route GET /api/payments/:id
// Get single payment
router.get('/:id', protect, asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate('user', 'firstName lastName email')
    .populate('payment.reviewer', 'firstName lastName')
    .populate('itemReference');

  if (!payment) return next(notFoundError('Payment not found'));

  // Check if user owns this payment or is admin
  if (payment.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(authorizationError('Not authorized to view this payment'));
  }

  res.json({ success: true, data: payment });
}));

// Admin routes
// @route GET /api/payments/admin/payments
// Get all payments for admin
router.get('/admin/payments', [protect, adminOnly], asyncHandler(async (req, res) => {
  const { status, paymentType, itemType, page = 1, limit = 20 } = req.query;
  
  const query = {};
  if (status) query.status = status;
  if (paymentType) query.paymentType = paymentType;
  if (itemType) query.itemType = itemType;

  const skip = (page - 1) * limit;
  const payments = await Payment.find(query)
    .populate('user', 'firstName lastName email')
    .populate('payment.reviewer', 'firstName lastName')
    .populate('itemReference')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Payment.countDocuments(query);

  res.json({ 
    success: true, 
    data: payments,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
}));

// @route PUT /api/payments/admin/:id/status
// Update payment status (admin only)
router.put('/admin/:id/status', [
  protect, 
  adminOnly,
  body('status').isIn(['submitted', 'under_review', 'verified', 'rejected', 'refunded']),
  body('notes').optional().isLength({ max: 1000 })
], asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(validationError(errors.array().map(e => e.msg).join(', ')));

  const payment = await Payment.findById(req.params.id);
  if (!payment) return next(notFoundError('Payment not found'));

  const { status, notes } = req.body;

  if (status === 'verified') {
    await payment.verifyPayment(req.user._id, payment.payment.txHash, payment.payment.screenshotUrl);
    
    // Activate the paid service
    await activatePaymentService(payment);
  } else if (status === 'rejected') {
    await payment.rejectPayment(req.user._id, notes);
  } else {
    await payment.updateStatus(status, notes, req.user._id);
  }

  res.json({ success: true, message: 'Payment status updated', data: payment });
}));

// Helper function to activate paid services
async function activatePaymentService(payment) {
  try {
    switch (payment.paymentType) {
      case 'featured_listing':
        // Mark listing as featured
        await Listing.findByIdAndUpdate(payment.itemId, { 
          featured: true,
          featuredUntil: new Date(Date.now() + (payment.metadata.duration * 24 * 60 * 60 * 1000))
        });
        break;
      
      case 'listing_fee':
        // Activate listing
        await Listing.findByIdAndUpdate(payment.itemId, { 
          status: 'active',
          moderationStatus: 'approved',
          paidUntil: new Date(Date.now() + (payment.metadata.duration * 24 * 60 * 60 * 1000))
        });
        break;
      
      case 'application_fee':
        // Process application (could trigger additional workflows)
        await Application.findByIdAndUpdate(payment.itemId, { 
          status: 'submitted' 
        });
        break;
      
      // Add more cases as needed
    }
  } catch (error) {
    console.error('Error activating payment service:', error);
  }
}

// @route GET /api/payments/config-public
// Get public payment configuration
router.get('/config-public', asyncHandler(async (req, res) => {
  const cfg = await getConfigOrDefault();
  
  const chains = [
    {
      name: 'eth',
      displayName: 'Ethereum',
      enabled: !!cfg.wallets?.eth,
      walletAddress: cfg.wallets?.eth || '',
      symbol: 'ETH'
    },
    {
      name: 'btc',
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
        featured_listing: [{ days: 7, amount: 25, currency: 'USD' }],
        listing_fee: [{ days: 30, amount: 10, currency: 'USD' }],
        application_fee: [{ days: 1, amount: 50, currency: 'USD' }]
      }, 
      chains 
    } 
  });
}));

module.exports = router;