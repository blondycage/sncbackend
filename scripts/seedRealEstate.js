const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
require('dotenv').config();

// Real estate listings data with public image URLs
const realEstateListings = [
  // RENTAL - APARTMENTS
  {
    title: "Luxury Sea View Apartment in Kyrenia",
    description: "Stunning 2-bedroom apartment with panoramic sea views in the heart of Kyrenia. Features modern amenities, fully furnished with elegant décor, private balcony overlooking the Mediterranean, air conditioning, and close proximity to restaurants and cafes. Perfect for long-term rental or holiday stays.",
    listingType: "real_estate",
    category: "rental",
    tags: ["apartment", "furnished", "sea view", "balcony", "kyrenia", "mediterranean", "luxury", "central"],
    price: 1200,
    pricing_frequency: "monthly",
    image_urls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 815 1234",
      email: "rentals@kyreniaproperties.com",
      preferredMethod: "phone"
    },
    location: {
      city: "kyrenia",
      region: "Kyrenia District",
      address: "Kordonboyu, Kyrenia Harbor Area"
    }
  },
  {
    title: "Modern Studio Apartment in Nicosia Center",
    description: "Contemporary studio apartment in downtown Nicosia, perfect for professionals or students. Features modern kitchen appliances, high-speed internet, gym access, and walking distance to universities and business district. Includes all utilities and parking space.",
    listingType: "real_estate",
    category: "rental", 
    tags: ["studio", "furnished", "central", "parking", "gym", "nicosia", "modern", "utilities included"],
    price: 650,
    pricing_frequency: "monthly",
    image_urls: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 227 8901",
      email: "info@nicosiarentals.com",
      preferredMethod: "email"
    },
    location: {
      city: "nicosia",
      region: "Nicosia District", 
      address: "Walled City, Central Nicosia"
    }
  },
  {
    title: "Beachfront Villa with Private Pool",
    description: "Spectacular 4-bedroom beachfront villa in Esentepe with private pool and direct beach access. Fully furnished with luxury amenities, outdoor dining area, BBQ facilities, and stunning sunset views. Ideal for families or groups seeking an unforgettable coastal experience.",
    listingType: "real_estate",
    category: "rental",
    tags: ["villa", "beachfront", "private pool", "furnished", "4 bedroom", "esentepe", "beach access", "sunset views"],
    price: 350,
    pricing_frequency: "daily",
    image_urls: [
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 444 5678",
      email: "villas@cypruscoast.com",
      preferredMethod: "phone"
    },
    location: {
      city: "esentepe",
      region: "Kyrenia District",
      address: "Coastal Road, Esentepe Beach"
    }
  },
  {
    title: "Charming Traditional House in Bellapais",
    description: "Historic stone house in the picturesque village of Bellapais, near the famous abbey. 3 bedrooms, traditional architecture with modern amenities, beautiful garden with mountain views, and peaceful village atmosphere. Perfect for those seeking authentic North Cyprus experience.",
    listingType: "real_estate",
    category: "rental",
    tags: ["house", "traditional", "bellapais", "mountain view", "garden", "3 bedroom", "village", "historic"],
    price: 900,
    pricing_frequency: "monthly",
    image_urls: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 815 9012",
      email: "heritage@bellapaisrentals.com",
      preferredMethod: "email"
    },
    location: {
      city: "bellapais",
      region: "Kyrenia District",
      address: "Village Center, Near Bellapais Abbey"
    }
  },

  // SALE - HOUSES
  {
    title: "Executive Villa with Panoramic Views in Ozankoy",
    description: "Magnificent 5-bedroom executive villa offering breathtaking panoramic views of the Mediterranean Sea and Kyrenia mountains. Features include private swimming pool, landscaped gardens, marble floors, fitted kitchen, multiple terraces, and 3-car garage. Premium location in exclusive residential area.",
    listingType: "real_estate",
    category: "sale",
    tags: ["villa", "5 bedroom", "panoramic view", "swimming pool", "luxury", "ozankoy", "executive", "garage"],
    price: 850000,
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 815 2468",
      email: "luxury@cyprusproperties.com",
      preferredMethod: "phone"
    },
    location: {
      city: "ozankoy",
      region: "Kyrenia District",
      address: "Mountain Ridge Development, Ozankoy Heights"
    }
  },
  {
    title: "Modern Family Home in Catalkoy",
    description: "Contemporary 3-bedroom family home in the sought-after area of Catalkoy. Open-plan living, modern kitchen with island, master bedroom with en-suite, private garden, covered parking, and community pool access. Walking distance to beaches and international schools.",
    listingType: "real_estate",
    category: "sale",
    tags: ["house", "3 bedroom", "modern", "family home", "catalkoy", "community pool", "near schools", "beach access"],
    price: 385000,
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498f?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 444 1357",
      email: "sales@northcyprusbest.com",
      preferredMethod: "email"
    },
    location: {
      city: "catalkoy",
      region: "Kyrenia District",
      address: "New Development Area, Near International School"
    }
  },
  {
    title: "Restored Traditional Townhouse in Famagusta",
    description: "Beautifully restored traditional townhouse in historic Famagusta old town. 4 bedrooms, original stone walls, modern bathrooms, roof terrace with sea views, courtyard garden, and walking distance to ancient city walls and harbors. Perfect blend of history and comfort.",
    listingType: "real_estate",
    category: "sale",
    tags: ["townhouse", "traditional", "restored", "famagusta", "historic", "4 bedroom", "roof terrace", "courtyard"],
    price: 295000,
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 366 7890",
      email: "heritage@famagustahomes.com",
      preferredMethod: "phone"
    },
    location: {
      city: "famagusta",
      region: "Famagusta District",
      address: "Old Town, Near Venetian Walls"
    }
  },

  // SALE - APARTMENTS
  {
    title: "Penthouse Apartment with Roof Garden",
    description: "Exclusive penthouse apartment in new luxury development. 3 bedrooms, 2 bathrooms, spacious living area, modern kitchen, private roof garden with 360-degree views, elevator access, underground parking, and premium finishes throughout. Prime investment opportunity.",
    listingType: "real_estate",
    category: "sale",
    tags: ["penthouse", "apartment", "roof garden", "luxury", "3 bedroom", "elevator", "underground parking", "investment"],
    price: 425000,
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 815 3691",
      email: "penthouses@premiumcyprus.com",
      preferredMethod: "email"
    },
    location: {
      city: "kyrenia",
      region: "Kyrenia District",
      address: "Marina Development, Kyrenia Harbor"
    }
  },
  {
    title: "Affordable 2-Bedroom Apartment Near EMU",
    description: "Great investment opportunity! Well-maintained 2-bedroom apartment near Eastern Mediterranean University. Furnished, good rental potential, secure building, parking space, and walking distance to campus and amenities. Ideal for student accommodation or buy-to-let investment.",
    listingType: "real_estate",
    category: "sale",
    tags: ["apartment", "2 bedroom", "investment", "near university", "furnished", "student accommodation", "parking", "affordable"],
    price: 125000,
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1556020685-ae41abfc9365?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 630 4567",
      email: "student@propertyemu.com",
      preferredMethod: "phone"
    },
    location: {
      city: "famagusta",
      region: "Famagusta District", 
      address: "University Area, Near EMU Campus"
    }
  },

  // RENTAL - COMMERCIAL
  {
    title: "Prime Commercial Space in Kyrenia Center",
    description: "Excellent commercial space in the heart of Kyrenia's business district. 150 sqm ground floor with large windows, perfect for retail, office, or restaurant. High foot traffic area, parking available, and flexible lease terms. Ready for immediate occupation.",
    listingType: "real_estate",
    category: "rental",
    tags: ["commercial", "retail space", "office", "kyrenia center", "ground floor", "high traffic", "parking", "flexible lease"],
    price: 2500,
    pricing_frequency: "monthly",
    image_urls: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1497366412874-3415097a27e7?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 815 7531",
      email: "commercial@kyreniacentral.com",
      preferredMethod: "email"
    },
    location: {
      city: "kyrenia",
      region: "Kyrenia District",
      address: "Central Business District, Main Shopping Street"
    }
  },

  // MORE DIVERSE PROPERTIES
  {
    title: "Eco-Friendly Farmhouse with Land",
    description: "Unique eco-friendly farmhouse on 5 acres of fertile land in the Mesaoria Plain. Solar panels, rainwater collection, organic gardens, fruit trees, chicken coop, and mountain views. Perfect for sustainable living or agritourism venture. Includes farming equipment.",
    listingType: "real_estate",
    category: "sale",
    tags: ["farmhouse", "eco-friendly", "5 acres", "solar panels", "organic", "sustainable", "agritourism", "mountain view"],
    price: 450000,
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 444 9876",
      email: "eco@sustainablecyprus.com",
      preferredMethod: "phone"
    },
    location: {
      city: "morphou",
      region: "Morphou District",
      address: "Rural Area, Mesaoria Plain"
    }
  },
  {
    title: "Student Studio Near GAU University",
    description: "Purpose-built student studio near Girne American University. Compact but efficient design with study area, kitchenette, modern bathroom, high-speed internet, and on-site laundry. Secure building with 24/7 security and bus connections to university.",
    listingType: "real_estate",
    category: "rental",
    tags: ["studio", "student accommodation", "near GAU", "furnished", "security", "internet", "laundry", "transport"],
    price: 400,
    pricing_frequency: "monthly",
    image_urls: [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 650 1234",
      email: "student@gauhousing.com",
      preferredMethod: "email"
    },
    location: {
      city: "kyrenia",
      region: "Kyrenia District",
      address: "University District, Near GAU Campus"
    }
  },
  {
    title: "Luxury Seafront Apartment in Alsancak",
    description: "Ultra-modern seafront apartment with direct beach access in prestigious Alsancak development. 2 bedrooms, floor-to-ceiling windows, designer kitchen, marble bathrooms, private beach club, concierge service, and infinity pool. The epitome of coastal luxury living.",
    listingType: "real_estate",
    category: "sale",
    tags: ["luxury", "seafront", "beach access", "alsancak", "2 bedroom", "private beach club", "concierge", "infinity pool"],
    price: 750000,
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 821 9999",
      email: "luxury@alsancakresidences.com",
      preferredMethod: "phone"
    },
    location: {
      city: "alsancak",
      region: "Kyrenia District",
      address: "Seafront Development, Private Beach Access"
    }
  },
  {
    title: "Mountain Cottage with Spectacular Views",
    description: "Charming mountain cottage in the Besparmak Mountains with spectacular panoramic views. 2 bedrooms, wood-burning fireplace, large deck, hiking trails, and perfect for weekend getaways or permanent mountain living. Peaceful retreat from city life.",
    listingType: "real_estate",
    category: "sale",
    tags: ["cottage", "mountain", "panoramic view", "2 bedroom", "fireplace", "hiking", "retreat", "besparmak"],
    price: 185000,
    pricing_frequency: "fixed",
    image_urls: [
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?q=80&w=800&auto=format&fit=crop"
    ],
    contact: {
      phone: "+90 392 815 5555",
      email: "mountain@cyprusretreat.com",
      preferredMethod: "email"
    },
    location: {
      city: "kayalar",
      region: "Kyrenia District",
      address: "Besparmak Mountains, Mountain Road"
    }
  }
];

// Demo users for different real estate agents/owners
const realEstateUsers = [
  {
    username: "cyprus_properties",
    email: "info@cyprusproperties.com",
    password: "property123",
    firstName: "Elena",
    lastName: "Kostas",
    role: "advertiser",
    isVerified: true,
    phone: "+90 392 815 1234",
    location: {
      city: "kyrenia",
      region: "Kyrenia District"
    }
  },
  {
    username: "kyrenia_real_estate",
    email: "sales@kyreniaproperties.com", 
    password: "kyrenia456",
    firstName: "Mehmet",
    lastName: "Ozkan",
    role: "advertiser",
    isVerified: true,
    phone: "+90 392 815 5678",
    location: {
      city: "kyrenia",
      region: "Kyrenia District"
    }
  },
  {
    username: "famagusta_homes",
    email: "contact@famagustahomes.com",
    password: "famagusta789",
    firstName: "Maria",
    lastName: "Dimitriou",
    role: "advertiser", 
    isVerified: true,
    phone: "+90 392 366 1234",
    location: {
      city: "famagusta",
      region: "Famagusta District"
    }
  },
  {
    username: "student_accommodation",
    email: "info@studenthousing.com",
    password: "student123",
    firstName: "Ali",
    lastName: "Hassan",
    role: "advertiser",
    isVerified: true,
    phone: "+90 392 630 9999",
    location: {
      city: "famagusta", 
      region: "Famagusta District"
    }
  }
];

async function seedRealEstateListings() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || "mongodb+srv://yakson500:ouUZk1W29tDYenor@cluster0.wbprcly.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Create real estate users (only if they don't exist)
    console.log('👥 Creating real estate users...');
    const createdUsers = [];
    
    for (const userData of realEstateUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });

      if (!existingUser) {
        const user = await User.create(userData);
        createdUsers.push(user);
        console.log(`✅ Created user: ${user.username} (${user.email})`);
      } else {
        createdUsers.push(existingUser);
        console.log(`ℹ️  User already exists: ${existingUser.username} (${existingUser.email})`);
      }
    }

    // Create real estate listings
    console.log('🏠 Creating real estate listings...');
    let createdCount = 0;
    
    for (let i = 0; i < realEstateListings.length; i++) {
      const listingData = realEstateListings[i];
      const owner = createdUsers[i % createdUsers.length]; // Rotate through users

      // Check if similar listing already exists
      const existingListing = await Listing.findOne({
        title: listingData.title,
        owner: owner._id
      });

      if (!existingListing) {
        const listing = await Listing.create({
          ...listingData,
          owner: owner._id,
          moderationStatus: "approved",
          status: "active",
          views: Math.floor(Math.random() * 500) + 50, // Random views between 50-550
          is_paid: Math.random() > 0.6, // 40% chance of being paid listing
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
        });
        
        createdCount++;
        console.log(`✅ Created listing: ${listing.title} (Owner: ${owner.username})`);
      } else {
        console.log(`ℹ️  Listing already exists: ${listingData.title}`);
      }
    }

    console.log('🎉 Real estate seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Users created/found: ${createdUsers.length}`);
    console.log(`   - New listings created: ${createdCount}`);
    console.log(`   - Total listings attempted: ${realEstateListings.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding real estate listings:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Allow running this script directly or being called from other scripts
if (require.main === module) {
  seedRealEstateListings();
}

module.exports = { seedRealEstateListings, realEstateListings, realEstateUsers }; 