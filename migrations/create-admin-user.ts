import 'dotenv/config';
import { db } from '../server/db';
import { AuthService } from '../server/services/authService';

/**
 * Migration script to create a default admin user
 * This should be run after the users table is created via schema push
 */
async function createDefaultAdminUser() {
  try {
    console.log('🔄 Creating default admin user...');
    
    const defaultAdmin = {
      username: 'admin',
      email: 'admin@college.edu',
      password: 'admin123', // Change this in production!
      fullName: 'System Administrator',
      role: 'admin'
    };

    // Check if admin user already exists
    const { storage } = await import('../server/storage');
    const existingUser = await storage.getUserByUsername(defaultAdmin.username);
    
    if (existingUser) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Create the admin user
    const adminUser = await AuthService.createUser(defaultAdmin);
    
    console.log('✅ Default admin user created successfully!');
    console.log('📋 Login credentials:');
    console.log(`   Username: ${defaultAdmin.username}`);
    console.log(`   Password: ${defaultAdmin.password}`);
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
    return adminUser;
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    throw error;
  }
}

// Run migration
createDefaultAdminUser()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
