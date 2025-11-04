const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
require('dotenv').config();

const testListings = [
  {
    title: "Luxury Beachfront Apartment in Kyrenia",
    description: "Beautiful 3-bedroom apartment with stunning sea views, modern amenities, and private balcony. Located in the heart of Kyrenia with easy access to beaches and restaurants. Fully furnished with high-end appliances.",
    listingType: "real_estate",
    category: "rental",
    price: 1500,
    currency: "EUR",
    pricing_frequency: "monthly",
    status: "active",
    image_urls: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"
    ],
    contact: {
      phone: "+90 533 123 4567",
      email: "contact@kyrenia-rentals.com",
      preferredMethod: "phone"
    },
    location: {
      city: "kyrenia",
      region: "Kyrenia District",
      address: "Kordonboyu, Kyrenia"
    },
    tags: ["apartment", "beachfront", "furnished", "balcony", "sea view"],
    moderationStatus: "approved",
    is_paid: false
  },
  {
    title: "Modern SUV - Toyota RAV4 2022",
    description: "Excellent condition Toyota RAV4 2022 with low mileage. Features include automatic transmission, leather seats, navigation system, and advanced safety features. Only one owner, full service history available.",
    listingType: "vehicle",
    category: "sale",
    price: 35000,
    currency: "USD",
    pricing_frequency: "fixed",
    status: "available_soon",
    image_urls: [
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2",
      "https://images.unsplash.com/photo-1549927681-0b673b8243ab"
    ],
    contact: {
      phone: "+90 533 987 6543",
      email: "cars@northcyprus.com",
      preferredMethod: "phone"
    },
    location: {
      city: "nicosia",
      region: "Nicosia District",
      address: "Central Nicosia"
    },
    tags: ["suv", "automatic", "toyota", "low mileage", "one owner"],
    moderationStatus: "approved",
    is_paid: false
  }
];

async function createTestListings() {
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

    // Delete existing test listings to avoid duplicates
    await Listing.deleteMany({ title: { $in: testListings.map(l => l.title) } });
    console.log('🗑️  Cleared existing test listings');

    // Create listings
    const createdListings = [];
    for (const listingData of testListings) {
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
    }

    console.log('\n🎉 Successfully created', createdListings.length, 'test listings!');
    console.log('\nListings created:');
    createdListings.forEach((listing, index) => {
      console.log(`${index + 1}. ${listing.title} (${listing.currency} ${listing.price} - ${listing.status})`);
    });

  } catch (error) {
    console.error('❌ Error creating test listings:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
createTestListings();
