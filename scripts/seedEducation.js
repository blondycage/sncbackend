const mongoose = require('mongoose');
const colors = require('colors');
require('dotenv').config();

const EducationalProgram = require('../models/EducationalProgram');
const User = require('../models/User');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...'.green.bold);
  } catch (error) {
    console.error('Database connection error:'.red.bold, error);
    process.exit(1);
  }
};

// Sample educational programs with scholarships
const educationalPrograms = [
  {
    title: 'Bachelor of Computer Science',
    institution: {
      name: 'Cyprus International University',
      website: 'https://www.ciu.edu.tr',
      accreditation: 'YÖDAK, ABET'
    },
    description: 'A comprehensive computer science program focusing on software development, algorithms, data structures, and emerging technologies. Students will gain hands-on experience with modern programming languages and development frameworks.',
    level: 'undergraduate',
    field: 'computer_science',
    duration: {
      value: 4,
      unit: 'years'
    },
    tuition: {
      amount: 12000,
      currency: 'USD',
      period: 'per_year',
      scholarshipAvailable: true,
      scholarshipDetails: '50% scholarship available for students with high academic performance. Merit-based scholarships up to 75% for exceptional students.'
    },
    location: {
      city: 'Nicosia',
      campus: 'Main Campus',
      address: 'Haspolat, Nicosia, Northern Cyprus'
    },
    requirements: {
      academic: {
        undergraduate: {
          waecNeco: true,
          credits: 6
        }
      },
      documents: {
        passportIdDatapage: true,
        passportPhotograph: true,
        fatherName: true,
        motherName: true,
        highSchoolName: true
      },
      language: {
        englishProficiency: 'ielts',
        minimumScore: '6.0 overall, 5.5 in each band'
      }
    },
    applicationDeadlines: {
      fall: new Date('2024-07-15'),
      spring: new Date('2024-12-15'),
      summer: new Date('2024-04-15')
    },
    startDates: {
      fall: new Date('2024-09-01'),
      spring: new Date('2025-02-01'),
      summer: new Date('2024-06-01')
    },
    images: [
      {
        url: '/images/education/computer-science-lab.jpg',
        description: 'Modern computer science laboratory',
        isPrimary: true
      },
      {
        url: '/images/education/ciu-campus.jpg',
        description: 'CIU campus overview'
      }
    ],
    features: [
      'Modern computer labs',
      'Industry partnerships',
      'Internship opportunities',
      'Research projects',
      'English instruction'
    ],
    contactInfo: {
      email: 'admissions@ciu.edu.tr',
      phone: '+90 392 671 1111',
      admissionsOfficer: {
        name: 'Dr. Ahmet Yılmaz',
        email: 'ayilmaz@ciu.edu.tr',
        phone: '+90 392 671 1112'
      }
    },
    status: 'active',
    moderationStatus: 'approved',
    featured: true,
    tags: ['computer science', 'programming', 'technology', 'scholarship', 'english instruction'],
    metadata: {
      accreditationBodies: ['YÖDAK', 'ABET'],
      partnerUniversities: ['University of London', 'MIT'],
      exchangePrograms: ['Erasmus+', 'Fulbright'],
      careerProspects: ['Software Engineer', 'Data Scientist', 'Systems Analyst', 'IT Consultant']
    }
  },

  {
    title: 'Bachelor of Medicine (M.D.)',
    institution: {
      name: 'Eastern Mediterranean University',
      website: 'https://www.emu.edu.tr',
      accreditation: 'YÖDAK, WHO, IMED'
    },
    description: 'A 6-year medical degree program designed to prepare students for careers in medicine. The program combines theoretical knowledge with practical clinical experience in modern medical facilities.',
    level: 'undergraduate',
    field: 'medicine',
    duration: {
      value: 6,
      unit: 'years'
    },
    tuition: {
      amount: 18000,
      currency: 'USD',
      period: 'per_year',
      scholarshipAvailable: true,
      scholarshipDetails: 'Need-based scholarships up to 40% available. Excellence scholarships for top 10% of applicants.'
    },
    location: {
      city: 'Famagusta',
      campus: 'Medical Faculty',
      address: 'Gazimağusa, Northern Cyprus'
    },
    requirements: {
      academic: {
        undergraduate: {
          waecNeco: true,
          credits: 8
        }
      },
      documents: {
        passportIdDatapage: true,
        passportPhotograph: true,
        fatherName: true,
        motherName: true,
        highSchoolName: true
      },
      language: {
        englishProficiency: 'ielts',
        minimumScore: '6.5 overall, 6.0 in each band'
      }
    },
    applicationDeadlines: {
      fall: new Date('2024-06-30'),
      spring: new Date('2024-11-30')
    },
    startDates: {
      fall: new Date('2024-09-15'),
      spring: new Date('2025-02-15')
    },
    images: [
      {
        url: '/images/education/medical-school.jpg',
        description: 'EMU Medical Faculty building',
        isPrimary: true
      },
      {
        url: '/images/education/anatomy-lab.jpg',
        description: 'Anatomy laboratory'
      }
    ],
    features: [
      'WHO recognized degree',
      'Modern medical facilities',
      'Clinical rotations',
      'Research opportunities',
      'International residency programs'
    ],
    contactInfo: {
      email: 'medical@emu.edu.tr',
      phone: '+90 392 630 1111',
      admissionsOfficer: {
        name: 'Prof. Dr. Fatma Özkan',
        email: 'fatma.ozkan@emu.edu.tr',
        phone: '+90 392 630 1234'
      }
    },
    status: 'active',
    moderationStatus: 'approved',
    featured: true,
    tags: ['medicine', 'healthcare', 'medical degree', 'scholarship', 'who recognized'],
    metadata: {
      accreditationBodies: ['YÖDAK', 'WHO', 'IMED'],
      partnerUniversities: ['Harvard Medical School', 'Johns Hopkins'],
      exchangePrograms: ['Medical Exchange Program'],
      careerProspects: ['Medical Doctor', 'Surgeon', 'Specialist', 'Medical Researcher']
    }
  },

  {
    title: 'Master of Business Administration (MBA)',
    institution: {
      name: 'Near East University',
      website: 'https://www.neu.edu.tr',
      accreditation: 'YÖDAK, AACSB'
    },
    description: 'A comprehensive MBA program designed for working professionals and fresh graduates. Focus on leadership, strategic management, entrepreneurship, and global business practices.',
    level: 'postgraduate_masters',
    field: 'business',
    duration: {
      value: 2,
      unit: 'years'
    },
    tuition: {
      amount: 15000,
      currency: 'USD',
      period: 'per_year',
      scholarshipAvailable: true,
      scholarshipDetails: 'Graduate assistantship positions available with 60% tuition waiver. Industry partnership scholarships up to 50%.'
    },
    location: {
      city: 'Nicosia',
      campus: 'Business School',
      address: 'Near East Boulevard, Nicosia, Northern Cyprus'
    },
    requirements: {
      academic: {
        undergraduate: {
          waecNeco: true,
          credits: 6
        },
        postgraduate: {
          bachelorDegree: true,
          transcript: true,
          cv: true
        }
      },
      documents: {
        passportIdDatapage: true,
        passportPhotograph: true,
        fatherName: true,
        motherName: true,
        highSchoolName: true
      },
      language: {
        englishProficiency: 'ielts',
        minimumScore: '6.5 overall'
      }
    },
    applicationDeadlines: {
      fall: new Date('2024-07-01'),
      spring: new Date('2024-12-01')
    },
    startDates: {
      fall: new Date('2024-09-01'),
      spring: new Date('2025-02-01')
    },
    images: [
      {
        url: '/images/education/business-school.jpg',
        description: 'NEU Business School',
        isPrimary: true
      },
      {
        url: '/images/education/mba-classroom.jpg',
        description: 'MBA classroom'
      }
    ],
    features: [
      'AACSB accredited',
      'Industry partnerships',
      'Case study methodology',
      'International faculty',
      'Executive mentorship'
    ],
    contactInfo: {
      email: 'mba@neu.edu.tr',
      phone: '+90 392 223 6464',
      admissionsOfficer: {
        name: 'Dr. Mehmet Altun',
        email: 'mehmet.altun@neu.edu.tr',
        phone: '+90 392 223 6465'
      }
    },
    status: 'active',
    moderationStatus: 'approved',
    featured: true,
    tags: ['mba', 'business', 'management', 'scholarship', 'aacsb'],
    metadata: {
      accreditationBodies: ['YÖDAK', 'AACSB'],
      partnerUniversities: ['London Business School', 'Wharton'],
      exchangePrograms: ['Global MBA Exchange'],
      careerProspects: ['Business Manager', 'Consultant', 'Entrepreneur', 'Executive']
    }
  },

  {
    title: 'PhD in Engineering',
    institution: {
      name: 'Cyprus International University',
      website: 'https://www.ciu.edu.tr',
      accreditation: 'YÖDAK, ENAEE'
    },
    description: 'A research-intensive doctoral program in engineering focusing on innovative solutions to contemporary engineering challenges. Students work with leading researchers on cutting-edge projects.',
    level: 'postgraduate_phd',
    field: 'engineering',
    duration: {
      value: 4,
      unit: 'years'
    },
    tuition: {
      amount: 8000,
      currency: 'USD',
      period: 'per_year',
      scholarshipAvailable: true,
      scholarshipDetails: 'Full scholarships available including monthly stipend for research assistants. Partial scholarships up to 80% for qualified candidates.'
    },
    location: {
      city: 'Nicosia',
      campus: 'Engineering Faculty',
      address: 'Haspolat, Nicosia, Northern Cyprus'
    },
    requirements: {
      academic: {
        undergraduate: {
          waecNeco: true,
          credits: 6
        },
        postgraduate: {
          bachelorDegree: true,
          transcript: true,
          cv: true,
          researchProposal: true
        }
      },
      documents: {
        passportIdDatapage: true,
        passportPhotograph: true,
        fatherName: true,
        motherName: true,
        highSchoolName: true
      },
      language: {
        englishProficiency: 'ielts',
        minimumScore: '7.0 overall, 6.5 in each band'
      }
    },
    applicationDeadlines: {
      fall: new Date('2024-06-15'),
      spring: new Date('2024-11-15')
    },
    startDates: {
      fall: new Date('2024-09-01'),
      spring: new Date('2025-02-01')
    },
    images: [
      {
        url: '/images/education/engineering-lab.jpg',
        description: 'Advanced engineering laboratory',
        isPrimary: true
      },
      {
        url: '/images/education/research-facility.jpg',
        description: 'Research facility'
      }
    ],
    features: [
      'Research assistantships',
      'Modern laboratories',
      'International collaborations',
      'Conference funding',
      'Publication support'
    ],
    contactInfo: {
      email: 'phd.engineering@ciu.edu.tr',
      phone: '+90 392 671 1111',
      admissionsOfficer: {
        name: 'Prof. Dr. Ali Reza',
        email: 'ali.reza@ciu.edu.tr',
        phone: '+90 392 671 1115'
      }
    },
    status: 'active',
    moderationStatus: 'approved',
    featured: false,
    tags: ['phd', 'engineering', 'research', 'scholarship', 'doctoral'],
    metadata: {
      accreditationBodies: ['YÖDAK', 'ENAEE'],
      partnerUniversities: ['MIT', 'Stanford University'],
      exchangePrograms: ['Research Exchange Program'],
      careerProspects: ['Research Scientist', 'Professor', 'R&D Manager', 'Technical Consultant']
    }
  },

  {
    title: 'Bachelor of International Relations',
    institution: {
      name: 'University of Kyrenia',
      website: 'https://www.kyrenia.edu.tr',
      accreditation: 'YÖDAK'
    },
    description: 'An interdisciplinary program examining global politics, diplomacy, international law, and cross-cultural communication. Prepares students for careers in diplomacy, international organizations, and global business.',
    level: 'undergraduate',
    field: 'international_relations',
    duration: {
      value: 4,
      unit: 'years'
    },
    tuition: {
      amount: 9000,
      currency: 'USD',
      period: 'per_year',
      scholarshipAvailable: true,
      scholarshipDetails: 'Regional scholarships up to 60% for students from developing countries. Academic excellence scholarships available.'
    },
    location: {
      city: 'Kyrenia',
      campus: 'Main Campus',
      address: 'Girne, Northern Cyprus'
    },
    requirements: {
      academic: {
        undergraduate: {
          waecNeco: true,
          credits: 5
        }
      },
      documents: {
        passportIdDatapage: true,
        passportPhotograph: true,
        fatherName: true,
        motherName: true,
        highSchoolName: true
      },
      language: {
        englishProficiency: 'ielts',
        minimumScore: '6.0 overall'
      }
    },
    applicationDeadlines: {
      fall: new Date('2024-08-01'),
      spring: new Date('2025-01-01')
    },
    startDates: {
      fall: new Date('2024-09-15'),
      spring: new Date('2025-02-15')
    },
    images: [
      {
        url: '/images/education/kyrenia-campus.jpg',
        description: 'University of Kyrenia campus',
        isPrimary: true
      },
      {
        url: '/images/education/lecture-hall.jpg',
        description: 'Modern lecture hall'
      }
    ],
    features: [
      'Model UN participation',
      'Diplomatic simulations',
      'International faculty',
      'Study abroad programs',
      'Internship opportunities'
    ],
    contactInfo: {
      email: 'admissions@kyrenia.edu.tr',
      phone: '+90 392 650 2000',
      admissionsOfficer: {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@kyrenia.edu.tr',
        phone: '+90 392 650 2001'
      }
    },
    status: 'active',
    moderationStatus: 'approved',
    featured: false,
    tags: ['international relations', 'diplomacy', 'politics', 'scholarship', 'global studies'],
    metadata: {
      accreditationBodies: ['YÖDAK'],
      partnerUniversities: ['Georgetown University', 'LSE'],
      exchangePrograms: ['Erasmus+', 'Global Exchange'],
      careerProspects: ['Diplomat', 'Policy Analyst', 'International Business', 'NGO Worker']
    }
  },

  {
    title: 'Certificate in English Language',
    institution: {
      name: 'English Language Institute',
      website: 'https://www.eli-cyprus.com',
      accreditation: 'Cambridge English'
    },
    description: 'Intensive English language program designed to prepare students for academic study or professional development. Covers all language skills with focus on academic English.',
    level: 'language_course',
    field: 'languages',
    duration: {
      value: 6,
      unit: 'months'
    },
    tuition: {
      amount: 3000,
      currency: 'USD',
      period: 'total',
      scholarshipAvailable: true,
      scholarshipDetails: 'Early bird discount 20%. Need-based scholarships up to 30% available for qualified students.'
    },
    location: {
      city: 'Nicosia',
      campus: 'Language Center',
      address: 'Central Nicosia, Northern Cyprus'
    },
    requirements: {
      academic: {
        undergraduate: {
          waecNeco: false,
          credits: 0
        }
      },
      documents: {
        passportIdDatapage: true,
        passportPhotograph: true,
        fatherName: false,
        motherName: false,
        highSchoolName: false
      },
      language: {
        englishProficiency: 'none',
        minimumScore: 'No minimum required'
      }
    },
    applicationDeadlines: {
      fall: new Date('2024-08-15'),
      spring: new Date('2025-01-15'),
      summer: new Date('2024-05-15')
    },
    startDates: {
      fall: new Date('2024-09-01'),
      spring: new Date('2025-02-01'),
      summer: new Date('2024-06-01')
    },
    images: [
      {
        url: '/images/education/language-lab.jpg',
        description: 'Language learning laboratory',
        isPrimary: true
      },
      {
        url: '/images/education/english-class.jpg',
        description: 'English language classroom'
      }
    ],
    features: [
      'Small class sizes',
      'Certified instructors',
      'Cambridge curriculum',
      'Flexible schedules',
      'Cultural activities'
    ],
    contactInfo: {
      email: 'info@eli-cyprus.com',
      phone: '+90 392 228 3456',
      admissionsOfficer: {
        name: 'Ms. Emma Thompson',
        email: 'emma.thompson@eli-cyprus.com',
        phone: '+90 392 228 3457'
      }
    },
    status: 'active',
    moderationStatus: 'approved',
    featured: false,
    tags: ['english', 'language', 'certificate', 'scholarship', 'cambridge'],
    metadata: {
      accreditationBodies: ['Cambridge English'],
      partnerUniversities: ['University of Cambridge'],
      exchangePrograms: [],
      careerProspects: ['English Teacher', 'Translator', 'Academic Preparation', 'Professional Development']
    }
  },

  {
    title: 'Bachelor of Tourism and Hospitality Management',
    institution: {
      name: 'European University of Lefke',
      website: 'https://www.eul.edu.tr',
      accreditation: 'YÖDAK, UNWTO'
    },
    description: 'A comprehensive program combining theoretical knowledge with practical experience in tourism and hospitality management. Students gain hands-on experience through internships in luxury hotels and resorts.',
    level: 'undergraduate',
    field: 'tourism_hospitality',
    duration: {
      value: 4,
      unit: 'years'
    },
    tuition: {
      amount: 10000,
      currency: 'USD',
      period: 'per_year',
      scholarshipAvailable: true,
      scholarshipDetails: 'Industry partnership scholarships up to 50%. Work-study programs available with local hotels and resorts.'
    },
    location: {
      city: 'Lefke',
      campus: 'Tourism Faculty',
      address: 'Lefke, Northern Cyprus'
    },
    requirements: {
      academic: {
        undergraduate: {
          waecNeco: true,
          credits: 5
        }
      },
      documents: {
        passportIdDatapage: true,
        passportPhotograph: true,
        fatherName: true,
        motherName: true,
        highSchoolName: true
      },
      language: {
        englishProficiency: 'ielts',
        minimumScore: '5.5 overall'
      }
    },
    applicationDeadlines: {
      fall: new Date('2024-07-30'),
      spring: new Date('2024-12-30')
    },
    startDates: {
      fall: new Date('2024-09-01'),
      spring: new Date('2025-02-01')
    },
    images: [
      {
        url: '/images/education/tourism-faculty.jpg',
        description: 'Tourism and Hospitality Faculty',
        isPrimary: true
      },
      {
        url: '/images/education/hotel-training.jpg',
        description: 'Hotel management training facility'
      }
    ],
    features: [
      'Industry internships',
      'Practical training facilities',
      'International partnerships',
      'Work-study opportunities',
      'Career placement support'
    ],
    contactInfo: {
      email: 'tourism@eul.edu.tr',
      phone: '+90 392 660 2000',
      admissionsOfficer: {
        name: 'Mr. Okan Çelik',
        email: 'okan.celik@eul.edu.tr',
        phone: '+90 392 660 2001'
      }
    },
    status: 'active',
    moderationStatus: 'approved',
    featured: false,
    tags: ['tourism', 'hospitality', 'management', 'scholarship', 'internship'],
    metadata: {
      accreditationBodies: ['YÖDAK', 'UNWTO'],
      partnerUniversities: ['Glion Institute', 'Les Roches'],
      exchangePrograms: ['Tourism Exchange Program'],
      careerProspects: ['Hotel Manager', 'Tour Operator', 'Event Manager', 'Resort Director']
    }
  }
];

// Seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting educational programs seeding...'.blue.bold);

    // Clear existing programs
    await EducationalProgram.deleteMany({});
    console.log('🗑️  Existing programs cleared'.yellow);

    // Find or create a default admin user for created_by field
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      adminUser = await User.create({
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
        isVerified: true
      });
      console.log('👤 Admin user created'.green);
    }

    // Add createdBy field to all programs
    const programsWithCreator = educationalPrograms.map(program => ({
      ...program,
      createdBy: adminUser._id
    }));

    // Insert programs
    const insertedPrograms = await EducationalProgram.insertMany(programsWithCreator);
    console.log(`✅ Successfully seeded ${insertedPrograms.length} educational programs`.green.bold);

    // Display summary
    console.log('\n📊 Seeding Summary:'.cyan.bold);
    console.log(`   • Total Programs: ${insertedPrograms.length}`);
    console.log(`   • Featured Programs: ${insertedPrograms.filter(p => p.featured).length}`);
    console.log(`   • Programs with Scholarships: ${insertedPrograms.filter(p => p.tuition.scholarshipAvailable).length}`);
    console.log(`   • Universities: ${[...new Set(insertedPrograms.map(p => p.institution.name))].length}`);
    console.log(`   • Cities: ${[...new Set(insertedPrograms.map(p => p.location.city))].length}`);

    console.log('\n🏛️ Programs by Institution:'.cyan);
    const byInstitution = insertedPrograms.reduce((acc, program) => {
      const institution = program.institution.name;
      acc[institution] = (acc[institution] || 0) + 1;
      return acc;
    }, {});
    Object.entries(byInstitution).forEach(([institution, count]) => {
      console.log(`   • ${institution}: ${count} programs`);
    });

    console.log('\n🎓 Programs by Level:'.cyan);
    const byLevel = insertedPrograms.reduce((acc, program) => {
      const level = program.level;
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
    Object.entries(byLevel).forEach(([level, count]) => {
      console.log(`   • ${level.replace('_', ' ').toUpperCase()}: ${count} programs`);
    });

    console.log('\n🌟 Featured Programs:'.cyan);
    insertedPrograms.filter(p => p.featured).forEach(program => {
      console.log(`   • ${program.title} - ${program.institution.name}`);
    });

    console.log('\n🎯 Scholarship Programs:'.cyan);
    insertedPrograms.filter(p => p.tuition.scholarshipAvailable).forEach(program => {
      console.log(`   • ${program.title} - ${program.tuition.scholarshipDetails.substring(0, 80)}...`);
    });

    console.log('\n🚀 Database seeding completed successfully!'.green.bold);
    console.log('You can now test the education platform flow.'.green);

  } catch (error) {
    console.error('❌ Error seeding database:'.red.bold, error);
    console.error('Error details:', error.message);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await seedDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:'.red.bold, error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedDatabase, educationalPrograms }; 