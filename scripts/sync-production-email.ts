import 'dotenv/config';

/**
 * Production Email Configuration Sync
 * This script can be run to sync email configuration in production
 */

async function syncProductionEmail() {
  try {
    console.log('🔄 Syncing production email configuration...');
    
    // Make a request to our own backend to trigger email sync
    const response = await fetch(`${process.env.VITE_API_BASE_URL || 'https://campus-email-automation-production.up.railway.app'}/api/sync-email-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Production email configuration synced successfully!');
      console.log(result);
    } else {
      console.error('❌ Failed to sync production email configuration');
      console.error('Response:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error syncing production email configuration:', error);
  }
}

syncProductionEmail();
