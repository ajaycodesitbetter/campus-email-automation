import bcrypt from 'bcrypt';
import pg from 'pg';

// Use Railway's production DATABASE_URL
const PRODUCTION_DATABASE_URL = "postgresql://neondb_owner:npg_vF03BWRLCgsV@ep-gentle-bar-a11l4dnr-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function updateProductionAdmin() {
  const { Pool } = pg;
  const pool = new Pool({ 
    connectionString: PRODUCTION_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔐 Updating production admin password...');
    
    // New credentials
    const newUsername = 'MAILSRCEM';
    const newPassword = 'OfficialSRCEM@117';
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Check current admin users
    const currentAdmins = await pool.query('SELECT id, username, email FROM admin_users');
    console.log('📊 Current admin users:', currentAdmins.rows);
    
    // Update or create the admin user
    const result = await pool.query(`
      INSERT INTO admin_users (username, password_hash, email, is_active)
      VALUES ($1, $2, 'admin@campus-email.local', true)
      ON CONFLICT (username) 
      DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, username, email, created_at, updated_at
    `, [newUsername, passwordHash]);
    
    if (result.rows.length > 0) {
      console.log('✅ Production admin updated successfully!');
      console.log('📋 Updated user:', result.rows[0]);
    }
    
    // Verify the credentials
    const testUser = await pool.query('SELECT * FROM admin_users WHERE username = $1', [newUsername]);
    if (testUser.rows.length > 0) {
      const isMatch = await bcrypt.compare(newPassword, testUser.rows[0].password_hash);
      console.log('🧪 Password verification:', isMatch ? '✅ Success' : '❌ Failed');
    }
    
    console.log('\n🎯 Production credentials updated!');
    console.log('Now you can login to Railway production with:');
    console.log('Username: MAILSRCEM');
    console.log('Password: OfficialSRCEM@117');
    
  } catch (error) {
    console.error('❌ Error updating production admin:', error);
  } finally {
    await pool.end();
  }
}

updateProductionAdmin();
