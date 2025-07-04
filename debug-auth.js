import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function debugAuth() {
  console.log('🔍 Debugging Authentication Issues...\n');
  
  try {
    // Test 1: Check server health
    console.log('1. Testing server health...');
    const health = await fetch(`${BASE_URL}/api/health`);
    console.log('Health status:', health.status);
    if (health.ok) {
      const data = await health.json();
      console.log('✅ Server is healthy:', data);
    }
    
    // Test 2: Test login with new credentials
    console.log('\n2. Testing login with new credentials...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'MAILSRCEM',
        password: 'OfficialSRCEM@117'
      }),
      // Important: include credentials to handle cookies
      credentials: 'include'
    });
    
    console.log('Login status:', loginResponse.status);
    console.log('Login headers:', Object.fromEntries(loginResponse.headers.entries()));
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful:', loginData);
      
      // Extract session cookie
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      console.log('Set-Cookie header:', setCookieHeader);
      
      // Test 3: Check auth status
      console.log('\n3. Testing auth status...');
      const authStatusResponse = await fetch(`${BASE_URL}/api/auth-status`, {
        headers: {
          'Cookie': setCookieHeader || ''
        },
        credentials: 'include'
      });
      
      if (authStatusResponse.ok) {
        const authStatus = await authStatusResponse.json();
        console.log('✅ Auth status:', authStatus);
      } else {
        console.log('❌ Auth status check failed:', authStatusResponse.status);
      }
      
      // Test 4: Test protected route (campaigns)
      console.log('\n4. Testing protected route (campaigns)...');
      const campaignsResponse = await fetch(`${BASE_URL}/api/campaigns`, {
        headers: {
          'Cookie': setCookieHeader || ''
        },
        credentials: 'include'
      });
      
      console.log('Campaigns status:', campaignsResponse.status);
      if (campaignsResponse.ok) {
        const campaigns = await campaignsResponse.json();
        console.log('✅ Campaigns fetched successfully:', campaigns.length, 'campaigns');
      } else {
        const error = await campaignsResponse.text();
        console.log('❌ Campaigns fetch failed:', error);
      }
      
      // Test 5: Test campaign creation
      console.log('\n5. Testing campaign creation...');
      const createCampaignResponse = await fetch(`${BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': setCookieHeader || ''
        },
        body: JSON.stringify({
          name: 'Test Campaign ' + Date.now(),
          description: 'Test campaign created via debug script'
        }),
        credentials: 'include'
      });
      
      console.log('Create campaign status:', createCampaignResponse.status);
      if (createCampaignResponse.ok) {
        const newCampaign = await createCampaignResponse.json();
        console.log('✅ Campaign created successfully:', newCampaign);
      } else {
        const error = await createCampaignResponse.text();
        console.log('❌ Campaign creation failed:', error);
      }
      
    } else {
      const error = await loginResponse.text();
      console.log('❌ Login failed:', error);
    }
    
    console.log('\n📋 Debug Summary:');
    console.log('   If you see 401 errors after successful login,');
    console.log('   the issue is likely with session/cookie handling in the browser.');
    console.log('   Try clearing browser cookies or check CORS settings.');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugAuth();
