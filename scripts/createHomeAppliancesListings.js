const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
require('dotenv').config();

const homeAppliancesListings = [
  {
    title: "Samsung 55-inch 4K Smart TV",
    description: "Brand new Samsung 4K Smart TV with HDR support, voice control, and built-in streaming apps. Crystal clear display with vibrant colors. Includes wall mount and original remote. Perfect condition, still under warranty.",
    listingType: "home_appliances",
    category: "sale",
    price: 850,
    currency: "USD",
    pricing_frequency: "fixed",
    status: "active",
    image_urls: [
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1",
      "https://images.unsplash.com/photo-1593359863503-f598ae96a537"
    ],
    contact: {
      phone: "+90 533 456 7890",
      email: "electronics@northcyprus.com",
      preferredMethod: "phone"
    },
    location: {
      city: "nicosia",
      region: "Nicosia District",
      address: "City Center, Nicosia"
    },
    tags: ["tv", "samsung", "4k", "smart tv", "electronics"],
    moderationStatus: "approved",
    is_paid: false
  },
  {
    title: "LG Washing Machine 8kg Front Load",
    description: "Efficient LG front-load washing machine with 8kg capacity. Energy-saving features, multiple wash programs, and quiet operation. Only 6 months old, barely used. Moving sale - must go quickly!",
    listingType: "home_appliances",
    category: "sale",
    price: 450,
    currency: "EUR",
    pricing_frequency: "negotiable",
    status: "active",
    image_urls: [
      "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1",
      "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1"
    ],
    contact: {
      phone: "+90 533 234 5678",
      email: "appliances@kyrenia.com",
      preferredMethod: "phone"
    },
    location: {
      city: "kyrenia",
      region: "Kyrenia District",
      address: "Alsancak, Kyrenia"
    },
    tags: ["washing machine", "lg", "front load", "appliance", "laundry"],
    moderationStatus: "approved",
    is_paid: false
  },
  {
    title: "Bosch Refrigerator Double Door 500L",
    description: "Spacious Bosch double-door refrigerator with 500L capacity. No-frost technology, energy efficient A++ rating, LED lighting, and adjustable shelves. Excellent condition, regularly maintained. Includes ice maker.",
    listingType: "home_appliances",
    category: "sale",
    price: 1200,
    currency: "USD",
    pricing_frequency: "fixed",
    status: "active",
    image_urls: [
      "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5",
      "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30"
    ],
    contact: {
      phone: "+90 533 345 6789",
      email: "home@famagusta.com",
      preferredMethod: "email"
    },
    location: {
      city: "famagusta",
      region: "Famagusta District",
      address: "Central Famagusta"
    },
    tags: ["refrigerator", "bosch", "fridge", "double door", "kitchen"],
    moderationStatus: "approved",
    is_paid: false
  },
  {
    title: "Dyson V11 Cordless Vacuum Cleaner",
    description: "Premium Dyson V11 cordless vacuum with powerful suction and long battery life. Multiple attachments for all surfaces. Lightweight and easy to maneuver. Like new condition, used only a few times. Original packaging included.",
    listingType: "home_appliances",
    category: "sale",
    price: 380,
    currency: "GBP",
    pricing_frequency: "fixed",
    status: "available_soon",
    image_urls: [
      "https://images.unsplash.com/photo-1558317374-067fb5f30001",
      "https://images.unsplash.com/photo-1585659722983-3a675dabf23d"
    ],
    contact: {
      phone: "+90 533 567 8901",
      email: "cleantech@cyprus.com",
      preferredMethod: "phone"
    },
    location: {
      city: "iskele",
      region: "İskele District",
      address: "Long Beach, İskele"
    },
    tags: ["vacuum", "dyson", "cordless", "cleaner", "cleaning"],
    moderationStatus: "approved",
    is_paid: false
  }
];

async function createHomeAppliancesListings() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/searchnorthcyprus');
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@example.com' });
    if (!admin) {
      console.error('❌ Admin user not found. Please create admin user first.');
      process.exit(1);
    }
    console.log('✅ Found admin user:', admin.email);

    // NOTE: We do NOT delete existing listings as requested
    console.log('📝 Keeping existing listings (no database clearing)');

    // Create listings
    const createdListings = [];
    for (const listingData of homeAppliancesListings) {
      const listing = new Listing({
        ...listingData,
        owner: admin._id
      });
      await listing.save();
      createdListings.push(listing);
      console.log(`✅ Created listing: ${listing.title}`);
      console.log(`   - Price: ${listing.currency} ${listing.price}`);
      console.log(`   - Status: ${listing.status}`);
      console.log(`   - Location: ${listing.location.city}`);
      console.log(`   - Type: ${listing.listingType}`);
    }

    console.log('\n🎉 Successfully created', createdListings.length, 'home appliances listings!');
    console.log('\nListings created:');
    createdListings.forEach((listing, index) => {
      console.log(`${index + 1}. ${listing.title} (${listing.currency} ${listing.price} - ${listing.status})`);
    });

  } catch (error) {
    console.error('❌ Error creating home appliances listings:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
createHomeAppliancesListings();
