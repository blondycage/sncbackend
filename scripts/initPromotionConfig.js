const mongoose = require('mongoose');
const colors = require('colors');
require('dotenv').config();

// Import models
const PromotionConfig = require('../models/PromotionConfig');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

const initPromotionConfig = async () => {
  try {
    await connectDB();

    console.log('🔄 Initializing promotion configuration...'.blue.bold);

    // Check if config already exists
    let config = await PromotionConfig.findOne();
    
    if (config) {
      console.log('📝 Promotion config already exists, updating...'.yellow);
    } else {
      console.log('📝 Creating new promotion config...'.green);
    }

    // Default configuration
    const defaultConfig = {
      prices: {
        homepage: [
          { days: 1, amount: 100, currency: 'USD' },
          { days: 7, amount: 600, currency: 'USD' },
          { days: 14, amount: 1100, currency: 'USD' },
          { days: 30, amount: 2100, currency: 'USD' }
        ],
        category_top: [
          { days: 1, amount: 50, currency: 'USD' },
          { days: 7, amount: 300, currency: 'USD' },
          { days: 14, amount: 550, currency: 'USD' },
          { days: 30, amount: 1000, currency: 'USD' }
        ]
      },
      wallets: {
        btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Sample Bitcoin address
        eth: '0x742d35Cc6634C0532925a3b8D427AE05A8E67C14', // Sample Ethereum address
        usdt_erc20: '0x742d35Cc6634C0532925a3b8D427AE05A8E67C14', // Sample USDT ERC20 address
        usdt_trc20: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE' // Sample USDT TRC20 address
      },
      limits: {
        homepageMaxSlots: 3
      },
      settings: {
        rotation: 'recent'
      }
    };

    if (config) {
      // Update existing config
      config.prices = defaultConfig.prices;
      config.wallets = defaultConfig.wallets;
      config.limits = defaultConfig.limits;
      config.settings = defaultConfig.settings;
      await config.save();
    } else {
      // Create new config
      config = await PromotionConfig.create(defaultConfig);
    }

    console.log('✅ Promotion configuration initialized successfully!'.green.bold);
    console.log('\n📊 Configuration Details:'.blue.bold);
    
    console.log('\n💰 Pricing:'.cyan);
    console.log('   Homepage Hero:'.cyan);
    config.prices.homepage.forEach(price => {
      console.log(`     ${price.days} days: $${price.amount} ${price.currency}`.gray);
    });
    console.log('   Category Top:'.cyan);
    config.prices.category_top.forEach(price => {
      console.log(`     ${price.days} days: $${price.amount} ${price.currency}`.gray);
    });

    console.log('\n🔗 Wallet Addresses:'.cyan);
    Object.entries(config.wallets).forEach(([chain, address]) => {
      if (address) {
        console.log(`     ${chain.toUpperCase()}: ${address}`.gray);
      }
    });

    console.log('\n⚙️  Settings:'.cyan);
    console.log(`     Max Homepage Slots: ${config.limits.homepageMaxSlots}`.gray);
    console.log(`     Rotation: ${config.settings.rotation}`.gray);

    console.log('\n🚀 Ready to use! Users can now create promotions.'.green.bold);
    console.log('\n💡 Next steps:'.blue.bold);
    console.log('   1. Update wallet addresses in admin settings'.cyan);
    console.log('   2. Adjust pricing as needed'.cyan);
    console.log('   3. Configure payment processing'.cyan);

  } catch (error) {
    console.error('❌ Error initializing promotion config:'.red.bold, error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB'.gray);
    process.exit(0);
  }
};

// Run the script
initPromotionConfig();