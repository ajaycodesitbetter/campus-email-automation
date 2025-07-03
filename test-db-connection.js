import { Pool } from 'pg';

const connectionString = "postgresql://neondb_owner:npg_vF03BWRLCgsV@ep-gentle-bar-a11l4dnr-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log('Current time from database:', result.rows[0].current_time);
    
    // Test table creation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table creation test successful!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
