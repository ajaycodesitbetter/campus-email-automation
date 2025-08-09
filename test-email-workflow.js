import { config } from 'dotenv';
import { emailService } from './server/services/emailService.js';

// Load environment variables
config();

async function testEmailWorkflow() {
  console.log('🧪 Testing Email Workflow');
  console.log('=' .repeat(60));
  
  try {
    console.log('📧 Testing email service initialization...');
    await emailService.initialize();
    console.log('✅ Email service initialized successfully');
    
    // Test email configuration
    console.log('\n🔧 Testing email configuration...');
    const testEmailConfig = {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
      dailyLimit: parseInt(process.env.EMAIL_DAILY_LIMIT) || 1500
    };
    
    console.log('📊 Email Configuration:');
    console.log(`  - Gmail User: ${testEmailConfig.user ? testEmailConfig.user.substring(0, 5) + '***' : 'NOT SET'}`);
    console.log(`  - App Password: ${testEmailConfig.pass ? '***SET***' : 'NOT SET'}`);
    console.log(`  - Daily Limit: ${testEmailConfig.dailyLimit}`);
    
    if (!testEmailConfig.user || !testEmailConfig.pass) {
      throw new Error('Gmail configuration incomplete. Please check GMAIL_USER and GMAIL_APP_PASSWORD in .env file');
    }
    
    // Test placeholder replacement
    console.log('\n🔤 Testing placeholder replacement...');
    const testTemplate = 'Hello {Name}, welcome to {Section}! Email: {Email}';
    const testData = {
      Name: 'John Doe',
      Section: 'Computer Science',
      Email: 'john.doe@example.com'
    };
    
    const personalizedMessage = emailService.replacePlaceholders(testTemplate, testData);
    console.log(`Original: ${testTemplate}`);
    console.log(`Personalized: ${personalizedMessage}`);
    
    if (personalizedMessage.includes('{') || personalizedMessage.includes('}')) {
      throw new Error('Placeholder replacement failed');
    }
    console.log('✅ Placeholder replacement working correctly');
    
    // Test email sending (optional - only if SEND_TEST_EMAIL=true)
    if (process.env.SEND_TEST_EMAIL === 'true') {
      console.log('\n📤 Sending test email...');
      await emailService.sendEmail({
        to: testEmailConfig.user, // Send to self
        subject: '🧪 Campus Email Automation - Test Email',
        text: `This is a test email from your campus email automation system.
        
Test Details:
- Sent at: ${new Date().toISOString()}
- Placeholder test: ${personalizedMessage}
- System status: Working correctly

If you received this email, your email workflow is functioning properly! ✅`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🧪 Campus Email Automation - Test Email</h2>
          <p>This is a test email from your campus email automation system.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #374151; margin-top: 0;">Test Details:</h3>
            <ul style="color: #6b7280;">
              <li><strong>Sent at:</strong> ${new Date().toISOString()}</li>
              <li><strong>Placeholder test:</strong> ${personalizedMessage}</li>
              <li><strong>System status:</strong> Working correctly</li>
            </ul>
          </div>
          
          <p style="color: #16a34a;"><strong>✅ If you received this email, your email workflow is functioning properly!</strong></p>
        </div>`
      });
      console.log('✅ Test email sent successfully');
    } else {
      console.log('\n⏩ Skipping test email send (set SEND_TEST_EMAIL=true to enable)');
    }
    
    console.log('\n🎉 Email workflow test completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('  1. Upload a CSV/Excel file with student data');
    console.log('  2. Create a campaign');
    console.log('  3. Send bulk emails');
    console.log('  4. Monitor email logs and status updates');
    
  } catch (error) {
    console.error('\n❌ Email workflow test failed:');
    console.error('Error details:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('  1. Check Gmail credentials in .env file');
    console.error('  2. Verify Gmail App Password is correct');
    console.error('  3. Ensure Gmail "Less secure app access" is configured');
    console.error('  4. Check internet connection');
  }
}

// Run the test
testEmailWorkflow().catch(console.error);
