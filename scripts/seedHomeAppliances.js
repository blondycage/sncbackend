const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample home appliances data
const homeAppliancesData = [
  {
    title: "Samsung 55-inch 4K Smart TV",
    description: "Excellent condition Samsung 55-inch 4K Smart TV with HDR support. Perfect for your living room. Comes with remote control and all original accessories. Barely used, like new condition.",
    listingType: "home_appliances",
    category: "sale",
    tags: ["television", "samsung", "4k", "smart-tv", "hdr", "55-inch"],
    price: 450,
    currency: "USD",
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&h=600&fit=crop"
    ],
    location: {
      city: "nicosia",
      address: "Nicosia City Center"
    },
    contact: {
      phone: "+90 392 123 4567",
      email: "seller1@example.com",
      preferredMethod: "phone"
    }
  },
  {
    title: "Bosch Washing Machine - 8kg Capacity",
    description: "High-quality Bosch washing machine with 8kg capacity. Energy efficient and quiet operation. Perfect for families. Includes installation guide and warranty information.",
    listingType: "home_appliances",
    category: "sale",
    tags: ["washing-machine", "bosch", "8kg", "energy-efficient", "family"],
    price: 320,
    currency: "USD",
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop"
    ],
    location: {
      city: "kyrenia",
      address: "Kyrenia Harbor Area"
    },
    contact: {
      phone: "+90 392 234 5678",
      email: "seller2@example.com",
      preferredMethod: "phone"
    }
  },
  {
    title: "LG Refrigerator - Double Door",
    description: "Spacious LG double door refrigerator with frost-free technology. Large capacity perfect for big families. Excellent cooling performance and energy efficient.",
    listingType: "home_appliances",
    category: "sale",
    tags: ["refrigerator", "lg", "double-door", "frost-free", "large-capacity"],
    price: 580,
    currency: "USD",
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&h=600&fit=crop"
    ],
    location: {
      city: "famagusta",
      address: "Famagusta Old Town"
    },
    contact: {
      phone: "+90 392 345 6789",
      email: "seller3@example.com",
      preferredMethod: "phone"
    }
  },
  {
    title: "Siemens Dishwasher - Built-in",
    description: "Modern Siemens built-in dishwasher with multiple wash programs. Quiet operation and excellent cleaning performance. Perfect for modern kitchens.",
    listingType: "home_appliances",
    category: "sale",
    tags: ["dishwasher", "siemens", "built-in", "quiet", "modern"],
    price: 420,
    currency: "USD",
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop"
    ],
    location: {
      city: "nicosia",
      address: "Nicosia University Area"
    },
    contact: {
      phone: "+90 392 456 7890",
      email: "seller4@example.com",
      preferredMethod: "email"
    }
  },
  {
    title: "Whirlpool Microwave Oven - 25L",
    description: "Compact Whirlpool microwave oven with 25L capacity. Multiple cooking modes and defrost function. Perfect for small kitchens or as a second microwave.",
    listingType: "home_appliances",
    category: "sale",
    tags: ["microwave", "whirlpool", "25l", "compact", "defrost"],
    price: 150,
    currency: "USD",
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&h=600&fit=crop"
    ],
    location: {
      city: "kyrenia",
      address: "Kyrenia City Center"
    },
    contact: {
      phone: "+90 392 567 8901",
      email: "seller5@example.com",
      preferredMethod: "phone"
    }
  },
  {
    title: "Daikin Air Conditioner - 1.5 Ton",
    description: "Energy efficient Daikin air conditioner with 1.5 ton cooling capacity. Inverter technology for quiet operation and energy savings. Perfect for bedrooms or small living rooms.",
    listingType: "home_appliances",
    category: "sale",
    tags: ["air-conditioner", "daikin", "1-5-ton", "inverter", "energy-efficient"],
    price: 380,
    currency: "USD",
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop"
    ],
    location: {
      city: "famagusta",
      address: "Famagusta University Area"
    },
    contact: {
      phone: "+90 392 678 9012",
      email: "seller6@example.com",
      preferredMethod: "phone"
    }
  },
  {
    title: "KitchenAid Stand Mixer - Red",
    description: "Professional KitchenAid stand mixer in beautiful red color. Perfect for baking enthusiasts. Includes multiple attachments for various cooking tasks.",
    listingType: "home_appliances",
    category: "sale",
    tags: ["stand-mixer", "kitchenaid", "red", "professional", "baking"],
    price: 280,
    currency: "USD",
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop"
    ],
    location: {
      city: "nicosia",
      address: "Nicosia Old Town"
    },
    contact: {
      phone: "+90 392 789 0123",
      email: "seller7@example.com",
      preferredMethod: "email"
    }
  },
  {
    title: "Philips Coffee Machine - Espresso",
    description: "High-quality Philips espresso coffee machine with milk frother. Perfect for coffee lovers who want barista-quality coffee at home. Easy to use and clean.",
    listingType: "home_appliances",
    category: "sale",
    tags: ["coffee-machine", "philips", "espresso", "milk-frother", "barista"],
    price: 220,
    currency: "USD",
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&h=600&fit=crop"
    ],
    location: {
      city: "kyrenia",
      address: "Kyrenia Beach Area"
    },
    contact: {
      phone: "+90 392 890 1234",
      email: "seller8@example.com",
      preferredMethod: "phone"
    }
  },
  {
    title: "Electrolux Vacuum Cleaner - Cordless",
    description: "Powerful Electrolux cordless vacuum cleaner with long battery life. Perfect for quick cleanups and hard-to-reach areas. Lightweight and easy to maneuver.",
    listingType: "home_appliances",
    category: "sale",
    tags: ["vacuum-cleaner", "electrolux", "cordless", "battery", "lightweight"],
    price: 180,
    currency: "USD",
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop"
    ],
    location: {
      city: "famagusta",
      address: "Famagusta City Center"
    },
    contact: {
      phone: "+90 392 901 2345",
      email: "seller9@example.com",
      preferredMethod: "phone"
    }
  },
  {
    title: "Sony Sound System - 5.1 Channel",
    description: "Premium Sony 5.1 channel surround sound system with wireless subwoofer. Perfect for home theater setup. Excellent sound quality and easy setup.",
    listingType: "home_appliances",
    category: "sale",
    tags: ["sound-system", "sony", "5-1-channel", "surround-sound", "wireless"],
    price: 350,
    currency: "USD",
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&h=600&fit=crop"
    ],
    location: {
      city: "nicosia",
      address: "Nicosia University Area"
    },
    contact: {
      phone: "+90 392 012 3456",
      email: "seller10@example.com",
      preferredMethod: "phone"
    }
  }
];

const seedHomeAppliances = async () => {
  try {
    console.log('🌱 Starting home appliances seeding...');

    // Find a user to assign as owner
    const user = await User.findOne({ role: 'user' });
    if (!user) {
      console.error('❌ No user found. Please seed users first.');
      return;
    }

    // Clear existing home appliances listings
    await Listing.deleteMany({ listingType: 'home_appliances' });
    console.log('🧹 Cleared existing home appliances listings');

    // Create new home appliances listings
    const listings = homeAppliancesData.map(appliance => ({
      ...appliance,
      owner: user._id,
      status: 'active',
      moderationStatus: 'approved',
      views: Math.floor(Math.random() * 100),
      is_paid: false
    }));

    const createdListings = await Listing.insertMany(listings);
    console.log(`✅ Successfully created ${createdListings.length} home appliances listings`);

    // Display summary
    console.log('\n📊 Home Appliances Seeding Summary:');
    console.log(`- Total listings created: ${createdListings.length}`);
    console.log(`- Categories: ${[...new Set(createdListings.map(l => l.category))].join(', ')}`);
    console.log(`- Cities: ${[...new Set(createdListings.map(l => l.location?.city).filter(Boolean))].join(', ')}`);
    console.log(`- Price range: $${Math.min(...createdListings.map(l => l.price))} - $${Math.max(...createdListings.map(l => l.price))}`);

  } catch (error) {
    console.error('❌ Error seeding home appliances:', error);
  }
};

const main = async () => {
  await connectDB();
  await seedHomeAppliances();
  await mongoose.connection.close();
  console.log('✅ Home appliances seeding completed');
  process.exit(0);
};

if (require.main === module) {
  main();
}

module.exports = { seedHomeAppliances };