const mongoose = require('mongoose');
const colors = require('colors');
require('dotenv').config();

const Job = require('../models/Job');
const User = require('../models/User');

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample job data
const sampleJobs = [
  {
    title: "Senior Software Engineer",
    role: "Software Engineer",
    description: "We are seeking a highly skilled Senior Software Engineer to join our dynamic team. You will be responsible for designing, developing, and maintaining complex software applications. The ideal candidate should have strong experience in full-stack development, system design, and mentoring junior developers. You will work on cutting-edge projects using modern technologies and contribute to architectural decisions that shape our platform's future.",
    salary: {
      min: 4000,
      max: 6000,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "full-time",
    workLocation: "hybrid",
    requirements: [
      "5+ years of experience in software development",
      "Proficiency in JavaScript, TypeScript, React, Node.js",
      "Experience with cloud platforms (AWS, Azure, or GCP)",
      "Strong knowledge of database design and optimization",
      "Excellent problem-solving and communication skills",
      "Experience with microservices architecture"
    ],
    benefits: [
      "Competitive salary with performance bonuses",
      "Health insurance coverage",
      "Flexible working hours",
      "Professional development budget",
      "Remote work options",
      "Annual team retreats"
    ],
    location: {
      city: "Kyrenia",
      region: "Kyrenia District"
    },
    company: {
      name: "TechCyprus Solutions",
      website: "https://techcyprus.com",
      description: "Leading technology company specializing in innovative software solutions for the Mediterranean region."
    },
    contact: {
      email: "careers@techcyprus.com",
      phone: "+90 392 815 1234"
    }
  },
  {
    title: "Marketing Manager",
    role: "Marketing Manager",
    description: "Join our growing marketing team as a Marketing Manager and lead our brand development initiatives across North Cyprus. You will be responsible for creating and executing comprehensive marketing strategies, managing digital campaigns, and building brand awareness. The role involves working closely with cross-functional teams to drive customer acquisition and retention through innovative marketing approaches.",
    salary: {
      min: 2500,
      max: 3500,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "full-time",
    workLocation: "on-site",
    requirements: [
      "Bachelor's degree in Marketing, Business, or related field",
      "3+ years of marketing experience",
      "Strong understanding of digital marketing channels",
      "Experience with Google Analytics, social media platforms",
      "Excellent written and verbal communication skills",
      "Creative thinking and analytical mindset"
    ],
    benefits: [
      "Competitive salary package",
      "Health and dental insurance",
      "Marketing conference attendance",
      "Creative workspace environment",
      "Performance-based bonuses",
      "Career advancement opportunities"
    ],
    location: {
      city: "Nicosia",
      region: "Nicosia District"
    },
    company: {
      name: "Cyprus Media Group",
      website: "https://cyprusmedia.com",
      description: "Premier media and advertising agency serving businesses across the Eastern Mediterranean."
    },
    contact: {
      email: "hr@cyprusmedia.com",
      phone: "+90 392 227 5678"
    }
  },
  {
    title: "Hotel Front Desk Supervisor",
    role: "Front Desk Supervisor",
    description: "We are looking for an experienced Front Desk Supervisor to oversee our front office operations at a luxury beachfront resort. The successful candidate will manage guest check-ins/check-outs, supervise front desk staff, handle guest inquiries and complaints, and ensure exceptional customer service standards. This is an excellent opportunity for someone passionate about hospitality and guest satisfaction.",
    salary: {
      min: 1800,
      max: 2400,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "full-time",
    workLocation: "on-site",
    requirements: [
      "Diploma in Hotel Management or related field",
      "2+ years of front desk experience in hospitality",
      "Fluent in English and Turkish, additional languages preferred",
      "Strong leadership and team management skills",
      "Excellent customer service orientation",
      "Experience with hotel management systems"
    ],
    benefits: [
      "Attractive salary with tips",
      "Accommodation provided",
      "Meals during shifts",
      "Health insurance",
      "Staff discounts at resort facilities",
      "International hospitality training"
    ],
    location: {
      city: "Famagusta",
      region: "Famagusta District"
    },
    company: {
      name: "Azure Bay Resort",
      website: "https://azurebayresort.com",
      description: "Luxury 5-star beachfront resort offering world-class hospitality and entertainment experiences."
    },
    contact: {
      email: "recruitment@azurebayresort.com",
      phone: "+90 392 366 9876"
    }
  },
  {
    title: "Financial Analyst",
    role: "Financial Analyst",
    description: "Join our finance team as a Financial Analyst and play a crucial role in driving our company's financial planning and analysis. You will be responsible for preparing financial reports, conducting variance analysis, supporting budgeting processes, and providing insights to support strategic decision-making. The ideal candidate has strong analytical skills and attention to detail.",
    salary: {
      min: 2200,
      max: 3000,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "full-time",
    workLocation: "hybrid",
    requirements: [
      "Bachelor's degree in Finance, Accounting, or Economics",
      "2+ years of financial analysis experience",
      "Proficiency in Excel, financial modeling",
      "Knowledge of accounting principles and standards",
      "Strong analytical and problem-solving skills",
      "Professional certification (CFA, ACCA) preferred"
    ],
    benefits: [
      "Competitive salary and bonuses",
      "Professional certification support",
      "Health and life insurance",
      "Flexible working arrangements",
      "Annual leave and sick leave",
      "Training and development opportunities"
    ],
    location: {
      city: "Kyrenia",
      region: "Kyrenia District"
    },
    company: {
      name: "Cyprus Investment Bank",
      website: "https://cyprusbank.com",
      description: "Leading financial institution providing comprehensive banking and investment services across North Cyprus."
    },
    contact: {
      email: "careers@cyprusbank.com",
      phone: "+90 392 815 4321"
    }
  },
  {
    title: "English Teacher",
    role: "English Teacher",
    description: "We are seeking a qualified English Teacher to join our international school team. The successful candidate will teach English language and literature to students aged 11-18, develop engaging lesson plans, assess student progress, and contribute to the school's academic excellence. This is a rewarding opportunity for educators passionate about inspiring young minds.",
    salary: {
      min: 1500,
      max: 2200,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "full-time",
    workLocation: "on-site",
    requirements: [
      "Bachelor's degree in English, Education, or related field",
      "Teaching qualification (PGCE, TEFL, or equivalent)",
      "Minimum 2 years of teaching experience",
      "Native or near-native English proficiency",
      "Strong classroom management skills",
      "Passion for education and student development"
    ],
    benefits: [
      "Competitive teacher salary",
      "Housing allowance or accommodation",
      "Health insurance coverage",
      "Professional development opportunities",
      "Summer vacation benefits",
      "International school environment"
    ],
    location: {
      city: "Nicosia",
      region: "Nicosia District"
    },
    company: {
      name: "International Academy of Cyprus",
      website: "https://iacyprus.edu",
      description: "Premier international school providing world-class education with British and American curricula."
    },
    contact: {
      email: "hr@iacyprus.edu",
      phone: "+90 392 228 7890"
    }
  },
  {
    title: "Graphic Designer",
    role: "Graphic Designer",
    description: "We are looking for a creative Graphic Designer to join our design team and help create visually stunning marketing materials, brand assets, and digital content. You will work on diverse projects including print advertisements, social media graphics, website designs, and brand identity development. The ideal candidate should have a strong portfolio and proficiency in design software.",
    salary: {
      min: 1800,
      max: 2800,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "full-time",
    workLocation: "hybrid",
    requirements: [
      "Bachelor's degree in Graphic Design or related field",
      "3+ years of professional design experience",
      "Proficiency in Adobe Creative Suite (Photoshop, Illustrator, InDesign)",
      "Strong portfolio demonstrating creative skills",
      "Understanding of branding and marketing principles",
      "Attention to detail and deadline management"
    ],
    benefits: [
      "Creative work environment",
      "Latest design software and equipment",
      "Flexible working hours",
      "Health insurance",
      "Professional portfolio development",
      "Conference and workshop attendance"
    ],
    location: {
      city: "Kyrenia",
      region: "Kyrenia District"
    },
    company: {
      name: "Creative Minds Studio",
      website: "https://creativeminds.cy",
      description: "Award-winning creative agency specializing in branding, digital marketing, and visual communications."
    },
    contact: {
      email: "jobs@creativeminds.cy",
      phone: "+90 392 815 5555"
    }
  },
  {
    title: "Restaurant Manager",
    role: "Restaurant Manager",
    description: "Join our award-winning restaurant as a Restaurant Manager and oversee daily operations of our fine dining establishment. You will be responsible for staff management, customer service excellence, inventory control, and ensuring compliance with health and safety regulations. The ideal candidate has extensive restaurant management experience and passion for hospitality.",
    salary: {
      min: 2000,
      max: 2800,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "full-time",
    workLocation: "on-site",
    requirements: [
      "Bachelor's degree in Hospitality Management or related field",
      "4+ years of restaurant management experience",
      "Strong leadership and team management skills",
      "Knowledge of food safety and hygiene regulations",
      "Excellent customer service and communication skills",
      "Experience with restaurant POS systems and inventory management"
    ],
    benefits: [
      "Competitive management salary",
      "Performance-based bonuses",
      "Staff meals and discounts",
      "Health insurance",
      "Professional development opportunities",
      "International culinary training"
    ],
    location: {
      city: "Kyrenia",
      region: "Kyrenia District"
    },
    company: {
      name: "Mediterranean Cuisine House",
      website: "https://medcuisine.com",
      description: "Upscale restaurant chain offering authentic Mediterranean cuisine with modern culinary techniques."
    },
    contact: {
      email: "management@medcuisine.com",
      phone: "+90 392 815 7777"
    }
  },
  {
    title: "Civil Engineer",
    role: "Civil Engineer",
    description: "We are seeking a qualified Civil Engineer to join our construction and infrastructure development team. The successful candidate will be involved in planning, designing, and overseeing construction projects including residential developments, commercial buildings, and infrastructure projects. This role offers the opportunity to work on significant development projects across North Cyprus.",
    salary: {
      min: 2800,
      max: 4000,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "full-time",
    workLocation: "on-site",
    requirements: [
      "Bachelor's degree in Civil Engineering",
      "Professional engineering license or equivalent",
      "3+ years of construction/infrastructure experience",
      "Proficiency in AutoCAD, Civil 3D, or similar software",
      "Knowledge of building codes and safety regulations",
      "Strong project management and communication skills"
    ],
    benefits: [
      "Competitive engineering salary",
      "Project completion bonuses",
      "Health and life insurance",
      "Professional development and training",
      "Company vehicle or transportation allowance",
      "Engineering conference attendance"
    ],
    location: {
      city: "Famagusta",
      region: "Famagusta District"
    },
    company: {
      name: "Cyprus Construction Group",
      website: "https://cyprusconst.com",
      description: "Leading construction company specializing in residential, commercial, and infrastructure development projects."
    },
    contact: {
      email: "engineering@cyprusconst.com",
      phone: "+90 392 366 1111"
    }
  },
  {
    title: "Digital Marketing Specialist",
    role: "Digital Marketing Specialist",
    description: "Join our dynamic marketing team as a Digital Marketing Specialist and help drive our online presence and customer acquisition efforts. You will manage social media campaigns, create content for digital platforms, analyze campaign performance, and optimize our digital marketing strategies. This role is perfect for someone passionate about digital trends and data-driven marketing.",
    salary: {
      min: 1600,
      max: 2400,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "full-time",
    workLocation: "remote",
    requirements: [
      "Bachelor's degree in Marketing, Communications, or related field",
      "2+ years of digital marketing experience",
      "Experience with Google Ads, Facebook Ads, LinkedIn campaigns",
      "Knowledge of SEO/SEM best practices",
      "Proficiency in analytics tools (Google Analytics, etc.)",
      "Strong content creation and copywriting skills"
    ],
    benefits: [
      "Remote work flexibility",
      "Competitive salary package",
      "Digital marketing tools and subscriptions",
      "Health insurance",
      "Professional certification support",
      "Performance-based bonuses"
    ],
    location: {
      city: "Nicosia",
      region: "Nicosia District"
    },
    company: {
      name: "Digital Growth Agency",
      website: "https://digitalgrowth.cy",
      description: "Full-service digital marketing agency helping businesses grow their online presence and revenue."
    },
    contact: {
      email: "careers@digitalgrowth.cy",
      phone: "+90 392 227 3333"
    }
  },
  {
    title: "Accounting Clerk",
    role: "Accounting Clerk",
    description: "We are looking for a detail-oriented Accounting Clerk to support our finance department with day-to-day accounting tasks. You will be responsible for data entry, invoice processing, accounts payable/receivable, bank reconciliations, and assisting with month-end closing procedures. This is an excellent entry-level opportunity for someone starting their career in accounting.",
    salary: {
      min: 1200,
      max: 1800,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "full-time",
    workLocation: "on-site",
    requirements: [
      "Associate's or Bachelor's degree in Accounting or related field",
      "1+ years of accounting or bookkeeping experience",
      "Proficiency in accounting software (QuickBooks, SAP, etc.)",
      "Strong attention to detail and accuracy",
      "Basic knowledge of accounting principles",
      "Good organizational and time management skills"
    ],
    benefits: [
      "Entry-level friendly salary",
      "Health insurance coverage",
      "Professional development opportunities",
      "Accounting certification support",
      "Stable work environment",
      "Career growth potential"
    ],
    location: {
      city: "Kyrenia",
      region: "Kyrenia District"
    },
    company: {
      name: "Northern Cyprus Accounting Services",
      website: "https://ncaccounting.com",
      description: "Professional accounting firm providing comprehensive financial services to businesses across North Cyprus."
    },
    contact: {
      email: "jobs@ncaccounting.com",
      phone: "+90 392 815 2222"
    }
  },
  {
    title: "Tourism Sales Representative",
    role: "Sales Representative",
    description: "Join our tourism company as a Sales Representative and help promote North Cyprus as a premier travel destination. You will be responsible for developing relationships with travel agencies, hotels, and tour operators, creating customized travel packages, and achieving sales targets. The ideal candidate should have strong sales skills and passion for the tourism industry.",
    salary: {
      min: 1400,
      max: 2200,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "full-time",
    workLocation: "hybrid",
    requirements: [
      "Bachelor's degree in Tourism, Business, or related field",
      "2+ years of sales experience, preferably in tourism",
      "Excellent communication and negotiation skills",
      "Fluent in English and Turkish, additional languages preferred",
      "Knowledge of North Cyprus tourism attractions",
      "Strong customer relationship management skills"
    ],
    benefits: [
      "Base salary plus commission",
      "Travel opportunities and familiarization trips",
      "Health insurance",
      "Sales performance bonuses",
      "Professional networking opportunities",
      "Industry conference attendance"
    ],
    location: {
      city: "Kyrenia",
      region: "Kyrenia District"
    },
    company: {
      name: "Cyprus Paradise Tours",
      website: "https://cyprusparadise.com",
      description: "Leading tourism company offering comprehensive travel services and unique experiences in North Cyprus."
    },
    contact: {
      email: "sales@cyprusparadise.com",
      phone: "+90 392 815 8888"
    }
  },
  {
    title: "Web Developer Intern",
    role: "Web Developer",
    description: "Join our development team as a Web Developer Intern and gain hands-on experience building modern web applications. You will work alongside senior developers on real projects, learn best practices in web development, and contribute to both frontend and backend development tasks. This is an excellent opportunity for recent graduates or students to kickstart their tech career.",
    salary: {
      min: 800,
      max: 1200,
      currency: "USD",
      frequency: "monthly"
    },
    jobType: "internship",
    workLocation: "hybrid",
    requirements: [
      "Currently pursuing or recently completed degree in Computer Science or related field",
      "Basic knowledge of HTML, CSS, JavaScript",
      "Familiarity with React, Node.js, or similar frameworks",
      "Understanding of version control (Git)",
      "Eagerness to learn and adapt to new technologies",
      "Good problem-solving skills and attention to detail"
    ],
    benefits: [
      "Mentorship from senior developers",
      "Real-world project experience",
      "Flexible internship schedule",
      "Potential for full-time employment",
      "Learning and development resources",
      "Modern development environment"
    ],
    location: {
      city: "Nicosia",
      region: "Nicosia District"
    },
    company: {
      name: "StartupHub Cyprus",
      website: "https://startuphub.cy",
      description: "Innovative startup incubator and development company fostering the next generation of tech talent."
    },
    contact: {
      email: "internships@startuphub.cy",
      phone: "+90 392 227 4444"
    }
  }
];

// Function to create a dummy user for job posting
const createDummyUser = async () => {
  try {
    // Check if dummy user already exists
    let dummyUser = await User.findOne({ email: 'admin@seedjobs.com' });
    
    if (!dummyUser) {
      dummyUser = await User.create({
        username: 'jobseeder',
        email: 'admin@seedjobs.com',
        firstName: 'Job',
        lastName: 'Seeder',
        role: 'admin',
        isActive: true,
        isVerified: true,
        emailVerified: true,
        location: {
          city: 'Kyrenia',
          region: 'Kyrenia District'
        }
      });
      console.log('✅ Dummy user created successfully'.green);
    } else {
      console.log('✅ Using existing dummy user'.green);
    }
    
    return dummyUser;
  } catch (error) {
    console.error('❌ Error creating dummy user:', error);
    throw error;
  }
};

// Function to clear existing jobs
const clearJobs = async () => {
  try {
    const deleteResult = await Job.deleteMany({});
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing jobs`.yellow);
  } catch (error) {
    console.error('❌ Error clearing jobs:', error);
    throw error;
  }
};

// Function to seed jobs
const seedJobs = async () => {
  try {
    console.log('🌱 Starting job seeding process...'.blue.bold);
    
    // Connect to database
    await connectDB();
    
    // Clear existing jobs
    await clearJobs();
    
    // Create dummy user for job posting
    const dummyUser = await createDummyUser();
    
    // Prepare jobs data with user reference
    const jobsWithUser = sampleJobs.map(job => ({
      ...job,
      postedBy: dummyUser._id,
      moderationStatus: 'approved', // Auto-approve for demo purposes
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      views: Math.floor(Math.random() * 500) + 50, // Random views between 50-549
      applicationCount: Math.floor(Math.random() * 15), // Random applications 0-14
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)), // Random date within last 7 days
    }));
    
    // Insert jobs
    const createdJobs = await Job.insertMany(jobsWithUser);
    
    console.log(`✅ Successfully seeded ${createdJobs.length} jobs`.green.bold);
    
    // Display summary
    console.log('\n📊 Seeding Summary:'.blue.bold);
    console.log(`   Total Jobs Created: ${createdJobs.length}`.green);
    console.log(`   Job Types: ${[...new Set(createdJobs.map(job => job.jobType))].join(', ')}`.cyan);
    console.log(`   Work Locations: ${[...new Set(createdJobs.map(job => job.workLocation))].join(', ')}`.cyan);
    console.log(`   Cities: ${[...new Set(createdJobs.map(job => job.location.city))].join(', ')}`.cyan);
    
    // Display some sample jobs
    console.log('\n📋 Sample Jobs Created:'.blue.bold);
    createdJobs.slice(0, 5).forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.title} at ${job.company.name} (${job.location.city})`.white);
    });
    
    console.log('\n🎉 Job seeding completed successfully!'.green.bold);
    
  } catch (error) {
    console.error('❌ Job seeding failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed'.gray);
  }
};

// Run the seeding if called directly
if (require.main === module) {
  seedJobs();
}

module.exports = { seedJobs, clearJobs, sampleJobs }; 