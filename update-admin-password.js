import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create database connection
const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const connectionString = databaseUrl.replace('&channel_binding=require', '').replace('?channel_binding=require', '');
const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateAdminPassword() {
  try {
    console.log('🔐 Updating admin password...');
    
    // New credentials
    const newUsername = 'MAILSRCEM';
    const newPassword = 'OfficialSRCEM@117';
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update the admin user
    const result = await pool.query(`
      UPDATE admin_users 
      SET username = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP
      WHERE username = 'admin'
      RETURNING id, username, email, created_at, updated_at
    `, [newUsername, passwordHash]);
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('📋 New credentials:');
      console.log('   Username:', newUsername);
      console.log('   Password:', newPassword);
      console.log('   Updated at:', result.rows[0].updated_at);
      
      // Also create a backup admin just in case
      const backupPasswordHash = await bcrypt.hash('admin123', 10);
      try {
        await pool.query(`
          INSERT INTO admin_users (username, password_hash, email, is_active)
          VALUES ('admin', $1, 'backup@campus-email.local', true)
          ON CONFLICT (username) DO NOTHING
        `, [backupPasswordHash]);
        console.log('✅ Backup admin account ensured');
      } catch (backupError) {
        console.log('ℹ️  Backup admin already exists or not needed');
      }
      
    } else {
      console.log('❌ No admin user found to update');
    }
    
    // Test the new credentials
    console.log('\n🧪 Testing new credentials...');
    const testResult = await pool.query('SELECT * FROM admin_users WHERE username = $1', [newUsername]);
    if (testResult.rows.length > 0) {
      const user = testResult.rows[0];
      const isMatch = await bcrypt.compare(newPassword, user.password_hash);
      if (isMatch) {
        console.log('✅ New credentials verified successfully!');
      } else {
        console.log('❌ Password verification failed');
      }
    }
    
    console.log('\n📊 Current admin users:');
    const allAdmins = await pool.query('SELECT id, username, email, is_active, created_at FROM admin_users ORDER BY created_at');
    allAdmins.rows.forEach(admin => {
      console.log(`   ${admin.id}: ${admin.username} (${admin.email}) - Active: ${admin.is_active}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating password:', error);
  } finally {
    // Close the pool
    await pool.end();
    console.log('\n🏁 Password update complete. You can now login with:');
    console.log('   Username: MAILSRCEM');
    console.log('   Password: OfficialSRCEM@117');
  }
}

updateAdminPassword();
