import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : process.env.NODE_ENV === 'test' 
    ? '.env.test' 
    : '.env';

// Load the appropriate .env file if it exists
const envPath = path.resolve(process.cwd(), envFile);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // Fallback to default .env
}

/**
 * Email configuration interface
 */
export interface EmailConfig {
  service: string;
  auth: {
    user: string;
    pass: string;
  };
  dailyLimit: number;
  defaultFrom: string;
}

/**
 * Validate that required environment variables are set
 * @throws Error if required variables are missing
 */
function validateEmailConfig(): void {
  const requiredVars = ['GMAIL_USER', 'GMAIL_APP_PASSWORD'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required email configuration environment variables: ${missing.join(', ')}. ` +
      'Please check your .env file or environment variables.'
    );
  }
}

// Validate config on module load
validateEmailConfig();

/**
 * Email configuration object with secure access to environment variables
 */
export const emailConfig: EmailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER!,
    pass: process.env.GMAIL_APP_PASSWORD!,
  },
  dailyLimit: parseInt(process.env.EMAIL_DAILY_LIMIT || '1500', 10),
  defaultFrom: process.env.GMAIL_USER!,
};

/**
 * Get a redacted version of the config for logging purposes
 * that doesn't expose sensitive information
 */
export function getRedactedConfig(): Omit<EmailConfig, 'auth'> & { auth: { user: string, pass: string } } {
  return {
    ...emailConfig,
    auth: {
      user: emailConfig.auth.user,
      pass: '********', // Redact password
    },
  };
}

export default emailConfig;

