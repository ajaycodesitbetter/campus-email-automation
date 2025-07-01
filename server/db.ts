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
} else if (databaseUrl) {
  // Use DATABASE_URL
  connectionString = databaseUrl;
  console.log('Using DATABASE_URL');
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

// Test connection on startup
pool.query('SELECT 1').then(() => {
  console.log('✅ Database connection successful');
}).catch((error) => {
  console.error('❌ Database connection failed:', error);
});
