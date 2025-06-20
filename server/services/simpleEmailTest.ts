import 'dotenv/config';
import nodemailer from 'nodemailer';

async function testEmailService() {
  try {
    console.log('🚀 Starting simple email service test...');
    
    // 1. Get email credentials from environment variables
    const emailUser = process.env.GMAIL_USER;
    const emailPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
    
    if (!emailUser || !emailPassword) {
      throw new Error('Email credentials missing from environment variables');
    }
    
    console.log(`📧 Using email: ${emailUser}`);
    
    // 2. Create nodemailer transporter
    console.log('🔄 Creating email transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
    
    // 3. Verify connection
    console.log('🔍 Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection verified successfully');
    
    // 4. Create a test email with HTML content
    const testEmail = {
      from: emailUser,
      to: emailUser, // Send to self as a test
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
    
    // 5. Send the test email
    console.log(`📤 Sending test email to ${testEmail.to}...`);
    const info = await transporter.sendMail(testEmail);
    
    console.log('✅ Email sent successfully!');
    console.log(`📝 Message ID: ${info.messageId}`);
    console.log(`📊 Response: ${info.response}`);
    
    console.log('🎉 Email service test completed successfully!');
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

