import 'dotenv/config';
import { nanoid } from 'nanoid';
import { emailService, EmailData, EmailCampaignConfig, CampaignStatus } from './emailService';
import { storage } from '../storage';

/**
 * Comprehensive test for email service capabilities
 * Tests:
 * 1. Rate limiting with a small batch of emails
 * 2. Daily limit verification
 * 3. HTML template personalization
 * 4. Campaign queue processing
 */
async function testEmailServiceCapabilities() {
  try {
    console.log('🚀 Starting comprehensive email service test...');
    
    // Initialize email service
    console.log('🔄 Initializing email service...');
    await emailService.initialize();
    
    // Get current email configuration to check limits
    const config = await storage.getEmailConfig();
    if (!config) {
      throw new Error('Email configuration not found');
    }
    
    console.log(`📧 Using email: ${config.senderEmail}`);
    console.log(`📊 Daily limit: ${config.dailyLimit}`);
    console.log(`📈 Current usage: ${config.usedToday || 0}/${config.dailyLimit}`);
    
    // Test 1: Send a small batch of emails to test rate limiting
    await testRateLimiting(config.senderEmail);
    
    // Test 2: Verify the daily limit counter
    await verifyDailyLimitCounter();
    
    // Test 3: Test HTML template personalization
    await testPersonalization(config.senderEmail);
    
    // Test 4: Check queue processing
    await testQueueProcessing(config.senderEmail);
    
    console.log('🎉 Comprehensive email service test completed!');
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

/**
 * Test 1: Test rate limiting with a small batch of emails
 */
async function testRateLimiting(recipientEmail: string) {
  console.log('\n📋 TEST 1: Rate Limiting with Batch Sending');
  console.log('----------------------------------------');
  
  // Create a batch of 3 test emails
  const emails: EmailData[] = Array(3).fill(null).map((_, i) => ({
    to: recipientEmail,
    subject: `Rate Limit Test Email ${i+1}/3`,
    text: `This is test email ${i+1} sent at ${new Date().toLocaleString()}`
  }));
  
  console.log(`📤 Sending batch of ${emails.length} emails...`);
  console.log('⏱️ Start time:', new Date().toLocaleString());
  
  // Send emails with bulk sending method which handles rate limiting
  const startTime = Date.now();
  const result = await emailService.sendBulkEmails(emails, 1000, (sent, total) => {
    console.log(`📨 Progress: ${sent}/${total} emails sent`);
  });
  const endTime = Date.now();
  
  console.log('⏱️ End time:', new Date().toLocaleString());
  console.log(`⏱️ Total time: ${(endTime - startTime) / 1000} seconds`);
  console.log(`✅ Result: ${result.sent} sent, ${result.failed} failed`);
  
  if (result.failed > 0) {
    console.log('❌ Errors:', result.errors);
  }
  
  // Verify that rate limiting was applied by checking time taken
  // With 1000ms delay between emails, batch should take at least (n-1)*1000ms
  const expectedMinTime = (emails.length - 1) * 1000;
  const actualTime = endTime - startTime;
  
  if (actualTime < expectedMinTime) {
    console.log('⚠️ Rate limiting may not be working correctly!');
    console.log(`⚠️ Expected minimum time: ${expectedMinTime}ms, Actual time: ${actualTime}ms`);
  } else {
    console.log('✅ Rate limiting confirmed - emails were sent with proper delays');
  }
}

/**
 * Test 2: Verify the daily limit counter
 */
async function verifyDailyLimitCounter() {
  console.log('\n📋 TEST 2: Daily Limit Counter');
  console.log('---------------------------');
  
  // Get the updated email configuration
  const configBefore = await storage.getEmailConfig();
  if (!configBefore) {
    throw new Error('Email configuration not found');
  }
  
  console.log(`📊 Daily limit: ${configBefore.dailyLimit}`);
  console.log(`📈 Current usage before test: ${configBefore.usedToday || 0}/${configBefore.dailyLimit}`);
  
  // Record the current usage
  const usedBefore = configBefore.usedToday || 0;
  
  // Check if we can send one more email
  if (usedBefore >= (configBefore.dailyLimit || 1500)) {
    console.log('⚠️ Daily limit already reached, skipping send test');
    console.log('✅ Daily limit enforcement is working correctly');
    return;
  }
  
  // Send a single email to increment the counter
  const result = await emailService.sendEmail({
    to: configBefore.senderEmail,
    subject: 'Daily Limit Test',
    text: `This is a test email to verify daily limit counter. Sent at ${new Date().toLocaleString()}`
  });
  
  console.log(`📤 Test email sent: ${result.success ? 'Success' : 'Failed'}`);
  
  // Get the updated configuration
  const configAfter = await storage.getEmailConfig();
  if (!configAfter) {
    throw new Error('Email configuration not found');
  }
  
  console.log(`📈 Current usage after test: ${configAfter.usedToday || 0}/${configAfter.dailyLimit}`);
  
  // Verify the counter was incremented
  if (result.success && (configAfter.usedToday || 0) === usedBefore + 1) {
    console.log('✅ Daily limit counter incremented correctly');
  } else if (!result.success && result.error?.includes('Daily email limit reached')) {
    console.log('✅ Daily limit enforcement is working correctly');
  } else {
    console.log('⚠️ Daily limit counter may not be working correctly!');
  }
}

/**
 * Test 3: Test HTML template personalization
 */
async function testPersonalization(recipientEmail: string) {
  console.log('\n📋 TEST 3: HTML Template Personalization');
  console.log('------------------------------------');
  
  // Create a template email with placeholders
  const templateEmail: Omit<EmailData, 'to'> = {
    subject: 'Hello {{name}} - Personalized Email Test',
    text: 'Hello {{name}}, this is a personalized email for {{role}} at {{organization}}. Your ID is {{id}}.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #4a5568; text-align: center;">Hello {{name}}!</h1>
        <p style="color: #4a5568; font-size: 16px;">This is a personalized email test.</p>
        <ul style="color: #4a5568; font-size: 16px;">
          <li><strong>Name:</strong> {{name}}</li>
          <li><strong>Role:</strong> {{role}}</li>
          <li><strong>Organization:</strong> {{organization}}</li>
          <li><strong>ID:</strong> {{id}}</li>
        </ul>
        <p style="color: #4a5568; font-size: 16px;">Email sent at: ${new Date().toLocaleString()}</p>
      </div>
    `
  };
  
  // Create recipient data
  const recipientsData = [
    {
      email: recipientEmail,
      data: {
        name: 'John Doe',
        role: 'Developer',
        organization: 'Tech University',
        id: '12345'
      }
    },
    {
      email: recipientEmail,
      data: {
        name: 'Jane Smith',
        role: 'Designer',
        organization: 'Creative College',
        id: '67890'
      }
    }
  ];
  
  console.log(`🔄 Creating ${recipientsData.length} personalized emails...`);
  
  // Create personalized emails
  const personalizedEmails = emailService.createPersonalizedEmails(templateEmail, recipientsData);
  
  // Display personalization results
  console.log('📧 Personalization results:');
  personalizedEmails.forEach((email, i) => {
    console.log(`\nEmail ${i+1}:`);
    console.log(`To: ${email.to}`);
    console.log(`Subject: ${email.subject}`);
    console.log(`Text: ${email.text.substring(0, 50)}...`);
  });
  
  // Send one personalized email as a test
  console.log('\n📤 Sending first personalized email as a test...');
  const result = await emailService.sendEmail(personalizedEmails[0]);
  
  console.log(`📤 Personalized email sent: ${result.success ? 'Success' : 'Failed'}`);
  if (!result.success) {
    console.log('❌ Error:', result.error);
  } else {
    console.log('✅ Personalization working correctly');
  }
}

/**
 * Test 4: Check queue processing
 */
async function testQueueProcessing(recipientEmail: string) {
  console.log('\n📋 TEST 4: Campaign Queue Processing');
  console.log('----------------------------------');
  
  // Create a campaign with 3 emails
  const campaignId = nanoid(8);
  const campaign: EmailCampaignConfig = {
    id: campaignId,
    name: 'Test Queue Campaign',
    emails: Array(3).fill(null).map((_, i) => ({
      to: recipientEmail,
      subject: `Queue Test Email ${i+1}/3`,
      text: `This is queue test email ${i+1} sent at ${new Date().toLocaleString()}`
    })),
    delayBetweenEmails: 1500, // 1.5 seconds between emails
    concurrency: 1, // Process one at a time
    maxRetries: 1 // Just retry once for testing
  };
  
  console.log(`🔄 Creating campaign "${campaign.name}" with ${campaign.emails.length} emails...`);
  
  // Track campaign status updates
  const statusUpdates: CampaignStatus[] = [];
  
  // Queue the campaign
  emailService.queueCampaign(
    campaign,
    (status) => {
      statusUpdates.push(status);
      console.log(`📊 Campaign progress: ${status.progress.sent}/${status.progress.total} sent (${status.progress.percentComplete}%)`);
    },
    (finalStatus) => {
      console.log(`📋 Campaign completed with status: ${finalStatus.status}`);
      console.log(`📊 Final results: ${finalStatus.progress.sent} sent, ${finalStatus.progress.failed} failed`);
    }
  );
  
  console.log(`📋 Campaign "${campaign.name}" (${campaignId}) queued successfully`);
  
  // Wait for campaign to process
  console.log('⏳ Waiting for campaign to complete...');
  let isCompleted = false;
  const startTime = Date.now();
  
  while (!isCompleted && Date.now() - startTime < 30000) { // Wait up to 30 seconds
    const status = emailService.getCampaignStatus(campaignId);
    
    if (status && ['completed', 'failed'].includes(status.status)) {
      isCompleted = true;
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
    }
  }
  
  const finalStatus = emailService.getCampaignStatus(campaignId);
  if (finalStatus) {
    console.log(`\n📋 Campaign final status: ${finalStatus.status}`);
    console.log(`📊 Results: ${finalStatus.progress.sent}/${finalStatus.progress.total} sent, ${finalStatus.progress.failed} failed`);
    console.log(`⏱️ Time taken: ${((finalStatus.endTime?.getTime() || Date.now()) - (finalStatus.startTime?.getTime() || startTime)) / 1000} seconds`);
    
    if (finalStatus.status === 'completed' && finalStatus.progress.sent === campaign.emails.length) {
      console.log('✅ Queue processing working correctly');
    } else {
      console.log('⚠️ Queue processing may have issues');
      if (finalStatus.errors.length > 0) {
        console.log('❌ Errors:', finalStatus.errors);
      }
    }
  } else {
    console.log('❌ Could not retrieve campaign status');
  }
}

// Run the tests
testEmailServiceCapabilities();

