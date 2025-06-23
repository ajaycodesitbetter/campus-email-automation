import 'dotenv/config';
import { AuthService } from '../server/services/authService';
import { storage } from '../server/storage';

/**
 * User Management Script
 * Allows you to create, update, and manage user credentials
 */

class UserManager {
  /**
   * Create a new user with custom credentials
   */
  static async createUser(userData: {
    username: string;
    password: string;
    email: string;
    fullName: string;
    role?: string;
  }) {
    try {
      console.log(`🔄 Creating user: ${userData.username}...`);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        console.log(`❌ User '${userData.username}' already exists!`);
        return false;
      }
      
      // Create the user
      const newUser = await AuthService.createUser({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        role: userData.role || 'admin'
      });
      
      console.log('✅ User created successfully!');
      console.log('📋 User Details:');
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Username: ${newUser.username}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Full Name: ${newUser.fullName}`);
      console.log(`   Role: ${newUser.role}`);
      console.log(`   Password: ${userData.password}`);
      
      return newUser;
    } catch (error) {
      console.error('❌ Failed to create user:', error);
      return false;
    }
  }
  
  /**
   * List all existing users
   */
  static async listUsers() {
    try {
      console.log('📋 Existing Users:');
      console.log('================');
      
      // Note: We'll need to add a method to get all users
      // For now, let's try to get the admin user
      const adminUser = await storage.getUserByUsername('admin');
      if (adminUser) {
        console.log(`👤 ${adminUser.username} (${adminUser.email}) - ${adminUser.role}`);
        console.log(`   Full Name: ${adminUser.fullName}`);
        console.log(`   Active: ${adminUser.isActive}`);
        console.log(`   Last Login: ${adminUser.lastLoginAt || 'Never'}`);
      } else {
        console.log('No admin user found.');
      }
      
    } catch (error) {
      console.error('❌ Failed to list users:', error);
    }
  }
  
  /**
   * Change password for existing user
   */
  static async changePassword(username: string, currentPassword: string, newPassword: string) {
    try {
      console.log(`🔄 Changing password for user: ${username}...`);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log(`❌ User '${username}' not found!`);
        return false;
      }
      
      const success = await AuthService.changePassword(user.id, currentPassword, newPassword);
      
      if (success) {
        console.log('✅ Password changed successfully!');
        console.log(`📋 New credentials for ${username}:`);
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${newPassword}`);
        return true;
      } else {
        console.log('❌ Password change failed. Check your current password.');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to change password:', error);
      return false;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🔐 Campus Email Automation - User Manager');
  console.log('=========================================\n');
  
  switch (command) {
    case 'create':
      if (args.length < 5) {
        console.log('Usage: npm run user-manager create <username> <password> <email> <fullName> [role]');
        console.log('Example: npm run user-manager create john password123 john@college.edu "John Doe" admin');
        process.exit(1);
      }
      
      await UserManager.createUser({
        username: args[1],
        password: args[2],
        email: args[3],
        fullName: args[4],
        role: args[5] || 'admin'
      });
      break;
      
    case 'list':
      await UserManager.listUsers();
      break;
      
    case 'change-password':
      if (args.length < 4) {
        console.log('Usage: npm run user-manager change-password <username> <currentPassword> <newPassword>');
        console.log('Example: npm run user-manager change-password admin admin123 newpassword123');
        process.exit(1);
      }
      
      await UserManager.changePassword(args[1], args[2], args[3]);
      break;
      
    case 'quick-setup':
      console.log('🚀 Quick Setup - Creating your custom admin user...\n');
      
      // Interactive setup would be ideal, but for now let's provide a template
      console.log('💡 To create your custom admin user, run:');
      console.log('npm run user-manager create myusername mypassword my@email.com "My Full Name"');
      console.log('\n📝 Replace with your desired credentials:');
      console.log('   - myusername: Your chosen username');
      console.log('   - mypassword: Your chosen password'); 
      console.log('   - my@email.com: Your email address');
      console.log('   - "My Full Name": Your display name');
      break;
      
    default:
      console.log('Available commands:');
      console.log('  create <username> <password> <email> <fullName> [role] - Create new user');
      console.log('  list                                                   - List existing users');
      console.log('  change-password <username> <current> <new>            - Change password');
      console.log('  quick-setup                                           - Show setup instructions');
      console.log('\nExamples:');
      console.log('  npm run user-manager create john pass123 john@college.edu "John Smith"');
      console.log('  npm run user-manager change-password admin admin123 newpass123');
      console.log('  npm run user-manager list');
      break;
  }
  
  process.exit(0);
}

// Handle errors
main().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
