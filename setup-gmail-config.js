import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use Railway's production DATABASE_URL
const PRODUCTION_DATABASE_URL = process.env.DATABASE_URL;

async function setupGmailConfig() {
  const { Pool } = pg;
  const pool = new Pool({ 
    connectionString: PRODUCTION_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📧 Setting up Gmail configuration...');
    
    // Your Gmail details
    const senderEmail = 'worktestingajay@gmail.com';
    const appPassword = 'vetyfsotmgrkumrf'; // Gmail app password for Automail
    const dailyLimit = 150;
    
    console.log('📋 Gmail Details:');
    console.log('   Email:', senderEmail);
    console.log('   Daily Limit:', dailyLimit);
    console.log('   App Password: [HIDDEN]');
    
    // Check if email config exists
    const existingConfig = await pool.query('SELECT * FROM email_config LIMIT 1');
    
    if (existingConfig.rows.length > 0) {
      // Update existing config
      const result = await pool.query(`
        UPDATE email_config 
        SET 
          sender_email = $1,
          sender_password = $2,
          daily_limit = $3,
          used_today = 0,
          last_reset_date = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [senderEmail, appPassword, dailyLimit, existingConfig.rows[0].id]);
      
      console.log('✅ Gmail configuration updated successfully!');
      console.log('📋 Updated config:', {
        id: result.rows[0].id,
        senderEmail: result.rows[0].sender_email,
        dailyLimit: result.rows[0].daily_limit,
        usedToday: result.rows[0].used_today
      });
    } else {
      // Create new config
      const result = await pool.query(`
        INSERT INTO email_config (sender_email, sender_password, daily_limit, used_today, last_reset_date)
        VALUES ($1, $2, $3, 0, CURRENT_TIMESTAMP)
        RETURNING *
      `, [senderEmail, appPassword, dailyLimit]);
      
      console.log('✅ Gmail configuration created successfully!');
      console.log('📋 New config:', {
        id: result.rows[0].id,
        senderEmail: result.rows[0].sender_email,
        dailyLimit: result.rows[0].daily_limit,
        usedToday: result.rows[0].used_today
      });
    }
    
    console.log('\n🎯 Gmail configuration is now set up!');
    console.log('Your email system is ready to send emails.');
    
  } catch (error) {
    console.error('❌ Error setting up Gmail config:', error);
  } finally {
    await pool.end();
  }
}

console.log('⚠️  IMPORTANT: Replace YOUR_APP_PASSWORD_HERE with your actual Gmail app password before running!');
console.log('');

setupGmailConfig();
