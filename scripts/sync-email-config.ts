import 'dotenv/config';
import { storage } from '../server/storage';

/**
 * Sync Environment Variables with Database Email Configuration
 * This script ensures your Gmail credentials from .env are properly stored in the database
 */

async function syncEmailConfig() {
  try {
    console.log('🔄 Syncing email configuration from environment variables...');
    
    // Get environment variables
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    const dailyLimit = parseInt(process.env.EMAIL_DAILY_LIMIT || '150');
    
    if (!gmailUser || !gmailPassword) {
      console.log('❌ Missing email environment variables!');
      console.log('Required:');
      console.log('  GMAIL_USER=your-email@gmail.com');
      console.log('  GMAIL_APP_PASSWORD=your-app-password');
      process.exit(1);
    }
    
    console.log(`📧 Gmail User: ${gmailUser}`);
    console.log(`🔒 Password: ${'*'.repeat(gmailPassword.length)} (hidden)`);
    console.log(`📊 Daily Limit: ${dailyLimit}`);
    
    // Check existing configuration
    const existingConfig = await storage.getEmailConfig();
    
    if (existingConfig) {
      console.log(`\n📋 Existing database config found:`);
      console.log(`   Current Email: ${existingConfig.senderEmail}`);
      console.log(`   Current Limit: ${existingConfig.dailyLimit}`);
      console.log(`   Used Today: ${existingConfig.usedToday || 0}`);
      console.log(`   Configured: ${existingConfig.configured ? 'Yes' : 'No'}`);
    }
    
    // Create or update the email configuration in database
    const config = await storage.createOrUpdateEmailConfig({
      senderEmail: gmailUser,
      senderPassword: gmailPassword,
      dailyLimit: dailyLimit,
      usedToday: existingConfig?.usedToday || 0,
      lastResetDate: existingConfig?.lastResetDate || new Date(),
      configured: true
    });
    
    console.log('\n✅ Email configuration synced successfully!');
    console.log('📋 Database Configuration:');
    console.log(`   Sender Email: ${config.senderEmail}`);
    console.log(`   Daily Limit: ${config.dailyLimit}`);
    console.log(`   Used Today: ${config.usedToday || 0}`);
    console.log(`   Configured: ${config.configured ? 'Yes' : 'No'}`);
    console.log(`   Last Updated: ${config.updatedAt || 'Just now'}`);
    
    console.log('\n🎉 Your Gmail configuration is now properly set up!');
    console.log('📧 The frontend will now show: ' + config.senderEmail);
    console.log('🚀 Email sending is ready to use!');
    
  } catch (error) {
    console.error('❌ Failed to sync email configuration:', error);
    process.exit(1);
  }
}

// Run the sync
syncEmailConfig()
  .then(() => {
    console.log('\n✅ Email configuration sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Email sync failed:', error);
    process.exit(1);
  });
