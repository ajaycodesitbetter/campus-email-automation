import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { campaigns, students, emailLogs, emailConfig, activityLogs } from '@shared/schema';

// Database connection setup (same as db.ts)
const dbHost = process.env.DATABASE_HOST;
const dbUser = process.env.DATABASE_USER;
const dbPassword = process.env.DATABASE_PASSWORD;
const dbName = process.env.DATABASE_NAME;
const databaseUrl = process.env.DATABASE_URL;

let connectionString: string;

if (dbHost && dbUser && dbPassword && dbName) {
  connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}/${dbName}?sslmode=require`;
  console.log('Using separate database variables');
} else if (databaseUrl) {
  // Use DATABASE_URL, but remove channel_binding parameter if present
  connectionString = databaseUrl.replace('&channel_binding=require', '').replace('?channel_binding=require', '');
  console.log('Using DATABASE_URL (cleaned)');
  console.log('Original URL length:', databaseUrl.length);
  console.log('Cleaned URL length:', connectionString.length);
} else {
  throw new Error(
    "Either DATABASE_URL or all separate database variables (HOST, USER, PASSWORD, NAME) must be set."
  );
}

const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = drizzle(pool);

async function createTables() {
  try {
    console.log('🔄 Creating database tables...');
    
    // Create campaigns table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Campaigns table created');

    // Create students table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        section VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Students table created');

    // Create email_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Email logs table created');

    // Create email_config table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_config (
        id SERIAL PRIMARY KEY,
        sender_email VARCHAR(255) NOT NULL,
        app_password TEXT NOT NULL,
        daily_limit INTEGER DEFAULT 150,
        used_today INTEGER DEFAULT 0,
        last_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Email config table created');

    // Create activity_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Activity logs table created');

    console.log('🎉 All database tables created successfully!');
    
    // Test basic functionality
    console.log('🔄 Testing database connectivity...');
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection test passed:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  createTables().catch(console.error);
}

export { createTables };
