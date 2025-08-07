import fetch from 'node-fetch';

async function quickTest() {
  try {
    console.log('🔍 Quick server check...');
    const response = await fetch('http://localhost:5000/api/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is healthy!');
      console.log('Status:', data.status);
      console.log('Database:', data.database);
      console.log('Timestamp:', data.timestamp);
    } else {
      console.log('❌ Server responded with status:', response.status);
    }
  } catch (error) {
    console.log('❌ Cannot connect to server:', error.message);
    console.log('Make sure the server is running with: npm run dev');
  }
}

quickTest();
