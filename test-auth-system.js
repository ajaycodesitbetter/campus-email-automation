import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testAuthSystem() {
  console.log('🔍 Testing Authentication System...\n');

  try {
    // Test 1: Check initial auth status (should be false)
    console.log('1️⃣ Testing initial auth status...');
    const authStatusResponse = await fetch(`${BASE_URL}/api/auth-status`);
    const authStatus = await authStatusResponse.json();
    console.log('Auth status:', authStatus);
    
    // Test 2: Try accessing protected route without auth (should fail)
    console.log('\n2️⃣ Testing protected route without auth...');
    const protectedResponse = await fetch(`${BASE_URL}/api/campaigns`);
    console.log('Protected route status:', protectedResponse.status);
    const protectedData = await protectedResponse.json();
    console.log('Protected route response:', protectedData);
    
    // Test 3: Login with correct credentials
    console.log('\n3️⃣ Testing login with correct credentials...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    console.log('Login status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    // Extract session cookie
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Session cookie set:', !!cookies);
    
    // Test 4: Check auth status after login (should be true)
    console.log('\n4️⃣ Testing auth status after login...');
    const authStatusAfterLogin = await fetch(`${BASE_URL}/api/auth-status`, {
      headers: { 'Cookie': cookies || '' }
    });
    const authStatusAfterData = await authStatusAfterLogin.json();
    console.log('Auth status after login:', authStatusAfterData);
    
    // Test 5: Access protected route after login (should work)
    console.log('\n5️⃣ Testing protected route after login...');
    const protectedAfterLogin = await fetch(`${BASE_URL}/api/campaigns`, {
      headers: { 'Cookie': cookies || '' }
    });
    console.log('Protected route status after login:', protectedAfterLogin.status);
    const protectedAfterData = await protectedAfterLogin.json();
    console.log('Protected route response after login:', protectedAfterData);
    
    // Test 6: Test email config access
    console.log('\n6️⃣ Testing email config access...');
    const emailConfigResponse = await fetch(`${BASE_URL}/api/email-config`, {
      headers: { 'Cookie': cookies || '' }
    });
    console.log('Email config status:', emailConfigResponse.status);
    const emailConfigData = await emailConfigResponse.json();
    console.log('Email config response:', emailConfigData);
    
    // Test 7: Test health check (should work without auth)
    console.log('\n7️⃣ Testing health check endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    console.log('Health check status:', healthResponse.status);
    const healthData = await healthResponse.json();
    console.log('Health check response:', healthData);
    
    console.log('\n✅ Authentication system test completed!');
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
  }
}

testAuthSystem();
