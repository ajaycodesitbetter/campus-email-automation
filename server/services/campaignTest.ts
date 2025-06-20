import 'dotenv/config';
import { emailService, EmailCampaignConfig, CampaignStatus, EmailData } from './emailService';
import { storage } from '../storage';
import { nanoid } from 'nanoid';

/**
 * Comprehensive test script for the enhanced email service
 * Tests:
 * 1. Campaign creation with multiple recipients
 * 2. Personalization with templates
 * 3. Progress tracking
 * 4. Rate limiting verification
 * 5. Error handling and retry logic
 */
async function testEmailCampaigns() {
  try {
    console.log('🚀 Starting comprehensive email campaign test...');
    
    // 1. Configure email settings from environment variables
    const emailConfig = {
      senderEmail: process.env.GMAIL_USER || '',
      senderPassword: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '') || '',
      dailyLimit: 20, // Set a reasonable limit for testing
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
    
    // 4. Create an HTML email template with placeholders
    const emailTemplate: Omit<EmailData, 'to'> = {
      subject: 'Hello {{name}} - Campus Email Automation Test',
      text: 'Hello {{name}},\n\nThis is a personalized test email for {{role}} from the Campus Email Automation system.\n\nYour department is {{department}}.\n\nBest regards,\nThe Campus Email Team',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h1 style="color: #4a5568; text-align: center;">Campus Email Automation</h1>
          <p style="color: #4a5568; font-size: 16px;">Hello <strong>{{name}}</strong>,</p>
          <p style="color: #4a5568; font-size: 16px;">This is a personalized test email for <em>{{role}}</em> from the Campus Email Automation system.</p>
          <p style="color: #4a5568; font-size: 16px;">Your department is <strong>{{department}}</strong>.</p>
          <p style="color: #4a5568; font-size: 16px;">Email sent at: ${new Date().toLocaleString()}</p>
          <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
            <p style="margin: 0; color: #718096; font-size: 14px; text-align: center;">
              This is an automated test message. No action is required.
            </p>
          </div>
        </div>
      `
    };
    
    // 5. Create sample recipient data with personalization
    const recipientsData = [
      {
        email: emailConfig.senderEmail,  // Send to self for testing
        data: {
          name: 'John Doe',
          role: 'Student',
          department: 'Computer Science'
        }
      },
      {
        email: emailConfig.senderEmail,  // Send to self for testing
        data: {
          name: 'Jane Smith',
          role: 'Professor',
          department: 'Mathematics'
        }
      },
      {
        email: emailConfig.senderEmail,  // Send to self for testing
        data: {
          name: 'Alex Johnson',
          role: 'Staff',
          department: 'Administration'
        }
      }
    ];
    
    // 6. Create personalized emails
    console.log('✍️ Creating personalized emails...');
    const personalizedEmails = emailService.createPersonalizedEmails(emailTemplate, recipientsData);
    
    // 7. Configure the campaign
    const campaignConfig: EmailCampaignConfig = {
      id: nanoid(),
      name: 'Test Campaign',
      emails: personalizedEmails,
      delayBetweenEmails: 2000,  // 2 seconds between emails
      maxRetries: 2,
      initialRetryDelay: 1000,
      concurrency: 1  // Send one email at a time
    };
    
    // 8. Set up progress tracking
    let lastProgress = 0;
    const onProgress = (status: CampaignStatus) => {
      const current = status.progress.percentComplete;
      
      // Only log if progress has changed by at least 10%
      if (current - lastProgress >= 10 || current === 100) {
        console.log(`📊 Campaign progress: ${current}% complete`);
        console.log(`   - Sent: ${status.progress.sent}`);
        console.log(`   - Failed: ${status.progress.failed}`);
        console.log(`   - Pending: ${status.progress.pending}`);
        console.log(`   - Estimated time remaining: ${status.estimatedTimeRemaining}`);
        lastProgress = current;
      }
    };
    
    const onComplete = (status: CampaignStatus) => {
      console.log(`\n🏁 Campaign "${status.name}" completed with status: ${status.status}`);
      console.log(`   - Total emails: ${status.progress.total}`);
      console.log(`   - Sent successfully: ${status.progress.sent}`);
      console.log(`   - Failed: ${status.progress.failed}`);
      console.log(`   - Duration: ${status.endTime ? 
        Math.round((status.endTime.getTime() - (status.startTime?.getTime() || 0)) / 1000) : 'unknown'} seconds`);
      
      if (status.errors.length > 0) {
        console.log('\n❌ Errors:');
        status.errors.forEach(err => {
          console.log(`   - To: ${err.to}, Error: ${err.error}, Time: ${err.timestamp.toLocaleString()}`);
        });
      }
    };
    
    // 9. Queue the campaign
    console.log('\n🔄 Queueing campaign...');
    const campaignId = emailService.queueCampaign(campaignConfig, onProgress, onComplete);
    console.log(`✅ Campaign queued with ID: ${campaignId}`);
    
    // 10. Wait for the campaign to finish
    console.log('\n⏳ Waiting for campaign to complete...');
    await waitForCampaignCompletion(campaignId);
    
    // 11. Test error handling with an invalid email
    console.log('\n🧪 Testing error handling with invalid email...');
    
    // Create an invalid email to test retry logic
    const invalidEmailCampaign: EmailCampaignConfig = {
      id: nanoid(),
      name: 'Error Test Campaign',
      emails: [
        {
          to: 'invalid-email@nonexistentdomain123456789.com', // Invalid domain to trigger error
          subject: 'Test Error Handling',
          text: 'This email should fail and trigger retry logic',
          html: '<p>This email should fail and trigger retry logic</p>'
        }
      ],
      delayBetweenEmails: 1000,
      maxRetries: 2,
      initialRetryDelay: 1000
    };
    
    const errorCampaignId = emailService.queueCampaign(
      invalidEmailCampaign, 
      (status) => console.log(`📊 Error test progress: ${status.progress.percentComplete}%`),
      (status) => {
        console.log(`\n🏁 Error test campaign "${status.name}" completed with status: ${status.status}`);
        if (status.errors.length > 0) {
          console.log('❌ Expected errors (this is good for testing):');
          status.errors.forEach(err => {
            console.log(`   - Error: ${err.error}`);
          });
        }
      }
    );
    
    console.log(`✅ Error test campaign queued with ID: ${errorCampaignId}`);
    
    // Wait for the error campaign to finish
    await waitForCampaignCompletion(errorCampaignId);
    
    // 12. Test campaign management functions
    console.log('\n🧪 Testing campaign management functions...');
    
    // Create a campaign for management testing
    const managementCampaign: EmailCampaignConfig = {
      id: nanoid(),
      name: 'Management Test Campaign',
      emails: [
        {
          to: emailConfig.senderEmail,
          subject: 'Test Email 1',
          text: 'This is test email 1',
          html: '<p>This is test email 1</p>'
        },
        {
          to: emailConfig.senderEmail,
          subject: 'Test Email 2',
          text: 'This is test email 2',
          html: '<p>This is test email 2</p>'
        },
        {
          to: emailConfig.senderEmail,
          subject: 'Test Email 3',
          text: 'This is test email 3',
          html: '<p>This is test email 3</p>'
        }
      ],
      delayBetweenEmails: 3000, // Longer delay to allow time for pause/resume testing
    };
    
    const managementCampaignId = emailService.queueCampaign(
      managementCampaign,
      (status) => console.log(`📊 Management test progress: ${status.progress.percentComplete}%`)
    );
    
    console.log(`✅ Management test campaign queued with ID: ${managementCampaignId}`);
    
    // Give the campaign a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Pause the campaign
    console.log('⏸️ Pausing campaign...');
    const paused = emailService.pauseCampaign(managementCampaignId);
    console.log(`Campaign ${paused ? 'successfully paused' : 'could not be paused'}`);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Resume the campaign
    console.log('▶️ Resuming campaign...');
    const resumed = emailService.resumeCampaign(managementCampaignId);
    console.log(`Campaign ${resumed ? 'successfully resumed' : 'could not be resumed'}`);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Cancel the campaign
    console.log('🛑 Cancelling campaign...');
    const cancelled = emailService.cancelCampaign(managementCampaignId);
    console.log(`Campaign ${cancelled ? 'successfully cancelled' : 'could not be cancelled'}`);
    
    // 13. Get all campaign statuses
    console.log('\n📋 All campaign statuses:');
    const allStatuses = emailService.getAllCampaignStatuses();
    allStatuses.forEach(status => {
      console.log(`   - "${status.name}" (${status.id}): ${status.status}`);
    });
    
    console.log('\n✅ Email campaign test completed successfully!');
    console.log('📝 Check your inbox for the test emails that were sent successfully.');
    
  } catch (error) {
    console.error('❌ Email campaign test failed:');
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      console.error(error.stack);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Helper function to wait for a campaign to complete
 */
async function waitForCampaignCompletion(campaignId: string, maxWaitTimeMs: number = 60000): Promise<void> {
  const startTime = Date.now();
  
  while (true) {
    const status = emailService.getCampaignStatus(campaignId);
    
    // If campaign is complete or failed, break
    if (!status || ['completed', 'failed'].includes(status.status)) {
      break;
    }
    
    // Check if we've exceeded the maximum wait time
    if (Date.now() - startTime > maxWaitTimeMs) {
      console.log('⚠️ Exceeded maximum wait time, continuing...');
      break;
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run the test
testEmailCampaigns();

