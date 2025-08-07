import nodemailer from 'nodemailer';

async function testGmailAuth() {
  console.log('🔍 Testing Gmail Authentication...');
  
  const email = 'worktestingajay@gmail.com';
  const password = 'vetyfsotmgrkumrf';
  
  console.log('📧 Email:', email);
  console.log('🔑 App Password:', password);
  console.log('📏 Password Length:', password.length);
  
  try {
    // Test 1: Basic Gmail transporter
    console.log('\n🧪 Test 1: Basic Gmail Configuration');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: password,
      },
    });
    
    console.log('✅ Transporter created successfully');
    
    // Test 2: Verify connection
    console.log('\n🧪 Test 2: Verifying Connection...');
    await transporter.verify();
    console.log('✅ Gmail connection verified successfully!');
    
    // Test 3: Send a test email
    console.log('\n🧪 Test 3: Sending Test Email...');
    const info = await transporter.sendMail({
      from: email,
      to: email, // Send to yourself
      subject: 'Test Email from Campus Email Automation',
      text: 'This is a test email to verify Gmail configuration.',
      html: '<p>This is a test email to verify Gmail configuration.</p>',
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Gmail Authentication Failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Error Response:', error.response);
    console.error('Error Command:', error.command);
    
    // Common troubleshooting steps
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Make sure 2-Factor Authentication is enabled on your Gmail account');
    console.log('2. Generate a new App Password at: https://myaccount.google.com/apppasswords');
    console.log('3. Use the App Password, not your regular Gmail password');
    console.log('4. Make sure "Less secure app access" is disabled (use App Password instead)');
    console.log('5. Check if your Gmail account has any security restrictions');
    
    // Try alternative configuration
    console.log('\n🧪 Alternative Test: Manual SMTP Configuration');
    try {
      const altTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: email,
          pass: password,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      await altTransporter.verify();
      console.log('✅ Alternative configuration works!');
    } catch (altError) {
      console.error('❌ Alternative configuration also failed:', altError.message);
    }
  }
}

// Run the test
testGmailAuth().catch(console.error);
