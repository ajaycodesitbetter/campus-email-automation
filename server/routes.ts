import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { emailService } from "./services/emailService";
import { csvService } from "./services/csvService";
import { AuthService } from "./services/authService";
import { insertStudentSchema, insertEmailConfigSchema, insertCampaignSchema, loginSchema } from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Authentication middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Extend session type
declare module 'express-session' {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint (no auth required)
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Campus Email Automation API is running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });
  
  // Session debug endpoint (temporary)
  app.get("/api/debug/session", (req, res) => {
    res.json({
      hasSession: !!req.session,
      sessionId: req.sessionID,
      userId: req.session?.userId,
      username: req.session?.username,
      cookies: req.headers.cookie,
      userAgent: req.headers['user-agent']
    });
  });
  
  // Email configuration sync endpoint (no auth required for setup)
  app.post("/api/sync-email-config", async (req, res) => {
    try {
      console.log('🔄 Syncing email configuration from environment variables...');
      
      // Get environment variables
      const gmailUser = process.env.GMAIL_USER;
      const gmailPassword = process.env.GMAIL_APP_PASSWORD;
      const dailyLimit = parseInt(process.env.EMAIL_DAILY_LIMIT || '150');
      
      if (!gmailUser || !gmailPassword) {
        return res.status(400).json({
          error: 'Missing email environment variables',
          required: ['GMAIL_USER', 'GMAIL_APP_PASSWORD']
        });
      }
      
      // Check existing configuration
      const existingConfig = await storage.getEmailConfig();
      
      // Create or update the email configuration
      const config = await storage.createOrUpdateEmailConfig({
        senderEmail: gmailUser,
        senderPassword: gmailPassword,
        dailyLimit: dailyLimit,
        usedToday: existingConfig?.usedToday || 0
      });
      
      res.json({
        message: 'Email configuration synced successfully',
        config: {
          senderEmail: config.senderEmail,
          dailyLimit: config.dailyLimit,
          usedToday: config.usedToday || 0,
          configured: true // hardcoded for now since we don't store this field
        }
      });
    } catch (error) {
      console.error('Sync email config error:', error);
      res.status(500).json({ error: 'Failed to sync email configuration' });
    }
  });
  
  // Authentication routes (no auth required)
  
  // Login route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const user = await AuthService.authenticateUser(validatedData);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      // Regenerate session for security and fresh start
      await new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration error:', err);
            reject(err);
          } else {
            resolve(undefined);
          }
        });
      });
      
      // Set session data
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      
      console.log('Setting session data:', {
        userId: user.id,
        username: user.username,
        role: user.role,
        sessionId: req.sessionID
      });
      
      // Force session save
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            console.log('Session saved successfully');
            resolve(undefined);
          }
        });
      });
      
      // Log activity
      await storage.createActivityLog({
        action: "USER_LOGIN",
        description: `User ${user.username} logged in`,
        metadata: { userId: user.id, username: user.username }
      });
      
      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: "Invalid login data" });
    }
  });
  
  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    if (req.session.userId) {
      const username = req.session.username;
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ error: "Failed to logout" });
        }
        
        // Log activity (fire and forget since session is destroyed)
        storage.createActivityLog({
          action: "USER_LOGOUT",
          description: `User ${username} logged out`,
          metadata: { username }
        }).catch(console.error);
        
        res.json({ message: "Logout successful" });
      });
    } else {
      res.json({ message: "Already logged out" });
    }
  });
  
  // Check authentication status
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user || !user.isActive) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found or inactive" });
      }
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({ error: "Failed to check authentication" });
    }
  });
  
  // Protected routes (require authentication)
  
  // Get campaigns
  app.get("/api/campaigns", requireAuth, async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Create campaign
  app.post("/api/campaigns", requireAuth, async (req, res) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validatedData);
      
      await storage.createActivityLog({
        action: "CAMPAIGN_CREATED",
        description: `Campaign "${campaign.name}" created`,
        metadata: { campaignId: campaign.id, campaignName: campaign.name }
      });

      res.json(campaign);
    } catch (error) {
      console.error('Campaign creation error:', error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  // Get campaign stats
  app.get("/api/campaigns/:id/stats", requireAuth, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const stats = await storage.getCampaignStats(campaignId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign stats" });
    }
  });

  // Delete campaign
  app.delete("/api/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      await storage.deleteCampaign(campaignId);
      
      await storage.createActivityLog({
        action: "CAMPAIGN_DELETED",
        description: `Campaign deleted`,
        metadata: { campaignId }
      });

      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  // Get dashboard stats
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.query;
      const stats = await storage.getStats(campaignId ? parseInt(campaignId as string) : undefined);
      const config = await storage.getEmailConfig();
      res.json({
        ...stats,
        dailyLimit: config?.dailyLimit || 1500,
        usedToday: config?.usedToday || 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get all students
  app.get("/api/students", requireAuth, async (req, res) => {
    try {
      const { section, campaignId } = req.query;
      let students;
      
      const cId = campaignId ? parseInt(campaignId as string) : undefined;
      
      if (section && section !== 'all') {
        students = await storage.getStudentsBySection(section as string, cId);
      } else {
        students = await storage.getStudents(cId);
      }
      
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  // Get unique sections
  app.get("/api/sections", requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.query;
      const cId = campaignId ? parseInt(campaignId as string) : undefined;
      const students = await storage.getStudents(cId);
      const sections = Array.from(new Set(students.map(s => s.section)));
      res.json(sections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sections" });
    }
  });

  // Upload CSV
  app.post("/api/upload-csv", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { campaignId } = req.body;
      if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID is required" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const validation = csvService.parseCSV(csvContent);

      if (!validation.valid) {
        return res.status(400).json({
          error: "CSV validation failed",
          details: {
            errors: validation.errors,
            duplicates: validation.duplicates,
          }
        });
      }

      // Add campaignId to each student record
      const studentsWithCampaign = validation.data.map(student => ({
        ...student,
        campaignId: parseInt(campaignId)
      }));

      // Clear existing data for this campaign and insert new
      await storage.deleteAllStudents(parseInt(campaignId));
      const students = await storage.createStudents(studentsWithCampaign);

      // Log activity
      await storage.createActivityLog({
        action: "CSV_UPLOAD",
        description: `CSV file processed with ${students.length} records for campaign`,
        metadata: { recordCount: students.length, campaignId: parseInt(campaignId) }
      });

      res.json({
        message: "CSV processed successfully",
        recordCount: students.length,
        students
      });
    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({ error: "Failed to process CSV file" });
    }
  });

  // Send bulk email
  app.post("/api/send-bulk", requireAuth, async (req, res) => {
    try {
      const { subject, message, targetSection } = req.body;

      if (!subject || !message) {
        return res.status(400).json({ error: "Subject and message are required" });
      }

      let students;
      if (targetSection === 'all') {
        students = await storage.getStudents();
      } else {
        students = await storage.getStudentsBySection(targetSection);
      }

      if (students.length === 0) {
        return res.status(400).json({ error: "No students found for the selected section" });
      }

      // Create email logs for tracking
      const emailLogs: any[] = [];
      for (const student of students) {
        const personalizedSubject = emailService.replacePlaceholders(subject, {
          Name: student.name,
          Section: student.section,
          Email: student.email,
        });
        
        const personalizedMessage = emailService.replacePlaceholders(message, {
          Name: student.name,
          Section: student.section,
          Email: student.email,
        });

        const log = await storage.createEmailLog({
          campaignId: student.campaignId,
          studentId: student.id,
          email: student.email,
          subject: personalizedSubject,
          message: personalizedMessage,
          status: 'pending',
        });
        emailLogs.push(log);
      }

      // Send emails in background
      setImmediate(async () => {
        try {
          for (const log of emailLogs) {
            try {
              await emailService.sendEmail({
                to: log.email,
                subject: log.subject,
                text: log.message,
              });
              
              await storage.updateEmailLogStatus(log.id, 'sent');
            } catch (error) {
              await storage.updateEmailLogStatus(
                log.id, 
                'failed', 
                error instanceof Error ? error.message : 'Unknown error'
              );
            }
          }

          // Log activity
          await storage.createActivityLog({
            action: "BULK_EMAIL_SENT",
            description: `Bulk email sent to ${targetSection === 'all' ? 'all sections' : targetSection}`,
            metadata: { 
              recipientCount: students.length,
              section: targetSection,
              subject 
            }
          });
        } catch (error) {
          console.error('Bulk email error:', error);
        }
      });

      res.json({
        message: "Bulk email sending initiated",
        recipientCount: students.length
      });
    } catch (error) {
      console.error('Bulk send error:', error);
      res.status(500).json({ error: "Failed to initiate bulk email sending" });
    }
  });

  // Send individual email
  app.post("/api/send-individual", requireAuth, async (req, res) => {
    try {
      const { studentId, subject, message } = req.body;

      if (!studentId || !subject || !message) {
        return res.status(400).json({ error: "Student ID, subject, and message are required" });
      }

      const student = await storage.getStudentById(studentId);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const personalizedSubject = emailService.replacePlaceholders(subject, {
        Name: student.name,
        Section: student.section,
        Email: student.email,
      });
      
      const personalizedMessage = emailService.replacePlaceholders(message, {
        Name: student.name,
        Section: student.section,
        Email: student.email,
      });

      // Create email log
      const log = await storage.createEmailLog({
        campaignId: student.campaignId,
        studentId: student.id,
        email: student.email,
        subject: personalizedSubject,
        message: personalizedMessage,
        status: 'pending',
      });

      // Send email
      try {
        await emailService.sendEmail({
          to: student.email,
          subject: personalizedSubject,
          text: personalizedMessage,
        });
        
        await storage.updateEmailLogStatus(log.id, 'sent');
        res.json({ message: "Email sent successfully" });
      } catch (error) {
        await storage.updateEmailLogStatus(
          log.id, 
          'failed', 
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    } catch (error) {
      console.error('Individual send error:', error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Get email configuration
  app.get("/api/email-config", requireAuth, async (req, res) => {
    try {
      const config = await storage.getEmailConfig();
      if (!config) {
        return res.json({
          senderEmail: '',
          dailyLimit: 1500,
          usedToday: 0,
          configured: false
        });
      }

      res.json({
        senderEmail: config.senderEmail,
        dailyLimit: config.dailyLimit,
        usedToday: config.usedToday,
        configured: true
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email configuration" });
    }
  });

  // Send test email
  app.post("/api/send-test", requireAuth, async (req, res) => {
    try {
      const { testEmail, subject, message } = req.body;

      if (!testEmail || !subject || !message) {
        return res.status(400).json({ error: "Test email, subject, and message are required" });
      }

      // Initialize email service
      await emailService.initialize();

      // Send test email
      await emailService.sendEmail({
        to: testEmail,
        subject: subject,
        text: message,
        html: message.replace(/\n/g, '<br>')
      });

      // Log activity
      await storage.createActivityLog({
        action: "TEST_EMAIL_SENT",
        description: `Test email sent to ${testEmail}`,
        metadata: { 
          testEmail,
          subject 
        }
      });

      res.json({ message: "Test email sent successfully" });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ 
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update email configuration
  app.post("/api/email-config", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEmailConfigSchema.parse(req.body);
      const config = await storage.createOrUpdateEmailConfig(validatedData);
      
      // Test email configuration
      try {
        await emailService.initialize();
      } catch (error) {
        return res.status(400).json({ 
          error: "Invalid email configuration",
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      res.json({
        message: "Email configuration updated successfully",
        config: {
          senderEmail: config.senderEmail,
          dailyLimit: config.dailyLimit,
          configured: true
        }
      });
    } catch (error) {
      console.error('Config update error:', error);
      res.status(500).json({ error: "Failed to update email configuration" });
    }
  });

  // Get email logs
  app.get("/api/email-logs", requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.query;
      const cId = campaignId ? parseInt(campaignId as string) : undefined;
      const logs = await storage.getEmailLogs(cId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email logs" });
    }
  });

  // Get activity logs
  app.get("/api/activity-logs", requireAuth, async (req, res) => {
    try {
      const { limit } = req.query;
      const logs = await storage.getActivityLogs(limit ? parseInt(limit as string) : undefined);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Clear all data
  app.delete("/api/clear-data", requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.query;
      const cId = campaignId ? parseInt(campaignId as string) : undefined;
      
      await storage.deleteAllStudents(cId);
      
      await storage.createActivityLog({
        action: "DATA_CLEARED",
        description: cId ? "Campaign data cleared" : "All student data and email logs cleared",
        metadata: { campaignId: cId }
      });

      res.json({ message: "Data cleared successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
