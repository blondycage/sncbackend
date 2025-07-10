const axios = require('axios');
const colors = require('colors');
require('dotenv').config({ path: '../.env' });

// API base URL
const API_BASE = process.env.CLIENT_URL?.replace('3000', '5000') || 'http://localhost:5000';
const API_URL = `${API_BASE}/api`;

console.log('🔗 API Base URL:', API_BASE.cyan);
console.log('🔗 API URL:', API_URL.cyan);

// Test data for application
const testApplicationData = {
  programId: '', // Will be set dynamically
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  dateOfBirth: '1995-06-15',
  nationality: 'Nigeria',
  passportNumber: 'N12345678',
  address: '123 Main Street',
  city: 'Lagos',
  country: 'Nigeria',
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '+1234567891',
  fatherName: 'Robert Doe',
  fatherOccupation: 'Engineer',
  motherName: 'Mary Doe',
  motherOccupation: 'Teacher',
  highSchoolName: 'Lagos High School',
  highSchoolGraduationYear: '2013',
  waecNecoGrades: 'A1 A1 B2 B3 C4 C5 (Mathematics, English, Physics, Chemistry, Biology, Geography)',
  startSemester: 'Fall',
  startYear: '2024',
  motivationLetter: 'I am passionate about computer science and want to contribute to technological advancement in my country. This program will provide me with the necessary skills and knowledge to achieve my career goals.',
  scholarshipInterest: true,
  scholarshipReason: 'As a student from a developing country, I would benefit greatly from financial assistance to pursue my education.'
};

// Helper function to make API requests
const makeRequest = async (method, endpoint, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ ${method.toUpperCase()} ${endpoint} failed:`.red, error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

// Test functions
const testHealthCheck = async () => {
  console.log('\n🏥 Testing Health Check...'.blue.bold);
  const result = await makeRequest('GET', '/health');
  if (result.success) {
    console.log('✅ Health check passed'.green);
    console.log('   Database:', result.data.database?.status || 'Unknown');
    console.log('   Environment:', result.data.environment || 'Unknown');
  } else {
    console.log('❌ Health check failed'.red);
  }
  return result.success;
};

const testGetPrograms = async () => {
  console.log('\n📚 Testing Get All Programs...'.blue.bold);
  const result = await makeRequest('GET', '/education/programs');
  if (result.success) {
    console.log('✅ Get programs passed'.green);
    console.log(`   Total programs: ${result.data.programs?.length || 0}`);
    console.log(`   Total pages: ${result.data.totalPages || 1}`);
    
    if (result.data.programs && result.data.programs.length > 0) {
      const program = result.data.programs[0];
      console.log(`   Sample program: ${program.title} - ${program.institution.name}`);
      testApplicationData.programId = program._id; // Set for later tests
    }
  } else {
    console.log('❌ Get programs failed'.red);
  }
  return result.success ? result.data : null;
};

const testGetFeaturedPrograms = async () => {
  console.log('\n⭐ Testing Get Featured Programs...'.blue.bold);
  const result = await makeRequest('GET', '/education/featured');
  if (result.success) {
    console.log('✅ Get featured programs passed'.green);
    console.log(`   Featured programs: ${result.data.programs?.length || 0}`);
  } else {
    console.log('❌ Get featured programs failed'.red);
  }
  return result.success;
};

const testGetSingleProgram = async (programId) => {
  if (!programId) {
    console.log('⏭️  Skipping single program test - no program ID available'.yellow);
    return false;
  }

  console.log('\n🎓 Testing Get Single Program...'.blue.bold);
  const result = await makeRequest('GET', `/education/programs/${programId}`);
  if (result.success) {
    console.log('✅ Get single program passed'.green);
    console.log(`   Program: ${result.data.program.title}`);
    console.log(`   Institution: ${result.data.program.institution.name}`);
    console.log(`   Level: ${result.data.program.level}`);
    console.log(`   Scholarship Available: ${result.data.program.tuition.scholarshipAvailable ? 'Yes' : 'No'}`);
  } else {
    console.log('❌ Get single program failed'.red);
  }
  return result.success;
};

const testFilterPrograms = async () => {
  console.log('\n🔍 Testing Program Filtering...'.blue.bold);
  
  // Test filter by level
  const levelResult = await makeRequest('GET', '/education/programs?level=undergraduate');
  if (levelResult.success) {
    console.log('✅ Filter by level passed'.green);
    console.log(`   Undergraduate programs: ${levelResult.data.programs?.length || 0}`);
  }

  // Test filter by scholarship
  const scholarshipResult = await makeRequest('GET', '/education/programs?scholarshipAvailable=true');
  if (scholarshipResult.success) {
    console.log('✅ Filter by scholarship passed'.green);
    console.log(`   Programs with scholarships: ${scholarshipResult.data.programs?.length || 0}`);
  }

  // Test search
  const searchResult = await makeRequest('GET', '/education/programs?search=computer');
  if (searchResult.success) {
    console.log('✅ Search functionality passed'.green);
    console.log(`   Computer-related programs: ${searchResult.data.programs?.length || 0}`);
  }

  return levelResult.success && scholarshipResult.success && searchResult.success;
};

const testCreateApplication = async () => {
  if (!testApplicationData.programId) {
    console.log('⏭️  Skipping application test - no program ID available'.yellow);
    return false;
  }

  console.log('\n📝 Testing Create Application...'.blue.bold);
  const result = await makeRequest('POST', '/education/applications', testApplicationData);
  if (result.success) {
    console.log('✅ Create application passed'.green);
    console.log(`   Application ID: ${result.data.application.applicationId}`);
    console.log(`   Status: ${result.data.application.status}`);
    return result.data.application._id;
  } else {
    console.log('❌ Create application failed'.red);
    return null;
  }
};

const testGetApplications = async () => {
  console.log('\n📋 Testing Get My Applications...'.blue.bold);
  const result = await makeRequest('GET', '/education/applications/my-applications');
  if (result.success) {
    console.log('✅ Get applications passed'.green);
    console.log(`   Total applications: ${result.data.applications?.length || 0}`);
  } else {
    console.log('❌ Get applications failed'.red);
  }
  return result.success;
};

const testAPIStatusEndpoint = async () => {
  console.log('\n📊 Testing API Status...'.blue.bold);
  const result = await makeRequest('GET', '/status');
  if (result.success) {
    console.log('✅ API status check passed'.green);
    console.log(`   API: ${result.data.api}`);
    console.log(`   Version: ${result.data.version}`);
    console.log(`   Status: ${result.data.status}`);
    console.log('   Available Endpoints:');
    Object.entries(result.data.endpoints || {}).forEach(([key, endpoint]) => {
      console.log(`     • ${key}: ${endpoint}`);
    });
  } else {
    console.log('❌ API status check failed'.red);
  }
  return result.success;
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting Education Platform API Tests...'.cyan.bold);
  console.log('═'.repeat(60).gray);

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Health Check
  totalTests++;
  if (await testHealthCheck()) passedTests++;

  // Test 2: API Status
  totalTests++;
  if (await testAPIStatusEndpoint()) passedTests++;

  // Test 3: Get Programs
  totalTests++;
  const programsData = await testGetPrograms();
  if (programsData) passedTests++;

  // Test 4: Get Featured Programs
  totalTests++;
  if (await testGetFeaturedPrograms()) passedTests++;

  // Test 5: Get Single Program
  totalTests++;
  const programId = programsData?.programs?.[0]?._id;
  if (await testGetSingleProgram(programId)) passedTests++;

  // Test 6: Filter Programs
  totalTests++;
  if (await testFilterPrograms()) passedTests++;

  // Test 7: Create Application
  totalTests++;
  const applicationId = await testCreateApplication();
  if (applicationId) passedTests++;

  // Test 8: Get Applications
  totalTests++;
  if (await testGetApplications()) passedTests++;

  // Summary
  console.log('\n' + '═'.repeat(60).gray);
  console.log('📊 Test Results Summary:'.cyan.bold);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`.green);
  console.log(`   Failed: ${totalTests - passedTests}`.red);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Your education platform is working correctly.'.green.bold);
    console.log('\n✨ Next Steps:'.green);
    console.log('   1. Start your frontend: npm run dev');
    console.log('   2. Visit: http://localhost:3000/categories/education');
    console.log('   3. Test the complete user flow');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the API endpoints and database connection.'.yellow.bold);
  }

  console.log('\n🔗 Quick Links:'.blue);
  console.log(`   • Health Check: ${API_URL}/health`);
  console.log(`   • API Status: ${API_URL}/status`);
  console.log(`   • Programs: ${API_URL}/education/programs`);
  console.log(`   • Featured: ${API_URL}/education/featured`);
};

// Additional test for frontend API integration
const testFrontendAPIIntegration = async () => {
  console.log('\n🌐 Testing Frontend API Integration...'.blue.bold);
  
  // Test with the frontend's expected API URL format
  const frontendAPI = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  console.log('   Frontend API URL:', frontendAPI.cyan);
  
  try {
    const response = await axios.get(`${frontendAPI}/education/programs`);
    console.log('✅ Frontend API integration working'.green);
    return true;
  } catch (error) {
    console.log('❌ Frontend API integration failed'.red);
    console.log('   Error:', error.message);
    console.log('\n🔧 Possible fixes:'.yellow);
    console.log('   1. Check NEXT_PUBLIC_API_URL in .env');
    console.log('   2. Ensure backend is running on correct port');
    console.log('   3. Check CORS configuration');
    return false;
  }
};

// Enhanced main function
const main = async () => {
  try {
    await runTests();
    await testFrontendAPIIntegration();
  } catch (error) {
    console.error('❌ Test execution failed:'.red.bold, error);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runTests, testFrontendAPIIntegration }; 