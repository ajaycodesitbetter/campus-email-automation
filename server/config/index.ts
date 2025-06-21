// Export all configuration modules
export * from './email.config';

// Centralized configuration management
import emailConfig from './email.config';

export const config = {
  email: emailConfig,
  // Add other configuration modules here as they are created
};

export default config;

