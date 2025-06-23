import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import type { User, LoginRequest } from '@shared/schema';

export class AuthService {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Authenticate a user with username and password
   */
  static async authenticateUser(credentials: LoginRequest): Promise<User | null> {
    try {
      const user = await storage.getUserByUsername(credentials.username);
      
      if (!user || !user.isActive) {
        return null;
      }

      const isPasswordValid = await this.verifyPassword(credentials.password, user.passwordHash);
      
      if (!isPasswordValid) {
        return null;
      }

      // Update last login timestamp
      await storage.updateUserLastLogin(user.id);

      // Return user without password hash
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  /**
   * Create a new user with hashed password
   */
  static async createUser(userData: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    role?: string;
  }): Promise<User> {
    const passwordHash = await this.hashPassword(userData.password);
    
    return storage.createUser({
      username: userData.username,
      email: userData.email,
      passwordHash,
      fullName: userData.fullName,
      role: userData.role || 'admin',
    });
  }

  /**
   * Change user password
   */
  static async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return false;
      }

      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.passwordHash);
      
      if (!isCurrentPasswordValid) {
        return false;
      }

      const newPasswordHash = await this.hashPassword(newPassword);
      await storage.updateUserPassword(userId, newPasswordHash);
      
      return true;
    } catch (error) {
      console.error('Password change error:', error);
      return false;
    }
  }
}
