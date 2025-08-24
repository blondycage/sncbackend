const mongoose = require('mongoose');
const EducationalProgram = require('../models/EducationalProgram');
const Application = require('../models/Application');
const User = require('../models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ad-listing-platform');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createSampleData = async () => {
  try {
    await connectDB();

    // Find or create a sample admin user
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        isEmailVerified: true
      });
    }

    // Create sample educational programs
    const samplePrograms = [
      {
        title: 'Computer Science - Bachelor',
        description: 'A comprehensive computer science program covering programming, algorithms, data structures, and software engineering.',
        institution: {
          name: 'Cyprus International University',
          website: 'https://www.ciu.edu.tr',
        },
        level: 'undergraduate',
        fieldOfStudy: 'computer_science',
        duration: { value: 4, unit: 'years' },
        tuition: { amount: 12000, currency: 'USD', period: 'per_year' },
        location: { city: 'Nicosia' },
        language: { instruction: 'English' },
        status: 'active',
        moderationStatus: 'approved',
        featured: true,
        createdBy: adminUser._id,
        tags: ['technology', 'programming', 'software'],
        images: []
      },
      {
        title: 'Business Administration - MBA',
        description: 'Master of Business Administration program focusing on leadership, strategy, and management.',
        institution: {
          name: 'Eastern Mediterranean University',
          website: 'https://www.emu.edu.tr',
        },
        level: 'postgraduate_masters',
        fieldOfStudy: 'business',
        duration: { value: 2, unit: 'years' },
        tuition: { amount: 15000, currency: 'USD', period: 'per_year' },
        location: { city: 'Famagusta' },
        language: { instruction: 'English' },
        status: 'active',
        moderationStatus: 'approved',
        featured: false,
        createdBy: adminUser._id,
        tags: ['business', 'management', 'leadership'],
        images: []
      },
      {
        title: 'English Language Course',
        description: 'Intensive English language course for international students.',
        institution: {
          name: 'Cyprus Language Institute',
          website: 'https://www.cli.edu.tr',
        },
        level: 'language_course',
        fieldOfStudy: 'languages',
        duration: { value: 6, unit: 'months' },
        tuition: { amount: 2000, currency: 'USD', period: 'total' },
        location: { city: 'Kyrenia' },
        language: { instruction: 'English' },
        status: 'active',
        moderationStatus: 'approved',
        featured: false,
        createdBy: adminUser._id,
        tags: ['language', 'english', 'preparation'],
        images: []
      },
      {
        title: 'Engineering - Mechanical',
        description: 'Mechanical Engineering program with focus on design, manufacturing, and innovation.',
        institution: {
          name: 'Near East University',
          website: 'https://www.neu.edu.tr',
        },
        level: 'undergraduate',
        fieldOfStudy: 'engineering',
        duration: { value: 4, unit: 'years' },
        tuition: { amount: 10000, currency: 'USD', period: 'per_year' },
        location: { city: 'Nicosia' },
        language: { instruction: 'English' },
        status: 'pending',
        moderationStatus: 'pending',
        featured: false,
        createdBy: adminUser._id,
        tags: ['engineering', 'mechanical', 'design'],
        images: []
      },
      {
        title: 'Medicine - Bachelor',
        description: 'Six-year medical program preparing students for medical practice.',
        institution: {
          name: 'University of Kyrenia',
          website: 'https://www.kyrenia.edu.tr',
        },
        level: 'undergraduate',
        fieldOfStudy: 'medicine',
        duration: { value: 6, unit: 'years' },
        tuition: { amount: 25000, currency: 'USD', period: 'per_year' },
        location: { city: 'Kyrenia' },
        language: { instruction: 'English' },
        status: 'active',
        moderationStatus: 'approved',
        featured: true,
        createdBy: adminUser._id,
        tags: ['medicine', 'healthcare', 'doctor'],
        images: []
      }
    ];

    // Clear existing programs
    await EducationalProgram.deleteMany({});
    console.log('Cleared existing educational programs');

    // Insert sample programs
    const createdPrograms = await EducationalProgram.insertMany(samplePrograms);
    console.log(`Created ${createdPrograms.length} sample educational programs`);

    // Create sample applications
    const sampleApplications = [
      {
        applicant: adminUser._id,
        program: createdPrograms[0]._id,
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          dateOfBirth: new Date('1995-05-15'),
          nationality: 'American'
        },
        familyInfo: {
          fatherName: 'Robert Doe',
          motherName: 'Mary Doe'
        },
        academicBackground: {
          highSchool: {
            name: 'Example High School',
            graduationYear: 2013,
            gpa: 85
          }
        },
        applicationInfo: {
          intendedStartSemester: 'fall',
          intendedStartYear: 2024,
          motivation: 'I am passionate about computer science and want to pursue a career in software development.'
        },
        status: 'submitted'
      },
      {
        applicant: adminUser._id,
        program: createdPrograms[1]._id,
        personalInfo: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+1234567891',
          dateOfBirth: new Date('1992-08-20'),
          nationality: 'British'
        },
        familyInfo: {
          fatherName: 'David Smith',
          motherName: 'Sarah Smith'
        },
        academicBackground: {
          highSchool: {
            name: 'London Business School',
            graduationYear: 2010,
            gpa: 90
          }
        },
        applicationInfo: {
          intendedStartSemester: 'spring',
          intendedStartYear: 2024,
          motivation: 'I want to advance my career in business management and leadership.'
        },
        status: 'under_review'
      },
      {
        applicant: adminUser._id,
        program: createdPrograms[4]._id,
        personalInfo: {
          firstName: 'Ahmed',
          lastName: 'Hassan',
          email: 'ahmed.hassan@example.com',
          phone: '+1234567892',
          dateOfBirth: new Date('1998-12-10'),
          nationality: 'Egyptian'
        },
        familyInfo: {
          fatherName: 'Mohamed Hassan',
          motherName: 'Fatima Hassan'
        },
        academicBackground: {
          highSchool: {
            name: 'Cairo International School',
            graduationYear: 2016,
            gpa: 95
          }
        },
        applicationInfo: {
          intendedStartSemester: 'fall',
          intendedStartYear: 2024,
          motivation: 'Medicine has always been my passion, and I want to help people through healthcare.'
        },
        status: 'approved'
      }
    ];

    // Clear existing applications
    await Application.deleteMany({});
    console.log('Cleared existing applications');

    // Insert sample applications
    const createdApplications = await Application.insertMany(sampleApplications);
    console.log(`Created ${createdApplications.length} sample applications`);

    console.log('Sample education data created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample data:', error);
    process.exit(1);
  }
};

// Run the script
createSampleData();