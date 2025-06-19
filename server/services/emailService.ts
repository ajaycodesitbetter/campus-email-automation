import nodemailer from 'nodemailer';
import { storage } from '../storage';

export interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  async initialize() {
    const config = await storage.getEmailConfig();
    if (!config) {
      throw new Error('Email configuration not found');
    }

    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: config.senderEmail,
        pass: config.senderPassword,
      },
    });

    // Verify connection
    await this.transporter.verify();
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    if (!this.transporter) {
      await this.initialize();
    }

    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    const config = await storage.getEmailConfig();
    if (!config) {
      throw new Error('Email configuration not found');
    }

    // Check daily limit
    if ((config.usedToday || 0) >= (config.dailyLimit || 1500)) {
      throw new Error('Daily email limit reached');
    }

    // Send email
    await this.transporter.sendMail({
      from: config.senderEmail,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    });

    // Increment usage counter
    await storage.incrementDailyUsage();
  }

  async sendBulkEmails(emails: EmailData[], onProgress?: (sent: number, total: number) => void): Promise<{
    sent: number;
    failed: number;
    errors: string[];
  }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < emails.length; i++) {
      try {
        await this.sendEmail(emails[i]);
        sent++;
      } catch (error) {
        failed++;
        errors.push(`Failed to send to ${emails[i].to}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      if (onProgress) {
        onProgress(i + 1, emails.length);
      }
    }

    return { sent, failed, errors };
  }

  replacePlaceholders(template: string, data: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }
}

export const emailService = new EmailService();
