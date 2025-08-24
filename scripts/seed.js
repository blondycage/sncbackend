const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
require('dotenv').config();

const sampleListings = [
  {
    title: "Modern Downtown Apartment",
    description: "Luxurious 2-bedroom apartment in the heart of downtown. Features modern amenities, floor-to-ceiling windows, and a stunning city view.",
    listingType: "real_estate",
    category: "rental",
    price: 2500,
    pricing_frequency: "monthly",
    image_urls: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"
    ],
    moderationStatus: "approved",
    status: "active"
  },
  {
    title: "Professional Photography Services",
    description: "Expert photography services for events, portraits, and commercial shoots. High-quality equipment and professional editing included.",
    listingType: "other",
    category: "service",
    price: 150,
    pricing_frequency: "hourly",
    image_urls: [
      "https://images.unsplash.com/photo-1542038784456-1ea8e935640e",
      "https://images.unsplash.com/photo-1520390138845-fd2d229dd553"
    ],
    moderationStatus: "approved",
    status: "active"
  },
  {
    title: "Vintage Car - 1965 Mustang",
    description: "Classic 1965 Ford Mustang in excellent condition. Original paint, restored interior, and runs perfectly. A true collector's item.",
    listingType: "vehicle",
    category: "sale",
    price: 45000,
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1567784177951-6fa58317e16b",
      "https://images.unsplash.com/photo-1567784177841-9d3c7e0b4154"
    ],
    moderationStatus: "approved",
    status: "active"
  },
  {
    title: "Beachfront Villa Rental",
    description: "Stunning beachfront villa with private pool, 4 bedrooms, and direct beach access. Perfect for family vacations or special events.",
    listingType: "real_estate",
    category: "rental",
    price: 400,
    pricing_frequency: "daily",
    image_urls: [
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2",
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c3"
    ],
    moderationStatus: "approved",
    status: "active"
  },
  {
    title: "Web Development Services",
    description: "Professional web development services. Custom websites, e-commerce solutions, and web applications. Modern tech stack and responsive design.",
    listingType: "other",
    category: "service",
    price: 80,
    pricing_frequency: "hourly",
    image_urls: [
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6"
    ],
    moderationStatus: "approved",
    status: "active"
  },
  {
    title: "Mountain Bike - Pro Series",
    description: "High-end mountain bike with carbon frame, hydraulic disc brakes, and premium suspension. Perfect for serious riders.",
    listingType: "vehicle",
    category: "sale",
    price: 2800,
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91",
      "https://images.unsplash.com/photo-1576435728678-68d0fbf94e92"
    ],
    moderationStatus: "approved",
    status: "active"
  },
  {
    title: "Coworking Space Desk",
    description: "Modern coworking space desk in prime location. High-speed internet, coffee, and meeting rooms included.",
    listingType: "real_estate",
    category: "rental",
    price: 300,
    pricing_frequency: "monthly",
    image_urls: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c",
      "https://images.unsplash.com/photo-1497366216548-37526070297d"
    ],
    moderationStatus: "approved",
    status: "active"
  },
  {
    title: "Personal Training Sessions",
    description: "Certified personal trainer offering customized workout plans and nutrition advice. In-person or virtual sessions available.",
    listingType: "other",
    category: "service",
    price: 60,
    pricing_frequency: "hourly",
    image_urls: [
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b",
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50c"
    ],
    moderationStatus: "approved",
    status: "active"
  },
  {
    title: "Gaming PC Setup",
    description: "Complete gaming PC setup including high-end GPU, 32GB RAM, RGB peripherals, and 4K monitor. Perfect for serious gamers.",
    listingType: "other",
    category: "sale",
    price: 3500,
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1587202372634-32705e3bf49c",
      "https://images.unsplash.com/photo-1587202372634-32705e3bf49d"
    ],
    moderationStatus: "approved",
    status: "active"
  },
  {
    title: "Luxury Yacht Charter",
    description: "40ft luxury yacht charter with captain. Perfect for special occasions, sunset cruises, or day trips. Includes water sports equipment.",
    listingType: "vehicle",
    category: "rental",
    price: 1200,
    pricing_frequency: "daily",
    image_urls: [
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a",
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96b"
    ],
    moderationStatus: "approved",
    status: "active"
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Listing.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',  // Let the model middleware hash it
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isVerified: true
    });
    console.log('Created admin user:', admin.email);

    // Create listings
    const listingPromises = sampleListings.map(listing => {
      return Listing.create({
        ...listing,
        owner: admin._id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        views: Math.floor(Math.random() * 100), // Random views count
        is_paid: Math.random() > 0.7, // 30% chance of being a paid listing
        contact: {
          email: 'admin@example.com',
          phone: '+1234567890'
        },
        location: {
          address: '123 Main St',
          city: 'New York',
          region: 'NY'
        }
      });
    });

    const createdListings = await Promise.all(listingPromises);
    console.log(`Created ${createdListings.length} listings`);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase(); 