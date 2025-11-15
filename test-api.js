/**
 * Simple API Test Script for Streamify Platform
 * Run this script to test all API endpoints
 */

const API_BASE = 'http://localhost:3000';

// Test data
const testUser = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'password123'
};

let authToken = '';

async function makeRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
                ...options.headers
            },
            ...options
        });

        const data = await response.json().catch(() => ({}));
        
        console.log(`${options.method || 'GET'} ${endpoint}:`, {
            status: response.status,
            statusText: response.statusText,
            data
        });

        return { response, data };
    } catch (error) {
        console.error(`Error with ${endpoint}:`, error.message);
        return { error };
    }
}

async function testAPI() {
    console.log('🚀 Starting Streamify API Tests\n');

    // Test 1: Health Check
    console.log('📋 Test 1: Health Check');
    await makeRequest('/health');
    console.log('');

    // Test 2: User Registration
    console.log('📋 Test 2: User Registration');
    await makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testUser)
    });
    console.log('');

    // Test 3: User Login
    console.log('📋 Test 3: User Login');
    const loginResult = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: testUser.email,
            password: testUser.password
        })
    });

    if (loginResult.data && loginResult.data.token) {
        authToken = loginResult.data.token;
        console.log('✅ Authentication token obtained');
    }
    console.log('');

    // Test 4: Verify Token
    console.log('📋 Test 4: Verify Token');
    await makeRequest('/api/auth/verify', { method: 'POST' });
    console.log('');

    // Test 5: Get Profile
    console.log('📋 Test 5: Get Profile');
    await makeRequest('/api/auth/profile');
    console.log('');

    // Test 6: Get Videos (Empty List)
    console.log('📋 Test 6: Get Videos');
    await makeRequest('/api/videos');
    console.log('');

    // Test 7: Check Billing Balance
    console.log('📋 Test 7: Check Billing Balance');
    await makeRequest('/api/billing/balance');
    console.log('');

    // Test 8: Deposit Funds
    console.log('📋 Test 8: Deposit Funds');
    await makeRequest('/api/billing/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: 5000 }) // $50.00
    });
    console.log('');

    // Test 9: Analytics Dashboard
    console.log('📋 Test 9: Analytics Dashboard');
    await makeRequest('/api/analytics/dashboard');
    console.log('');

    // Test 10: User Activity
    console.log('📋 Test 10: User Activity');
    await makeRequest('/api/analytics/user');
    console.log('');

    // Test 11: Revenue Report
    console.log('📋 Test 11: Revenue Report');
    await makeRequest('/api/analytics/revenue');
    console.log('');

    // Test 12: Monthly Report
    console.log('📋 Test 12: Monthly Report');
    await makeRequest('/api/analytics/reports/monthly');
    console.log('');

    console.log(' All API tests completed!');
    console.log('\n💡 To test file upload and streaming:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Open browser: http://localhost:3000');
    console.log('   3. Register/Login and upload a video file');
    console.log('   4. Try streaming the uploaded video');
}

// Check if running in Node.js environment
if (typeof require !== 'undefined' && require.main === module) {
    // For Node.js testing (requires node-fetch)
    console.log('To run this test script, first install node-fetch:');
    console.log('npm install node-fetch@2');
    console.log('\nThen uncomment the line below and run: node test-api.js');
    console.log('// const fetch = require("node-fetch");');
} else {
    // For browser testing
    testAPI();
}
