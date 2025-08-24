const mongoose = require('mongoose');
const colors = require('colors');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Blog = require('../models/Blog');

const sampleBlogs = [
  {
    title: "Exploring the Beautiful Beaches of Northern Cyprus",
    excerpt: "Discover the pristine beaches and crystal-clear waters that make Northern Cyprus a Mediterranean paradise. From secluded coves to bustling resort areas.",
    content: `
      <div class="blog-content">
        <p>Northern Cyprus is home to some of the most stunning beaches in the Mediterranean. With over 400 kilometers of coastline, the island offers everything from secluded coves to vibrant beach resorts.</p>
        
        <h2>Top Beach Destinations</h2>
        
        <h3>Golden Beach (Altın Kumsal)</h3>
        <p>Located on the Karpaz Peninsula, Golden Beach is often considered one of the most beautiful beaches in Northern Cyprus. Its name comes from the golden sand that stretches for miles along the coast.</p>
        
        <h3>Acapulco Beach</h3>
        <p>Near Kyrenia, Acapulco Beach offers excellent facilities including beach bars, restaurants, and water sports. It's perfect for families and those looking for a more active beach experience.</p>
        
        <h3>Alagadi Beach</h3>
        <p>Famous for its turtle nesting sites, Alagadi Beach is a protected area where loggerhead and green turtles come to lay their eggs between May and October.</p>
        
        <h2>Best Time to Visit</h2>
        <p>The best time to enjoy the beaches is from May to October when the weather is warm and sunny. The water temperature is perfect for swimming and water sports.</p>
        
        <h2>What to Bring</h2>
        <ul>
          <li>Sunscreen (high SPF recommended)</li>
          <li>Beach umbrella or tent</li>
          <li>Plenty of water</li>
          <li>Snorkeling gear for exploring underwater life</li>
        </ul>
        
        <p>Whether you're looking for adventure or relaxation, Northern Cyprus beaches offer something for everyone. Plan your beach-hopping adventure today!</p>
      </div>
    `,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2073&q=80",
      alt: "Beautiful beach in Northern Cyprus with crystal clear water",
      caption: "The stunning coastline of Northern Cyprus"
    },
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
        alt: "Alagadi Beach turtle nesting area",
        caption: "Protected turtle nesting beach at Alagadi",
        order: 1
      }
    ],
    categories: ["travel", "beaches", "tourism"],
    tags: ["northern-cyprus", "beaches", "mediterranean", "travel-guide", "vacation"],
    status: "published",
    featured: true,
    seo: {
      metaTitle: "Best Beaches in Northern Cyprus - Travel Guide 2024",
      metaDescription: "Discover the most beautiful beaches in Northern Cyprus. Complete guide to Golden Beach, Acapulco Beach, and more stunning coastal destinations.",
      metaKeywords: ["northern cyprus beaches", "golden beach", "alagadi turtle beach", "cyprus travel", "mediterranean beaches"]
    }
  },
  {
    title: "A Guide to Traditional Cypriot Cuisine",
    excerpt: "Explore the rich flavors and traditional dishes that make Cypriot cuisine unique. From meze to halloumi, discover the culinary heritage of Cyprus.",
    content: `
      <div class="blog-content">
        <p>Cypriot cuisine is a delightful blend of Greek, Turkish, and Middle Eastern influences, creating a unique culinary experience that reflects the island's rich cultural heritage.</p>
        
        <h2>Must-Try Traditional Dishes</h2>
        
        <h3>Meze</h3>
        <p>Perhaps the most famous aspect of Cypriot dining, meze is a collection of small dishes served as appetizers or a complete meal. A traditional meze can include up to 30 different dishes!</p>
        
        <h3>Halloumi Cheese</h3>
        <p>Cyprus's most famous export, halloumi is a semi-hard cheese made from goat and sheep milk. It's perfect grilled or fried and has a unique squeaky texture.</p>
        
        <h3>Souvlaki</h3>
        <p>Grilled meat skewers, typically made with pork, chicken, or lamb, served with pita bread and tzatziki sauce.</p>
        
        <h3>Kleftiko</h3>
        <p>Slow-cooked lamb wrapped in parchment paper with herbs and vegetables, resulting in incredibly tender and flavorful meat.</p>
        
        <h2>Traditional Desserts</h2>
        
        <h3>Baklava</h3>
        <p>Layers of phyllo pastry filled with nuts and sweetened with honey syrup.</p>
        
        <h3>Loukoumades</h3>
        <p>Deep-fried dough balls drizzled with honey and sprinkled with cinnamon.</p>
        
        <h2>Where to Experience Authentic Cuisine</h2>
        <p>Visit traditional tavernas in villages like Bellapais or Lefkara for the most authentic experience. Many restaurants in Kyrenia and Famagusta also serve excellent traditional dishes.</p>
        
        <h2>Cooking Classes</h2>
        <p>Several hotels and cooking schools offer classes where you can learn to prepare traditional Cypriot dishes yourself.</p>
      </div>
    `,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2061&q=80",
      alt: "Traditional Cypriot meze spread",
      caption: "A traditional Cypriot meze with various dishes"
    },
    categories: ["food", "culture", "travel"],
    tags: ["cypriot-cuisine", "traditional-food", "meze", "halloumi", "mediterranean-food"],
    status: "published",
    featured: false,
    seo: {
      metaTitle: "Traditional Cypriot Cuisine Guide - Authentic Recipes",
      metaDescription: "Discover authentic Cypriot cuisine with our complete guide to traditional dishes, from famous halloumi to delicious meze spreads.",
      metaKeywords: ["cypriot cuisine", "traditional cypriot food", "halloumi", "meze", "cyprus recipes"]
    }
  },
  {
    title: "Historical Sites and Ancient Ruins in Northern Cyprus",
    excerpt: "Journey through time as we explore the fascinating historical sites and ancient ruins that tell the story of Northern Cyprus's rich past.",
    content: `
      <div class="blog-content">
        <p>Northern Cyprus is a treasure trove of historical sites and ancient ruins, offering visitors a chance to walk through thousands of years of history.</p>
        
        <h2>Ancient Cities and Archaeological Sites</h2>
        
        <h3>Salamis Ancient City</h3>
        <p>One of the most important archaeological sites in Cyprus, Salamis was founded in the 11th century BC. The ruins include a gymnasium, amphitheater, and Roman baths.</p>
        
        <h3>St. Hilarion Castle</h3>
        <p>Perched high in the Kyrenia mountains, this 11th-century castle offers breathtaking views and fascinating medieval architecture. It's said to have inspired Walt Disney's castle design.</p>
        
        <h3>Bellapais Abbey</h3>
        <p>A beautiful 13th-century Gothic abbey surrounded by mountains and offering spectacular views of the Mediterranean coast.</p>
        
        <h2>Roman and Byzantine Heritage</h2>
        
        <h3>Soli Archaeological Site</h3>
        <p>Ancient Roman city with well-preserved mosaics and the remains of a basilica dating back to the 6th century.</p>
        
        <h3>Vouni Palace</h3>
        <p>The ruins of a 5th-century BC Persian palace offering insights into ancient Persian architecture and lifestyle.</p>
        
        <h2>Medieval Fortifications</h2>
        
        <h3>Kyrenia Castle</h3>
        <p>A Byzantine castle guarding Kyrenia harbor, now housing a shipwreck museum with a 4th-century BC Greek merchant ship.</p>
        
        <h3>Kantara Castle</h3>
        <p>The easternmost of the three mountain castles, offering panoramic views of both the northern and southern coasts.</p>
        
        <h2>Visiting Tips</h2>
        <ul>
          <li>Wear comfortable walking shoes</li>
          <li>Bring sun protection and water</li>
          <li>Visit early morning or late afternoon to avoid heat</li>
          <li>Consider hiring a local guide for detailed historical context</li>
        </ul>
        
        <p>These historical sites offer a unique window into the island's diverse cultural heritage, from ancient Greeks and Romans to Byzantines and medieval crusaders.</p>
      </div>
    `,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      alt: "Ancient ruins of Salamis archaeological site",
      caption: "The magnificent ruins of ancient Salamis"
    },
    categories: ["history", "culture", "tourism"],
    tags: ["historical-sites", "ancient-ruins", "salamis", "st-hilarion", "bellapais", "archaeology"],
    status: "published",
    featured: true,
    seo: {
      metaTitle: "Historical Sites Northern Cyprus - Ancient Ruins Guide",
      metaDescription: "Explore the rich history of Northern Cyprus through its ancient ruins, medieval castles, and archaeological sites. Complete travel guide.",
      metaKeywords: ["northern cyprus history", "salamis ruins", "st hilarion castle", "bellapais abbey", "ancient cyprus"]
    }
  },
  {
    title: "Living in Northern Cyprus: A Complete Expat Guide",
    excerpt: "Considering relocating to Northern Cyprus? This comprehensive guide covers everything you need to know about living as an expat in this Mediterranean paradise.",
    content: `
      <div class="blog-content">
        <p>Northern Cyprus has become an increasingly popular destination for expats seeking a relaxed Mediterranean lifestyle, affordable living costs, and year-round sunshine.</p>
        
        <h2>Why Choose Northern Cyprus?</h2>
        
        <h3>Cost of Living</h3>
        <p>One of the most attractive aspects of living in Northern Cyprus is the affordable cost of living. Housing, utilities, and everyday expenses are significantly lower than most European countries.</p>
        
        <h3>Climate</h3>
        <p>With over 300 days of sunshine per year and mild winters, the climate is perfect for outdoor activities and a healthy lifestyle.</p>
        
        <h3>English-Speaking Community</h3>
        <p>English is widely spoken, making it easy for British and other English-speaking expats to settle in.</p>
        
        <h2>Finding Accommodation</h2>
        
        <h3>Rental Market</h3>
        <p>The rental market offers good value with options ranging from modern apartments to traditional village houses. Popular areas include Kyrenia, Famagusta, and the villages of Bellapais and Catalkoy.</p>
        
        <h3>Property Purchase</h3>
        <p>Foreigners can purchase property in Northern Cyprus, though the legal process requires careful navigation due to the political situation.</p>
        
        <h2>Healthcare</h2>
        
        <h3>Medical Facilities</h3>
        <p>Northern Cyprus has both public and private healthcare systems. Many doctors are trained abroad and speak English.</p>
        
        <h3>Health Insurance</h3>
        <p>Private health insurance is recommended for comprehensive coverage and faster access to treatment.</p>
        
        <h2>Education</h2>
        
        <h3>International Schools</h3>
        <p>Several international schools offer education in English, following British or American curricula.</p>
        
        <h3>Higher Education</h3>
        <p>Universities like Eastern Mediterranean University attract international students with quality programs taught in English.</p>
        
        <h2>Banking and Finance</h2>
        
        <h3>Opening a Bank Account</h3>
        <p>Most major Turkish banks have branches in Northern Cyprus. You'll need a residence permit and proof of income.</p>
        
        <h3>Currency</h3>
        <p>The Turkish Lira is the official currency, though some businesses also accept Euros and British Pounds.</p>
        
        <h2>Transportation</h2>
        
        <h3>Driving</h3>
        <p>A car is essential for getting around. International driving licenses are accepted initially, but you'll need to obtain a local license for long-term residence.</p>
        
        <h3>Public Transport</h3>
        <p>Limited public transport options make car ownership or rental necessary for most expats.</p>
        
        <h2>Social Life and Community</h2>
        
        <h3>Expat Communities</h3>
        <p>Active expat communities organize social events, sports clubs, and cultural activities. Facebook groups and local associations are great for networking.</p>
        
        <h3>Cultural Adaptation</h3>
        <p>Respect for local customs and learning basic Turkish phrases will help you integrate better into the community.</p>
        
        <h2>Legal Considerations</h2>
        
        <h3>Residence Permits</h3>
        <p>Different types of residence permits are available depending on your situation (retirement, investment, employment, etc.).</p>
        
        <h3>Tax Obligations</h3>
        <p>Understand your tax obligations both in Northern Cyprus and your home country to avoid double taxation.</p>
        
        <p>Living in Northern Cyprus offers a unique blend of European and Middle Eastern cultures, stunning natural beauty, and a relaxed pace of life that many expats find irresistible.</p>
      </div>
    `,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1613977257363-707ba9348227?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      alt: "Beautiful Mediterranean lifestyle in Northern Cyprus",
      caption: "The relaxed Mediterranean lifestyle in Northern Cyprus"
    },
    categories: ["living", "expat-life", "relocation"],
    tags: ["expat-guide", "living-in-cyprus", "relocation", "cost-of-living", "expat-community"],
    status: "draft",
    featured: false,
    seo: {
      metaTitle: "Living in Northern Cyprus - Complete Expat Guide 2024",
      metaDescription: "Comprehensive guide for expats moving to Northern Cyprus. Cost of living, healthcare, education, and practical tips for relocating.",
      metaKeywords: ["living in northern cyprus", "expat guide cyprus", "moving to cyprus", "cyprus cost of living", "expat life"]
    }
  },
  {
    title: "Adventure Sports and Outdoor Activities in Northern Cyprus",
    excerpt: "From hiking in the Kyrenia Mountains to diving in pristine waters, discover the thrilling outdoor adventures waiting for you in Northern Cyprus.",
    content: `
      <div class="blog-content">
        <p>Northern Cyprus is an adventure lover's paradise, offering diverse outdoor activities set against stunning Mediterranean backdrops.</p>
        
        <h2>Mountain Adventures</h2>
        
        <h3>Hiking in the Kyrenia Mountains</h3>
        <p>The Kyrenia mountain range offers numerous hiking trails with varying difficulty levels. Popular routes include the Five Finger Mountains and paths around St. Hilarion Castle.</p>
        
        <h3>Rock Climbing</h3>
        <p>The limestone cliffs provide excellent rock climbing opportunities for both beginners and experienced climbers.</p>
        
        <h2>Water Sports</h2>
        
        <h3>Scuba Diving</h3>
        <p>The clear waters around Northern Cyprus offer excellent diving with underwater caves, reefs, and several interesting wreck sites.</p>
        
        <h3>Snorkeling</h3>
        <p>Perfect for beginners, snorkeling spots around Kyrenia and the Karpaz Peninsula offer beautiful underwater life.</p>
        
        <h3>Sailing and Yachting</h3>
        <p>Kyrenia Harbor is a popular base for sailing excursions along the stunning coastline.</p>
        
        <h2>Cycling</h2>
        
        <h3>Mountain Biking</h3>
        <p>Challenging mountain bike trails through forests and hills offer spectacular views and thrilling rides.</p>
        
        <h3>Road Cycling</h3>
        <p>Coastal roads provide scenic cycling routes with moderate difficulty levels.</p>
        
        <h2>Wildlife and Nature</h2>
        
        <h3>Bird Watching</h3>
        <p>The island is on major migration routes, making it excellent for bird watching, especially in spring and autumn.</p>
        
        <h3>Turtle Watching</h3>
        <p>Visit Alagadi Beach during nesting season (May-October) to witness loggerhead and green turtles.</p>
        
        <h2>Best Times for Activities</h2>
        <ul>
          <li>Hiking and cycling: October to April (cooler weather)</li>
          <li>Water sports: May to October (warm water)</li>
          <li>Bird watching: March-May and September-November (migration periods)</li>
          <li>Turtle watching: May to October (nesting season)</li>
        </ul>
        
        <h2>Safety Tips</h2>
        <ul>
          <li>Always inform someone of your planned route</li>
          <li>Carry plenty of water and sun protection</li>
          <li>Check weather conditions before heading out</li>
          <li>Use certified guides for challenging activities</li>
        </ul>
        
        <p>Whether you're seeking adrenaline-pumping adventures or peaceful nature experiences, Northern Cyprus has something for every outdoor enthusiast.</p>
      </div>
    `,
    featuredImage: {
      url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      alt: "Hikers on mountain trail in Northern Cyprus",
      caption: "Adventure hiking in the Kyrenia Mountains"
    },
    categories: ["adventure", "sports", "outdoor"],
    tags: ["adventure-sports", "hiking", "diving", "cycling", "outdoor-activities", "kyrenia-mountains"],
    status: "published",
    featured: false,
    seo: {
      metaTitle: "Adventure Sports Northern Cyprus - Hiking & Diving Guide",
      metaDescription: "Discover adventure sports and outdoor activities in Northern Cyprus. Complete guide to hiking, diving, cycling, and nature experiences.",
      metaKeywords: ["northern cyprus adventure", "hiking kyrenia mountains", "diving cyprus", "outdoor sports", "adventure tourism"]
    }
  }
];

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

const createSampleBlogData = async () => {
  try {
    await connectDB();

    console.log('🔄 Creating sample blog data...'.blue.bold);

    // Find or create an admin user
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('📝 Creating admin user...'.yellow);
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@searchnorthcyprus.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isEmailVerified: true,
        isActive: true
      });
      console.log('✅ Admin user created'.green);
    }

    // Clear existing blog posts
    const existingBlogs = await Blog.countDocuments();
    if (existingBlogs > 0) {
      console.log(`🗑️  Clearing ${existingBlogs} existing blog posts...`.yellow);
      await Blog.deleteMany({});
    }

    console.log('📝 Creating sample blog posts...'.blue);

    // Create blog posts
    for (let i = 0; i < sampleBlogs.length; i++) {
      // Generate slug from title
      const slug = sampleBlogs[i].title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');

      const blogData = {
        ...sampleBlogs[i],
        slug,
        author: adminUser._id,
        publishedAt: sampleBlogs[i].status === 'published' ? new Date() : undefined,
        views: Math.floor(Math.random() * 1000) + 50,
        likes: []
      };

      // Add some random likes
      const likeCount = Math.floor(Math.random() * 20) + 1;
      for (let j = 0; j < likeCount; j++) {
        blogData.likes.push({
          user: adminUser._id,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
        });
      }

      const blog = await Blog.create(blogData);
      console.log(`✅ Created blog post: "${blog.title}"`.green);
    }

    console.log(`🎉 Successfully created ${sampleBlogs.length} sample blog posts!`.green.bold);
    console.log('\n📊 Blog Statistics:'.blue.bold);
    
    const totalBlogs = await Blog.countDocuments();
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });
    const draftBlogs = await Blog.countDocuments({ status: 'draft' });
    const featuredBlogs = await Blog.countDocuments({ featured: true });
    
    console.log(`   Total Blogs: ${totalBlogs}`.cyan);
    console.log(`   Published: ${publishedBlogs}`.green);
    console.log(`   Drafts: ${draftBlogs}`.yellow);
    console.log(`   Featured: ${featuredBlogs}`.magenta);

    console.log('\n🔗 You can now access:'.blue.bold);
    console.log('   Public Blog: http://localhost:3000/blog'.cyan);
    console.log('   Admin Blog Management: http://localhost:3000/admin/blog'.cyan);

  } catch (error) {
    console.error('❌ Error creating sample blog data:'.red.bold, error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB'.gray);
    process.exit(0);
  }
};

// Run the script
createSampleBlogData();