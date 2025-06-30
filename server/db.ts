import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

const dbHost = process.env.DATABASE_HOST;
const dbUser = process.env.DATABASE_USER;
const dbPassword = process.env.DATABASE_PASSWORD;
const dbName = process.env.DATABASE_NAME;

if (!dbHost || !dbUser || !dbPassword || !dbName) {
  throw new Error(
    "Database connection variables (HOST, USER, PASSWORD, NAME) must be set."
  );
}

const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}/${dbName}?sslmode=require`;
console.log('Connecting to database...', `postgresql://${dbUser}:***@${dbHost}/${dbName}`);

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
