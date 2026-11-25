import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { storage } from "./storage";
import { emailService } from "./services/emailService";
import { csvService } from "./services/csvService";
import { insertStudentSchema, insertEmailConfigSchema, updateEmailConfigSchema, insertCampaignSchema } from "@shared/schema";
import { pool } from "./db";
import { 
  validateLogin, 
  validateCampaign, 
  validateEmailConfig, 
  validateEmailSending,
  validateCampaignId,
  validateQueryParams,
  sanitizeHtml 
} from "./middleware/validation";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      await storage.getEmailConfig();
      res.json({ 
        status: "healthy", 
        database: "connected",
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ 
        status: "unhealthy", 
        database: "disconnected",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString() 
      });
    }
  });

  // Authentication - Login
  app.post("/api/login", validateLogin, async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    console.log('🔐 Login attempt:', { username, hasPassword: !!password, ip: ipAddress });
    
    try {
      const { rows } = await pool.query('SELECT * FROM admin_users WHERE username = $1 AND is_active = true', [username]);
      const user = rows[0];

      if (!user) {
        console.log('❌ User not found:', username);
        // Log failed login attempt
        await pool.query(
          'INSERT INTO login_history (username, ip_address, user_agent, status) VALUES ($1, $2, $3, $4)',
          [username, ipAddress, userAgent, 'FAILED_NO_USER']
        ).catch(logError => console.error('Failed to log login attempt:', logError));
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        console.log('❌ Password mismatch for user:', username);
        // Log failed login attempt
        await pool.query(
          'INSERT INTO login_history (username, ip_address, user_agent, status) VALUES ($1, $2, $3, $4)',
          [username, ipAddress, userAgent, 'FAILED_BAD_PASSWORD']
        ).catch(logError => console.error('Failed to log login attempt:', logError));
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Set session data
      await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
      req.session.userId = user.id;
      
      // Log successful login
      await pool.query(
        'INSERT INTO login_history (username, ip_address, user_agent, status) VALUES ($1, $2, $3, $4)',
        [username, ipAddress, userAgent, 'SUCCESS']
      );
      
      res.json({ 
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      // Log system error
      try {
        await pool.query(
          'INSERT INTO login_history (username, ip_address, user_agent, status) VALUES ($1, $2, $3, $4)',
          [username, ipAddress, userAgent, 'SYSTEM_ERROR']
        );
      } catch (logError) {
        console.error('Failed to log login error:', logError);
      }
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Authentication - Check login status
  app.get("/api/auth-status", (req, res) => {
    if (req.session.userId) {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Authentication - Logout
  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  // All campaign, contact, configuration and send routes require a session.
  app.use("/api", requireAuth);

  // Get campaigns
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Create campaign
  app.post("/api/campaigns", async (req, res) => {
    try {
      console.log('📝 Creating campaign with data:', req.body);
      const validatedData = insertCampaignSchema.parse(req.body);
      console.log('✅ Validation passed:', validatedData);
      
      const campaign = await storage.createCampaign(validatedData);
      console.log('✅ Campaign created:', campaign);
      
      await storage.createActivityLog({
        action: "CAMPAIGN_CREATED",
        description: `Campaign "${campaign.name}" created`,
        metadata: { campaignId: campaign.id, campaignName: campaign.name }
      });
      console.log('✅ Activity log created');

      res.json(campaign);
    } catch (error) {
      console.error('❌ Campaign creation error:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'UnknownError'
      });
      res.status(500).json({ 
        error: "Failed to create campaign",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get campaign stats
  app.get("/api/campaigns/:id/stats", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const stats = await storage.getCampaignStats(campaignId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign stats" });
    }
  });

  // Delete campaign
  app.delete("/api/campaigns/:id", async (req, res) => {
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
  app.get("/api/stats", async (req, res) => {
    try {
      const { campaignId } = req.query;
      const stats = await storage.getStats(campaignId ? parseInt(campaignId as string) : undefined);
      const config = await storage.getEmailConfig();
      res.json({
        ...stats,
        dailyLimit: config?.dailyLimit ?? 150,
        usedToday: config?.usedToday || 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get all students
  app.get("/api/students", async (req, res) => {
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
  app.get("/api/sections", async (req, res) => {
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

  // Debug endpoint to check student data structure
  app.get("/api/debug-students", async (req, res) => {
    try {
      const { campaignId } = req.query;
      const cId = campaignId ? parseInt(campaignId as string) : undefined;
      const students = await storage.getStudents(cId);
      
      console.log('🔍 Debug - Raw student data:', JSON.stringify(students, null, 2));
      
      if (students.length > 0) {
        const firstStudent = students[0];
        console.log('🔍 Debug - First student structure:', {
          name: firstStudent.name,
          email: firstStudent.email,
          section: firstStudent.section,
          additionalFields: firstStudent.additionalFields,
          additionalFieldsType: typeof firstStudent.additionalFields,
        });
      }
      
      res.json({
        totalStudents: students.length,
        firstStudentSample: students[0] || null,
        debug: 'Check server console for detailed logs'
      });
    } catch (error) {
      console.error('Debug students error:', error);
      res.status(500).json({ error: 'Debug failed' });
    }
  });

  // Get available placeholders for a campaign
  app.get("/api/placeholders", async (req, res) => {
    try {
      const { campaignId } = req.query;
      const cId = campaignId ? parseInt(campaignId as string) : undefined;
      
      console.log('🏷️ Placeholders API called for campaign:', cId);
      
      if (!cId) {
        // Return default placeholders if no campaign specified
        console.log('🏷️ No campaign ID provided, returning default placeholders');
        return res.json({
          availableFields: ['Name', 'Email', 'Section'],
          fieldMapping: {
            'name': 'Name',
            'email': 'Email', 
            'section': 'Section'
          }
        });
      }
      
      const students = await storage.getStudents(cId);
      console.log(`🏷️ Found ${students.length} students for campaign ${cId}`);
      
      if (students.length === 0) {
        // Return default placeholders if no students
        console.log('🏷️ No students found, returning default placeholders');
        return res.json({
          availableFields: ['Name', 'Email', 'Section'],
          fieldMapping: {
            'name': 'Name',
            'email': 'Email',
            'section': 'Section'
          }
        });
      }
      
      // Extract all available fields from ALL students (not just the first)
      const availableFields = ['Name', 'Email', 'Section']; // Always include core fields
      const fieldMapping: Record<string, string> = {
        'name': 'Name',
        'email': 'Email',
        'section': 'Section'
      };
      
      // Collect all unique additional fields from all students
      const allAdditionalFields = new Set<string>();
      
      students.forEach((student, index) => {
        console.log(`🔍 Student ${index + 1}/${students.length} - ${student.name}:`);
        console.log('   additionalFields type:', typeof student.additionalFields);
        console.log('   additionalFields raw value:', JSON.stringify(student.additionalFields));
        
        if (student.additionalFields) {
          let fieldsObj: any = null;
          
          // Handle both object and string formats
          if (typeof student.additionalFields === 'string') {
            try {
              fieldsObj = JSON.parse(student.additionalFields);
              console.log('   Parsed as JSON:', fieldsObj);
            } catch (e) {
              console.log('   Failed to parse as JSON, skipping:', e instanceof Error ? e.message : String(e));
            }
          } else if (typeof student.additionalFields === 'object' && student.additionalFields !== null) {
            fieldsObj = student.additionalFields;
            console.log('   Already an object:', fieldsObj);
          }
          
          if (fieldsObj && typeof fieldsObj === 'object') {
            const fields = Object.keys(fieldsObj);
            console.log('   Fields found:', fields);
            fields.forEach(field => {
              allAdditionalFields.add(field);
              console.log('     Added field to set:', field);
            });
          } else {
            console.log('   No valid object found in additionalFields');
          }
        } else {
          console.log('   No additionalFields for this student');
        }
      });
      
      console.log('\n🏷️ All unique additional fields collected:', Array.from(allAdditionalFields));
      
      // Add custom fields to available placeholders
      Array.from(allAdditionalFields).forEach(key => {
        const placeholderName = key.replace(/^(.)/, match => match.toUpperCase());
        availableFields.push(placeholderName);
        fieldMapping[key] = placeholderName;
        console.log('🏷️ Added custom placeholder:', key, '->', placeholderName);
      });
      
      console.log('\n🏷️ FINAL Available placeholders for campaign', cId, ':', availableFields);
      console.log('🏷️ FINAL Field mapping:', fieldMapping);
      
      res.json({
        availableFields,
        fieldMapping
      });
    } catch (error) {
      console.error('❌ Placeholders fetch error:', error);
      res.status(500).json({ error: "Failed to fetch available placeholders" });
    }
  });

  // Upload CSV
  app.post("/api/upload-csv", upload.single('file'), async (req, res) => {
    try {
      console.log('\n🚀 CSV Upload Request Started');
      console.log('📁 File info:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferType: typeof req.file.buffer,
        isBuffer: Buffer.isBuffer(req.file.buffer)
      } : 'No file');
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { campaignId } = req.body;
      console.log('📊 Campaign ID:', campaignId);
      if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID is required" });
      }

      const parsedCampaignId = Number(campaignId);
      if (!Number.isSafeInteger(parsedCampaignId) || parsedCampaignId <= 0 || !await storage.getCampaignById(parsedCampaignId)) return res.status(400).json({error: "Select a valid campaign"});
      const validation = await csvService.parseFile(req.file.buffer, req.file.originalname, { campaignId: parsedCampaignId });

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
      const students = await storage.replaceCampaignStudents(parsedCampaignId, studentsWithCampaign);

      // Log activity
      await storage.createActivityLog({
        action: "CSV_UPLOAD",
        description: `CSV file processed with ${students.length} records for campaign`,
        metadata: { recordCount: students.length, campaignId: parseInt(campaignId) }
      });

      res.json({
        message: "CSV processed successfully",
        recordCount: students.length,
        students,
        // Include dynamic field information
        availableFields: validation.availableFields,
        fieldMapping: validation.fieldMapping
      });
    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({ error: "Failed to process CSV file" });
    }
  });

  // Send bulk email
  app.post("/api/send-bulk", async (req, res) => {
    try {
      const { subject, message, targetSection, campaignId } = req.body;

      if (!subject || !message) {
        return res.status(400).json({ error: "Subject and message are required" });
      }

      if (!Number.isSafeInteger(Number(campaignId)) || Number(campaignId) <= 0) return res.status(400).json({error: "Select a campaign before sending"});
      // Use campaign ID if provided
      let students;
      if (targetSection === 'all') {
        students = await storage.getStudents(campaignId ? parseInt(campaignId.toString()) : undefined);
      } else {
        students = await storage.getStudentsBySection(targetSection, campaignId ? parseInt(campaignId.toString()) : undefined);
      }

      if (students.length === 0) {
        return res.status(400).json({ error: "No students found for the selected section" });
      }

      const config = await storage.getEmailConfig();
      if (!config) return res.status(400).json({error: "Configure a sender before sending"});
      const remaining = Math.max(0, (config.dailyLimit ?? 150) - (config.usedToday ?? 0));
      if (students.length > remaining) return res.status(400).json({error: `This campaign has ${students.length} recipients but only ${remaining} sends remain in the app cap today.`});

      // Create email logs for tracking
      const emailLogs: any[] = [];
      for (const student of students) {
        // Build dynamic placeholder data
        const placeholderData: Record<string, string> = {
          Name: student.name,
          Section: student.section,
          Email: student.email,
        };

        // Add additional fields if they exist (safe handling for new feature)
        try {
          if (student.additionalFields && typeof student.additionalFields === 'object' && student.additionalFields !== null) {
            Object.keys(student.additionalFields).forEach(key => {
              // Convert field name to placeholder format (e.g., 'student_id' -> 'Student_id')
              const placeholderName = key.replace(/^(.)/, match => match.toUpperCase());
              const additionalFields = student.additionalFields as Record<string, any>;
              if (additionalFields[key] !== null && additionalFields[key] !== undefined) {
                placeholderData[placeholderName] = String(additionalFields[key]);
              }
            });
          }
        } catch (error) {
          console.warn('⚠️ Warning: Could not process additional fields for student', student.name, ':', error);
          // Continue processing without additional fields
        }

        console.log('🏷️ Available placeholders for', student.name, ':', Object.keys(placeholderData));

        const personalizedSubject = emailService.replacePlaceholders(subject, placeholderData);
        const personalizedMessage = emailService.replacePlaceholders(message, placeholderData);

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
              const sendResult = await emailService.sendEmail({
                to: log.email,
                subject: log.subject,
                text: log.message,
              });
              
              if (!sendResult.success) throw new Error(sendResult.error || 'Mail server rejected the message');
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
  app.post("/api/send-individual", async (req, res) => {
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
        const sendResult = await emailService.sendEmail({
          to: student.email,
          subject: personalizedSubject,
          text: personalizedMessage,
        });
        
        if (!sendResult.success) throw new Error(sendResult.error || 'Mail server rejected the message');
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
  app.get("/api/email-config", async (req, res) => {
    try {
      const config = await storage.getEmailConfig();
      if (!config) {
        return res.json({
          senderEmail: '',
          dailyLimit: 150,
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
  app.post("/api/send-test", async (req, res) => {
    try {
      const { testEmail, subject, message } = req.body;

      if (!testEmail || !subject || !message) {
        return res.status(400).json({ error: "Test email, subject, and message are required" });
      }

      // Initialize email service
      await emailService.initialize();

      // Send test email
      const sendResult = await emailService.sendEmail({
        to: testEmail,
        subject: subject,
        text: message,
        html: undefined
      });

      if (!sendResult.success) throw new Error(sendResult.error || "Mail server rejected the message");
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
  app.post("/api/email-config", async (req, res) => {
    try {
      const validatedData = updateEmailConfigSchema.parse(req.body);
      
      // Get existing config to merge with update
      const existingConfig = await storage.getEmailConfig();
      
      // Merge existing config with new data
      const configData = {
        senderEmail: validatedData.senderEmail,
        senderPassword: validatedData.senderPassword || existingConfig?.senderPassword || '',
        dailyLimit: validatedData.dailyLimit,
        usedToday: existingConfig?.usedToday || 0
      };
      
      if (!configData.senderPassword || (existingConfig && existingConfig.senderEmail !== configData.senderEmail && !validatedData.senderPassword?.trim())) return res.status(400).json({error: "An app password is required for a new sender"});

      // Validate credentials if password is provided
      if (validatedData.senderPassword && validatedData.senderPassword.trim()) {
        try {
          // Test the credentials directly without saving to database first
const testTransporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: configData.senderEmail,
              pass: configData.senderPassword,
            },
          });
          
          // Verify the connection
          await testTransporter.verify();
          console.log('Gmail configuration test successful');
        } catch (error) {
          console.error('Gmail configuration test failed:', error);
          return res.status(400).json({ 
            error: "Invalid email configuration",
            details: error instanceof Error ? error.message : 'Gmail authentication failed. Please check your email and app password.'
          });
        }
      }
      
      // Save the configuration after successful validation
      const config = await storage.createOrUpdateEmailConfig(configData);
      
      // Re-initialize the email service with new config
      try {
        await emailService.initialize();
      } catch (error) {
        console.warn('Email service re-initialization warning:', error);
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
      if (error instanceof Error && error.message.includes('parse')) {
        res.status(400).json({ 
          error: "Invalid request data",
          details: error.message
        });
      } else {
        res.status(500).json({ 
          error: "Failed to update email configuration",
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // Get email logs
  app.get("/api/email-logs", async (req, res) => {
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
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const { limit } = req.query;
      const logs = await storage.getActivityLogs(limit ? parseInt(limit as string) : undefined);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Database usage monitoring for free tier
  app.get("/api/database-usage", async (req, res) => {
    try {
      const campaignCount = (await storage.getCampaigns()).length;
      const studentCount = (await storage.getStudents()).length;
      const emailLogCount = (await storage.getEmailLogs()).length;
      const activityLogCount = (await storage.getActivityLogs(1000)).length;
      
      // Estimate storage usage
      const estimatedStorage = {
        campaigns: campaignCount * 50, // bytes
        students: studentCount * 200,  // bytes  
        emailLogs: emailLogCount * 500, // bytes
        activityLogs: activityLogCount * 200, // bytes
        total: (campaignCount * 50) + (studentCount * 200) + (emailLogCount * 500) + (activityLogCount * 200)
      };
      
      const freeStorageLimit = 500 * 1024 * 1024; // 500MB in bytes
      const usagePercentage = (estimatedStorage.total / freeStorageLimit) * 100;
      
      res.json({
        counts: {
          campaigns: campaignCount,
          students: studentCount,
          emailLogs: emailLogCount,
          activityLogs: activityLogCount
        },
        storage: {
          used: estimatedStorage,
          freeLimit: freeStorageLimit,
          usagePercentage: Math.round(usagePercentage * 100) / 100,
          remainingMB: Math.round(((freeStorageLimit - estimatedStorage.total) / (1024 * 1024)) * 100) / 100
        },
        recommendations: {
          status: usagePercentage < 10 ? 'excellent' : usagePercentage < 50 ? 'good' : 'monitor',
          message: usagePercentage < 10 ? 'Usage is very low, no cleanup needed' : 
                  usagePercentage < 50 ? 'Usage is reasonable, monitor monthly' :
                  'Consider cleaning old data or upgrading'
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch database usage" });
    }
  });

  // Clear all data (DELETE method)
  app.delete("/api/clear-data", async (req, res) => {
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

  // Clear all data (POST method for Settings modal)
  app.post("/api/clear-data", async (req, res) => {
    try {
      // Clear all data completely for Settings modal
      await storage.deleteAllStudents(); // Clear all students
      
      // Clear campaigns (if you want to clear everything)
      const campaigns = await storage.getCampaigns();
      for (const campaign of campaigns) {
        await storage.deleteCampaign(campaign.id);
      }
      
      await storage.createActivityLog({
        action: "SYSTEM_DATA_CLEARED",
        description: "All system data cleared via Settings",
        metadata: { source: "settings_modal" }
      });

      res.json({ message: "All data cleared successfully" });
    } catch (error) {
      console.error('Clear data error:', error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // Export student data endpoint
  app.get("/api/export-students", async (req, res) => {
    try {
      const { campaignId } = req.query;
      const cId = campaignId ? parseInt(campaignId as string) : undefined;
      const students = await storage.getStudents(cId);
      
      // Create CSV content
      let csvContent = "Name,Email,Section,Campaign ID,Subject,Message,Created At\n";
      
      // Add student data
      students.forEach(student => {
        const row = [
          student.name || "",
          student.email || "",
          student.section || "",
          student.campaignId || "",
          student.subject || "",
          student.message || "",
          student.createdAt ? new Date(student.createdAt).toISOString() : ""
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(",");
        csvContent += row + "\n";
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="students-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Export students error:', error);
      res.status(500).json({ error: "Failed to export student data" });
    }
  });

  // Email validation endpoint
  app.get("/api/validate-emails", async (req, res) => {
    try {
      const { campaignId } = req.query;
      const cId = campaignId ? parseInt(campaignId as string) : undefined;
      const students = await storage.getStudents(cId);
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let validEmails = 0;
      let invalidEmails = 0;
      const invalidEmailDetails: any[] = [];
      
      students.forEach(student => {
        if (emailRegex.test(student.email)) {
          validEmails++;
        } else {
          invalidEmails++;
          invalidEmailDetails.push({
            id: student.id,
            name: student.name,
            email: student.email,
            section: student.section
          });
        }
      });
      
      // Log activity
      await storage.createActivityLog({
        action: "EMAIL_VALIDATION",
        description: `Email validation completed: ${validEmails} valid, ${invalidEmails} invalid`,
        metadata: { 
          validCount: validEmails,
          invalidCount: invalidEmails,
          campaignId: cId
        }
      });
      
      res.json({
        totalEmails: students.length,
        validEmails,
        invalidEmails,
        invalidEmailDetails: invalidEmailDetails.slice(0, 10) // Limit to first 10 for response size
      });
    } catch (error) {
      console.error('Email validation error:', error);
      res.status(500).json({ error: "Failed to validate emails" });
    }
  });

  // Get login history endpoint
  app.get("/api/login-history", async (req, res) => {
    try {
      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit as string) : 50;
      
      const { rows } = await pool.query(
        'SELECT username, ip_address, user_agent, status, timestamp FROM login_history ORDER BY timestamp DESC LIMIT $1',
        [limitNum]
      );
      
      const history = rows.map(row => ({
        username: row.username,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        status: row.status,
        timestamp: row.timestamp
      }));
      
      res.json(history);
    } catch (error) {
      console.error('Login history error:', error);
      res.status(500).json({ error: "Failed to fetch login history" });
    }
  });

  // Export logs endpoint
  app.get("/api/export-logs", async (req, res) => {
    try {
      const emailLogs = await storage.getEmailLogs();
      const activityLogs = await storage.getActivityLogs(1000);
      
      // Create CSV content
      let csvContent = "Type,Timestamp,Action,Details,Email,Status,CampaignId\n";
      
      // Add email logs
      emailLogs.forEach(log => {
        const row = [
          "EMAIL",
          log.sentAt || new Date().toISOString(),
          "EMAIL_SENT",
          log.subject || "",
          log.email || "",
          log.status || "",
          log.campaignId || ""
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(",");
        csvContent += row + "\n";
      });
      
      // Add activity logs
      activityLogs.forEach(log => {
        const row = [
          "ACTIVITY",
          log.createdAt?.toISOString() || new Date().toISOString(),
          log.action || "",
          log.description || "",
          "",
          "",
          ""
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(",");
        csvContent += row + "\n";
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="email-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Export logs error:', error);
      res.status(500).json({ error: "Failed to export logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
