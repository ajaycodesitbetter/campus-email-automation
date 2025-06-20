import 'dotenv/config';
import { emailService } from './emailService';
import { storage } from '../storage';

async function testEmailService() {
  try {
    console.log('🚀 Starting email service test with limit testing...');
    
    // 1. Configure email settings from environment variables
    const emailConfig = {
      senderEmail: process.env.GMAIL_USER || '',
      senderPassword: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '') || '',
      dailyLimit: 3, // Override with a small limit for testing
      usedToday: 0
    };

    if (!emailConfig.senderEmail || !emailConfig.senderPassword) {
      throw new Error('Email credentials missing from environment variables');
    }

    console.log(`📧 Using email: ${emailConfig.senderEmail}`);
    console.log(`📊 Daily limit: ${emailConfig.dailyLimit}`);
    
    // 2. Store the configuration
    console.log('💾 Storing email configuration...');
    await storage.createOrUpdateEmailConfig(emailConfig);
    
    // 3. Initialize the email service
    console.log('🔄 Initializing email service...');
    await emailService.initialize();
    
    // 4. Create a test email with HTML content
    const testEmail = {
      to: emailConfig.senderEmail, // Send to self as a test
      subject: 'Campus Email Automation Test',
      text: 'This is a test email from the Campus Email Automation system.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h1 style="color: #4a5568; text-align: center;">Campus Email Automation</h1>
          <p style="color: #4a5568; font-size: 16px;">This is a test email from the Campus Email Automation system.</p>
          <p style="color: #4a5568; font-size: 16px;">The system is now correctly configured and ready to use.</p>
          <p style="color: #4a5568; font-size: 16px;">Email sent at: ${new Date().toLocaleString()}</p>
          <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
            <p style="margin: 0; color: #718096; font-size: 14px; text-align: center;">
              This is an automated test message. No action is required.
            </p>
          </div>
        </div>
      `
    };
    
    // 5. Send multiple test emails to test the daily limit
    const totalAttempts = 4; // Try to send one more than the limit
    
    for (let i = 1; i <= totalAttempts; i++) {
      try {
        console.log(`📤 Sending test email ${i}/${totalAttempts} to ${testEmail.to}...`);
        
        // Update the email subject for each attempt
        const emailWithCounter = {
          ...testEmail,
          subject: `Campus Email Automation Test #${i}`
        };
        
        await emailService.sendEmail(emailWithCounter);
        console.log(`✅ Email #${i} sent successfully!`);
        
        // Get and display current usage stats
        const updatedConfig = await storage.getEmailConfig();
        console.log(`📊 Current usage: ${updatedConfig?.usedToday || 0}/${updatedConfig?.dailyLimit || 3}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Daily email limit reached')) {
          console.log(`🛑 Daily limit reached at attempt #${i}/${totalAttempts}`);
          console.log(`📊 Limit test successful! System correctly blocked sending after reaching the limit.`);
        } else {
          // Re-throw if it's not the expected limit error
          throw error;
        }
      }
    }
    
    console.log('🎉 Email service limit test completed successfully!');
  } catch (error) {
    console.error('❌ Email service test failed:');
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      console.error(error.stack);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the test
testEmailService();

