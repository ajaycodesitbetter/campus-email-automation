import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testLogin() {
  console.log('🔍 Testing Login with New Credentials...\n');
  
  try {
    // Step 1: Login
    console.log('1. Attempting login...');
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
    
    console.log('Login Status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      console.log('✅ Login Response:', data);
      
      // Get the session cookie
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('🍪 Session Cookie:', cookies);
      
      // Step 2: Test a protected route
      console.log('\n2. Testing campaign access...');
      const campaignResponse = await fetch(`${BASE_URL}/api/campaigns`, {
        headers: {
          'Cookie': cookies || ''
        },
        credentials: 'include'
      });
      
      console.log('Campaign Status:', campaignResponse.status);
      
      if (campaignResponse.ok) {
        const campaigns = await campaignResponse.json();
        console.log('✅ Campaigns:', campaigns.length, 'found');
      } else {
        const error = await campaignResponse.text();
        console.log('❌ Campaign Error:', error);
      }
      
      // Step 3: Test creating a campaign
      console.log('\n3. Testing campaign creation...');
      const createResponse = await fetch(`${BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies || ''
        },
        body: JSON.stringify({
          name: 'Test Campaign ' + Date.now(),
          description: 'Test from script'
        }),
        credentials: 'include'
      });
      
      console.log('Create Status:', createResponse.status);
      
      if (createResponse.ok) {
        const newCampaign = await createResponse.json();
        console.log('✅ Campaign Created:', newCampaign);
      } else {
        const error = await createResponse.text();
        console.log('❌ Create Error:', error);
      }
      
    } else {
      const error = await loginResponse.text();
      console.log('❌ Login Failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  }
}

testLogin();
