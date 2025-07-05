import fetch from 'node-fetch';

const BASE_URL = 'https://campus-email-automation-production.up.railway.app';

async function testGmailConfig() {
  console.log('🔍 Testing Gmail Configuration API...\n');
  
  try {
    // Step 1: Login first
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'MAILSRCEM',
        password: 'OfficialSRCEM@117'
      }),
      credentials: 'include'
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', await loginResponse.text());
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData.message);
    
    // Get the session cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('🍪 Session cookie received:', !!setCookieHeader);
    
    // Step 2: Test getting current Gmail config
    console.log('\n2. Getting current Gmail config...');
    const getConfigResponse = await fetch(`${BASE_URL}/api/email-config`, {
      headers: {
        'Cookie': setCookieHeader || ''
      },
      credentials: 'include'
    });
    
    if (getConfigResponse.ok) {
      const currentConfig = await getConfigResponse.json();
      console.log('✅ Current config:', currentConfig);
    } else {
      console.log('❌ Get config failed:', getConfigResponse.status, await getConfigResponse.text());
    }
    
    // Step 3: Test updating Gmail config
    console.log('\n3. Testing Gmail config update...');
    const updateConfigResponse = await fetch(`${BASE_URL}/api/email-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': setCookieHeader || ''
      },
      body: JSON.stringify({
        senderEmail: 'worktestingajay@gmail.com',
        appPassword: 'your-app-password-here', // Replace with real app password
        dailyLimit: 150
      }),
      credentials: 'include'
    });
    
    console.log('Update config status:', updateConfigResponse.status);
    
    if (updateConfigResponse.ok) {
      const updatedConfig = await updateConfigResponse.json();
      console.log('✅ Gmail config updated:', updatedConfig);
    } else {
      const error = await updateConfigResponse.text();
      console.log('❌ Gmail config update failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGmailConfig();
