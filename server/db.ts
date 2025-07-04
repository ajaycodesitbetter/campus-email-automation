import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import * as schema from "@shared/schema";

// Try to use separate variables first, fallback to DATABASE_URL
const dbHost = process.env.DATABASE_HOST;
const dbUser = process.env.DATABASE_USER;
const dbPassword = process.env.DATABASE_PASSWORD;
const dbName = process.env.DATABASE_NAME;
const databaseUrl = process.env.DATABASE_URL;

let connectionString: string;

if (dbHost && dbUser && dbPassword && dbName) {
  // Use separate variables
  connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}/${dbName}?sslmode=require`;
  console.log('Using separate database variables');
  console.log('DB Host:', dbHost);
} else if (databaseUrl) {
  // Use DATABASE_URL, but remove channel_binding parameter if present
  // as it can cause issues with Node.js pg driver
  connectionString = databaseUrl.replace('&channel_binding=require', '').replace('?channel_binding=require', '');
  console.log('Using DATABASE_URL');
  console.log('DATABASE_URL length:', databaseUrl.length);
  console.log('DATABASE_URL first 50 chars:', databaseUrl.substring(0, 50));
  console.log('Cleaned connection string first 50 chars:', connectionString.substring(0, 50));
  
  // Extract hostname for debugging
  try {
    const url = new URL(connectionString);
    console.log('Parsed hostname:', url.hostname);
    console.log('Parsed port:', url.port);
    console.log('Parsed database:', url.pathname);
  } catch (e) {
    console.error('Failed to parse DATABASE_URL:', e.message);
  }
} else {
  throw new Error(
    "Either DATABASE_URL or all separate database variables (HOST, USER, PASSWORD, NAME) must be set."
  );
}
console.log('Connecting to database...');
console.log('Final connection string for Pool:', connectionString);
console.log('Connection string length:', connectionString.length);

// Additional validation
if (connectionString.includes('base')) {
  console.error('❌ CONNECTION STRING CONTAINS "base" - THIS IS THE PROBLEM!');
  console.error('Raw DATABASE_URL:', databaseUrl);
  console.error('Processed connectionString:', connectionString);
}

export const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout
  acquireTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

// Test connection and create tables on startup
pool.query('SELECT 1').then(async () => {
  console.log('✅ Database connection successful');
  
  // Create tables if they don't exist
  try {
    await createTablesIfNotExist();
    console.log('✅ Database tables verified/created');
  } catch (error) {
    console.error('❌ Table creation failed:', error);
  }
}).catch((error) => {
  console.error('❌ Database connection failed:', error);
});

async function createTablesIfNotExist() {
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

  // Create email_config table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_config (
      id SERIAL PRIMARY KEY,
      sender_email VARCHAR(255) NOT NULL,
      app_password TEXT NOT NULL,
      daily_limit INTEGER DEFAULT 1500,
      used_today INTEGER DEFAULT 0,
      last_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

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

  // Create admin_users table for authentication
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create default admin user if none exists
  const adminCheck = await pool.query('SELECT COUNT(*) FROM admin_users');
  if (parseInt(adminCheck.rows[0].count) === 0) {
    // Default credentials: admin / admin123
    // In production, change this immediately!
    const defaultPasswordHash = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO admin_users (username, password_hash, email)
      VALUES ('admin', $1, 'admin@campus-email.local')
    `, [defaultPasswordHash]);
    console.log('✅ Default admin user created: admin / admin123 (CHANGE THIS!)');
  }
}
