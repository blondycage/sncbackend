const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:5000';

// Test endpoints
const endpoints = [
  { name: 'Root', url: '/', method: 'GET' },
  { name: 'Health Check', url: '/api/health', method: 'GET' },
  { name: 'API Status', url: '/api/status', method: 'GET' },
  { name: 'Auth Routes', url: '/api/auth/register', method: 'POST', skipTest: true },
  { name: 'Listings Routes', url: '/api/listings', method: 'GET' },
  { name: 'Admin Routes', url: '/api/admin/dashboard', method: 'GET', skipTest: true }
];

async function testEndpoint(endpoint) {
  try {
    if (endpoint.skipTest) {
      console.log(`⏭️  Skipping ${endpoint.name} (${endpoint.method} ${endpoint.url})`.yellow);
      return { success: true, skipped: true };
    }

    const response = await axios({
      method: endpoint.method,
      url: `${BASE_URL}${endpoint.url}`,
      timeout: 5000,
      validateStatus: function (status) {
        // Accept any status code for testing purposes
        return status >= 200 && status < 600;
      }
    });

    if (response.status >= 200 && response.status < 400) {
      console.log(`✅ ${endpoint.name} - ${response.status}`.green);
      return { success: true, status: response.status, data: response.data };
    } else {
      console.log(`⚠️  ${endpoint.name} - ${response.status}`.yellow);
      return { success: false, status: response.status, data: response.data };
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`❌ ${endpoint.name} - Server not running`.red);
      return { success: false, error: 'Server not running' };
    } else {
      console.log(`❌ ${endpoint.name} - ${error.message}`.red);
      return { success: false, error: error.message };
    }
  }
}

async function runTests() {
  console.log('🧪 Testing SearchNorthCyprus Backend API...\n'.blue.bold);

  let successCount = 0;
  let skipCount = 0;
  const results = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push({ endpoint, result });
    
    if (result.skipped) {
      skipCount++;
    } else if (result.success) {
      successCount++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Test Results:'.blue.bold);
  console.log(`✅ Successful: ${successCount}`.green);
  console.log(`⏭️  Skipped: ${skipCount}`.yellow);
  console.log(`❌ Failed: ${endpoints.length - successCount - skipCount}`.red);

  // Display detailed results for successful tests
  console.log('\n📋 Detailed Results:'.blue.bold);
  results.forEach(({ endpoint, result }) => {
    if (result.success && !result.skipped && result.data) {
      console.log(`\n${endpoint.name}:`.cyan.bold);
      if (typeof result.data === 'object') {
        console.log(JSON.stringify(result.data, null, 2).substring(0, 200) + '...');
      }
    }
  });

  // Check if server is running
  const serverRunning = results.some(({ result }) => result.success && !result.skipped);
  
  if (serverRunning) {
    console.log('\n🎉 Backend server appears to be running correctly!'.green.bold);
    console.log('🔗 You can now start the frontend or test with a REST client.'.green);
  } else {
    console.log('\n💡 To start the server, run:'.yellow.bold);
    console.log('   npm start'.cyan);
    console.log('   or');
    console.log('   node server.js'.cyan);
  }
}

if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner failed:'.red.bold, error);
    process.exit(1);
  });
}

module.exports = { runTests, testEndpoint }; 