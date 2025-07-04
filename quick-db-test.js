import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL?.replace('&channel_binding=require', '').replace('?channel_binding=require', '');

console.log('🔍 Testing database connection...');
console.log('Connection string length:', connectionString?.length);

const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    
    // Test if admin_users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'admin_users'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ admin_users table exists');
      
      // Check if default admin exists
      const adminCheck = await pool.query('SELECT username FROM admin_users WHERE username = $1', ['admin']);
      console.log('✅ Default admin user:', adminCheck.rows.length > 0 ? 'exists' : 'will be created');
    } else {
      console.log('ℹ️ admin_users table will be created on server start');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
