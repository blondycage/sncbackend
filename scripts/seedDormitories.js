const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const colors = require('colors');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Dormitory = require('../models/Dormitory');

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

// Mock dormitory data with real public image URLs
const dormitoriesData = [
  {
    title: "Luxury Student Residences Near EMU",
    description: "Modern and comfortable student accommodation just 5 minutes walk from Eastern Mediterranean University. Features include high-speed WiFi, study areas, and 24/7 security. Perfect for international students seeking a safe and comfortable living environment with all amenities included.",
    university: {
      name: "Eastern Mediterranean University (EMU)",
      isFromDropdown: true
    },
    location: {
      city: "Famagusta",
      region: "University Area",
      address: "Salamis Road, Famagusta, North Cyprus"
    },
    availability: "available",
    image_urls: [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"
    ],
    roomVariants: [
      {
        type: "single",
        capacity: 1,
        price: 450,
        priceFrequency: "monthly",
        available: true,
        description: "Private room with ensuite bathroom"
      },
      {
        type: "double",
        capacity: 2,
        price: 350,
        priceFrequency: "monthly",
        available: true,
        description: "Shared room with private bathroom"
      }
    ],
    contact: {
      phone: "+90 548 123 4567",
      email: "info@emuluxury.com",
      whatsapp: "+90 548 123 4567",
      preferredMethod: "whatsapp"
    },
    genderRestriction: "mixed",
    facilities: ["WiFi", "Security", "Study Room", "Laundry", "Parking", "Kitchen"],
    rules: [
      "Quiet hours from 10 PM to 8 AM",
      "No smoking inside the building",
      "Visitors allowed until 11 PM",
      "Keep common areas clean"
    ]
  },
  {
    title: "NEU Campus Student Village",
    description: "Located in the heart of Nicosia, this student village offers easy access to Near East University and the city center. Modern facilities include gym, swimming pool, and study lounges. All rooms are fully furnished with air conditioning and high-speed internet.",
    university: {
      name: "Near East University (NEU)",
      isFromDropdown: true
    },
    location: {
      city: "Nicosia",
      region: "University District",
      address: "University Avenue, Nicosia, North Cyprus"
    },
    availability: "running_out",
    image_urls: [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
      "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=800&q=80",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80"
    ],
    roomVariants: [
      {
        type: "single",
        capacity: 1,
        price: 500,
        priceFrequency: "monthly",
        available: true,
        description: "Premium single room with balcony"
      },
      {
        type: "triple",
        capacity: 3,
        price: 280,
        priceFrequency: "monthly",
        available: false,
        description: "Triple occupancy with shared facilities"
      }
    ],
    contact: {
      phone: "+90 548 234 5678",
      email: "residence@neu.edu.tr",
      whatsapp: "+90 548 234 5678",
      preferredMethod: "whatsapp"
    },
    genderRestriction: "mixed",
    facilities: ["WiFi", "Gym", "Swimming Pool", "Security", "AC", "Parking"],
    rules: [
      "No pets allowed",
      "Quiet study environment maintained",
      "Weekly room inspections"
    ]
  },
  {
    title: "Girne Harbor View Residences",
    description: "Stunning student accommodation with beautiful harbor views in historic Kyrenia. Just 10 minutes from Girne American University. Features include rooftop terrace, study areas, and traditional Cypriot architecture combined with modern amenities.",
    university: {
      name: "Girne American University (GAU)",
      isFromDropdown: true
    },
    location: {
      city: "Kyrenia",
      region: "Harbor District",
      address: "Harbor Road, Kyrenia, North Cyprus"
    },
    availability: "available",
    image_urls: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80"
    ],
    roomVariants: [
      {
        type: "single",
        capacity: 1,
        price: 600,
        priceFrequency: "monthly",
        available: true,
        description: "Single room with harbor view"
      },
      {
        type: "double",
        capacity: 2,
        price: 400,
        priceFrequency: "monthly",
        available: true,
        description: "Shared room with shared balcony"
      }
    ],
    contact: {
      phone: "+90 548 345 6789",
      email: "info@kyreniaharbor.com",
      whatsapp: "+90 548 345 6789",
      preferredMethod: "whatsapp"
    },
    genderRestriction: "mixed",
    facilities: ["WiFi", "Garden", "Common Area", "Security", "Laundry"],
    rules: [
      "Respect historical building guidelines",
      "No loud music after 9 PM",
      "Keep harbor view areas clean"
    ]
  },
  {
    title: "Female-Only Student House Lefke",
    description: "Safe and secure accommodation exclusively for female students near European University of Lefke. Features include 24/7 female security staff, prayer room, and all-female common areas. Traditional Cypriot hospitality with modern comfort.",
    university: {
      name: "European University of Lefke (EUL)",
      isFromDropdown: true
    },
    location: {
      city: "Lefke",
      region: "Town Center",
      address: "University Street, Lefke, North Cyprus"
    },
    availability: "available",
    image_urls: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
      "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&q=80"
    ],
    roomVariants: [
      {
        type: "single",
        capacity: 1,
        price: 400,
        priceFrequency: "monthly",
        available: true,
        description: "Private room with study desk"
      },
      {
        type: "double",
        capacity: 2,
        price: 300,
        priceFrequency: "monthly",
        available: true,
        description: "Twin beds with wardrobe space"
      }
    ],
    contact: {
      phone: "+90 548 456 7890",
      email: "femaleresidence@lefke.com",
      whatsapp: "+90 548 456 7890",
      preferredMethod: "whatsapp"
    },
    genderRestriction: "female",
    facilities: ["WiFi", "Security", "Study Room", "Kitchen", "Garden"],
    rules: [
      "Female guests only",
      "Curfew at midnight",
      "Prayer room available 24/7",
      "Dress code respected in common areas"
    ]
  },
  {
    title: "CIU Modern Living Complex",
    description: "Contemporary student housing complex serving Cyprus International University students. Features state-of-the-art facilities including fitness center, computer lab, and recreational areas. Fully furnished apartments with kitchen facilities.",
    university: {
      name: "Cyprus International University (CIU)",
      isFromDropdown: true
    },
    location: {
      city: "Nicosia",
      region: "Haspolat",
      address: "Haspolat Main Road, Nicosia, North Cyprus"
    },
    availability: "available",
    image_urls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80"
    ],
    roomVariants: [
      {
        type: "single",
        capacity: 1,
        price: 480,
        priceFrequency: "monthly",
        available: true,
        description: "Studio apartment with kitchenette"
      },
      {
        type: "quad",
        capacity: 4,
        price: 250,
        priceFrequency: "monthly",
        available: true,
        description: "4-bed apartment with shared living space"
      }
    ],
    contact: {
      phone: "+90 548 567 8901",
      email: "residence@ciu.edu.tr",
      whatsapp: "+90 548 567 8901",
      preferredMethod: "whatsapp"
    },
    genderRestriction: "mixed",
    facilities: ["WiFi", "Gym", "Computer Lab", "AC", "Parking", "Laundry"],
    rules: [
      "No smoking in apartments",
      "Guest registration required",
      "Maintain cleanliness in shared areas"
    ]
  },
  {
    title: "Budget-Friendly Kyrenia Student Dorms",
    description: "Affordable accommodation option for students attending University of Kyrenia. Basic but clean facilities with shared kitchen and bathroom. Perfect for budget-conscious students who want a clean, safe place to stay.",
    university: {
      name: "University of Kyrenia",
      isFromDropdown: true
    },
    location: {
      city: "Kyrenia",
      region: "Karakum",
      address: "Karakum District, Kyrenia, North Cyprus"
    },
    availability: "available",
    image_urls: [
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80",
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80"
    ],
    roomVariants: [
      {
        type: "double",
        capacity: 2,
        price: 200,
        priceFrequency: "monthly",
        available: true,
        description: "Basic shared room"
      },
      {
        type: "six_person",
        capacity: 6,
        price: 120,
        priceFrequency: "monthly",
        available: true,
        description: "Dormitory style accommodation"
      }
    ],
    contact: {
      phone: "+90 548 678 9012",
      email: "budget@kyrenia.com",
      whatsapp: "+90 548 678 9012",
      preferredMethod: "phone"
    },
    genderRestriction: "mixed",
    facilities: ["WiFi", "Kitchen", "Laundry"],
    rules: [
      "Shared responsibility for cleaning",
      "No overnight guests",
      "Quiet hours strictly enforced"
    ]
  },
  {
    title: "Final University Premium Suites",
    description: "Luxury student accommodation with hotel-style services. Each suite includes private bathroom, study area, and premium furnishing. Daily cleaning service and 24/7 concierge available. Perfect for students who prefer premium comfort.",
    university: {
      name: "Final International University",
      isFromDropdown: true
    },
    location: {
      city: "Kyrenia",
      region: "Alsancak",
      address: "Alsancak Coastal Road, Kyrenia, North Cyprus"
    },
    availability: "running_out",
    image_urls: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
      "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=800&q=80",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80"
    ],
    roomVariants: [
      {
        type: "single",
        capacity: 1,
        price: 800,
        priceFrequency: "monthly",
        available: true,
        description: "Premium suite with sea view"
      }
    ],
    contact: {
      phone: "+90 548 789 0123",
      email: "premium@finaluni.com",
      whatsapp: "+90 548 789 0123",
      preferredMethod: "whatsapp"
    },
    genderRestriction: "mixed",
    facilities: ["WiFi", "Security", "Gym", "Swimming Pool", "AC", "Parking", "TV"],
    rules: [
      "Premium service standards maintained",
      "Quiet luxury environment",
      "Daily housekeeping included"
    ]
  },
  {
    title: "METU Northern Cyprus Student Village",
    description: "Academic-focused accommodation for METU students with excellent study facilities and research support areas. Features include 24/7 library access, computer labs, and collaborative study spaces. Designed for serious academic pursuit.",
    university: {
      name: "Middle East Technical University Northern Cyprus Campus (METU NCC)",
      isFromDropdown: true
    },
    location: {
      city: "Nicosia",
      region: "Kalkanli",
      address: "METU Campus Area, Kalkanli, North Cyprus"
    },
    availability: "available",
    image_urls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80"
    ],
    roomVariants: [
      {
        type: "single",
        capacity: 1,
        price: 520,
        priceFrequency: "monthly",
        available: true,
        description: "Academic-focused single room"
      },
      {
        type: "double",
        capacity: 2,
        price: 380,
        priceFrequency: "monthly",
        available: true,
        description: "Study-oriented shared room"
      }
    ],
    contact: {
      phone: "+90 548 890 1234",
      email: "housing@metu.edu.tr",
      whatsapp: "+90 548 890 1234",
      preferredMethod: "email"
    },
    genderRestriction: "mixed",
    facilities: ["WiFi", "Study Room", "Computer Lab", "Security", "Laundry"],
    rules: [
      "Academic performance standards maintained",
      "Study hours respected",
      "Research facilities available 24/7"
    ]
  },
  {
    title: "Affordable Famagusta Student Housing",
    description: "Simple and clean accommodation for students on a tight budget. Located in central Famagusta with easy access to shops, restaurants, and public transportation. Basic amenities provided with focus on cleanliness and safety.",
    university: {
      name: "Eastern Mediterranean University (EMU)",
      isFromDropdown: true
    },
    location: {
      city: "Famagusta",
      region: "City Center",
      address: "Salamis Street, Famagusta, North Cyprus"
    },
    availability: "available",
    image_urls: [
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80",
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80"
    ],
    roomVariants: [
      {
        type: "triple",
        capacity: 3,
        price: 180,
        priceFrequency: "monthly",
        available: true,
        description: "Budget triple room"
      },
      {
        type: "quad",
        capacity: 4,
        price: 150,
        priceFrequency: "monthly",
        available: true,
        description: "Shared quad accommodation"
      }
    ],
    contact: {
      phone: "+90 548 901 2345",
      email: "budget@famagusta.com",
      whatsapp: "+90 548 901 2345",
      preferredMethod: "whatsapp"
    },
    genderRestriction: "mixed",
    facilities: ["WiFi", "Kitchen", "Laundry"],
    rules: [
      "Keep common areas clean",
      "Respect other residents",
      "No loud noise after 10 PM"
    ]
  },
  {
    title: "Male-Only Student Brotherhood House",
    description: "Traditional male-only accommodation fostering brotherhood and Islamic values. Features prayer room, Quran study area, and halal kitchen facilities. Perfect for male Muslim students seeking a supportive religious environment while studying.",
    university: {
      name: "Near East University (NEU)",
      isFromDropdown: true
    },
    location: {
      city: "Nicosia",
      region: "Dereboyu",
      address: "Dereboyu Avenue, Nicosia, North Cyprus"
    },
    availability: "available",
    image_urls: [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
      "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"
    ],
    roomVariants: [
      {
        type: "double",
        capacity: 2,
        price: 320,
        priceFrequency: "monthly",
        available: true,
        description: "Brotherhood style shared room"
      },
      {
        type: "triple",
        capacity: 3,
        price: 250,
        priceFrequency: "monthly",
        available: true,
        description: "Community living space"
      }
    ],
    contact: {
      phone: "+90 548 012 3456",
      email: "brotherhood@nicosia.com",
      whatsapp: "+90 548 012 3456",
      preferredMethod: "whatsapp"
    },
    genderRestriction: "male",
    facilities: ["WiFi", "Kitchen", "Study Room", "Garden"],
    rules: [
      "Islamic values respected",
      "Prayer times observed",
      "Halal food only in kitchen",
      "No smoking or alcohol"
    ]
  }
];

// Seed function
const seedDormitories = async () => {
  try {
    console.log('Starting dormitory seeding process...'.blue);

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      console.log('Creating admin user...'.yellow);
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new User({
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        isVerified: true,
        emailVerified: true
      });
      await admin.save();
      console.log('Admin user created successfully'.green);
    }

    // Clear existing dormitories
    await Dormitory.deleteMany({});
    console.log('Cleared existing dormitories'.yellow);

    // Get the admin user for ownership
    const admin = await User.findOne({ email: 'admin@example.com' });

    // Create dormitories
    const dormitories = dormitoriesData.map(dormData => ({
      ...dormData,
      owner: admin._id,
      moderationStatus: 'approved',
      moderatedBy: admin._id,
      moderatedAt: new Date(),
      views: Math.floor(Math.random() * 500) + 50,
      inquiries: Math.floor(Math.random() * 50) + 5
    }));

    const createdDormitories = await Dormitory.insertMany(dormitories);
    console.log(`${createdDormitories.length} dormitories created successfully`.green);

    // Display summary
    console.log('\n📊 Seeding Summary:'.blue.bold);
    console.log(`✅ Admin User: admin@example.com (password: admin123)`.green);
    console.log(`✅ Dormitories Created: ${createdDormitories.length}`.green);

    console.log('\n🏠 Created Dormitories:'.blue.bold);
    createdDormitories.forEach((dorm, index) => {
      console.log(`${index + 1}. ${dorm.title}`.cyan);
      console.log(`   📍 ${dorm.location.city} - ${dorm.university.name}`.gray);
      console.log(`   💰 ${dorm.roomVariants.map(r => `$${r.price}/${r.priceFrequency}`).join(', ')}`.gray);
      console.log(`   👥 ${dorm.genderRestriction} - ${dorm.availability}`.gray);
    });

    console.log('\n🚀 Ready for testing!'.green.bold);
    console.log('You can now:'.blue);
    console.log('1. Start the backend server: cd sncbackend && npm run dev'.yellow);
    console.log('2. Login as admin: admin@example.com / admin123'.yellow);
    console.log('3. Visit /admin/dormitories to manage dormitories'.yellow);
    console.log('4. Visit /dormitories to browse as a user'.yellow);

  } catch (error) {
    console.error('Error seeding dormitories:'.red, error);
    process.exit(1);
  }
};

// Clear dormitories function
const clearDormitories = async () => {
  try {
    await Dormitory.deleteMany({});
    console.log('All dormitories cleared successfully'.green);
  } catch (error) {
    console.error('Error clearing dormitories:'.red, error);
    process.exit(1);
  }
};

// Run seeding
const runSeeding = async () => {
  await connectDB();
  await seedDormitories();
  process.exit(0);
};

// Export functions
module.exports = {
  seedDormitories,
  clearDormitories
};

// Run if called directly
if (require.main === module) {
  runSeeding();
}