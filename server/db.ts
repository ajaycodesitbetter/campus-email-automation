import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
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
  // Use DATABASE_URL
  connectionString = databaseUrl;
  console.log('Using DATABASE_URL');
  console.log('DATABASE_URL length:', databaseUrl.length);
  console.log('DATABASE_URL first 50 chars:', databaseUrl.substring(0, 50));
  
  // Extract hostname for debugging
  try {
    const url = new URL(databaseUrl);
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

export const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
}
