import nodemailer from "nodemailer";
import { storage } from "../storage";

/**
 * Represents the data structure for an email
 */
export interface EmailData {
  to: string | string[]; // Support single recipient or multiple recipients
  subject: string;
  text: string;
  html?: string;
  attachments?: nodemailer.Attachment[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

/**
 * Email campaign configuration
 */
export interface EmailCampaignConfig {
  /** Unique identifier for the campaign */
  id: string;
  /** Name of the campaign */
  name: string;
  /** List of emails to send */
  emails: EmailData[];
  /** Delay between emails in milliseconds (default: 1000ms) */
  delayBetweenEmails?: number;
  /** Maximum retry attempts for failed emails (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds (default: 2000ms) */
  initialRetryDelay?: number;
  /** Maximum concurrent emails to send (default: 1) */
  concurrency?: number;
}

/**
 * Status of an email in a campaign
 */
type EmailStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'retrying';

/**
 * Campaign progress tracking
 */
interface CampaignProgress {
  /** Total number of emails in the campaign */
  total: number;
  /** Number of emails sent successfully */
  sent: number;
  /** Number of emails failed */
  failed: number;
  /** Number of emails pending */
  pending: number;
  /** Number of emails currently being sent */
  sending: number;
  /** Number of emails being retried */
  retrying: number;
  /** Detailed status of each email */
  emailStatuses: Map<number, { status: EmailStatus; attempts: number; error?: string }>;
  /** Start time of the campaign */
  startTime: Date;
  /** End time of the campaign (if completed) */
  endTime?: Date;
  /** List of errors encountered */
  errors: Array<{ index: number; to: string; error: string; timestamp: Date }>;
}

/**
 * Email campaign status
 */
export interface CampaignStatus {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused';
  progress: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    sending: number;
    retrying: number;
    percentComplete: number;
  };
  startTime?: Date;
  endTime?: Date;
  errors: Array<{ to: string; error: string; timestamp: Date }>;
  estimatedTimeRemaining?: string;
}

/**
 * Result of sending an email
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Queue item representing a campaign
 */
interface QueueItem {
  config: EmailCampaignConfig;
  progress: CampaignProgress;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused';
  onProgress?: (status: CampaignStatus) => void;
  onComplete?: (status: CampaignStatus) => void;
}

/**
 * Enhanced Email Service with queue system, rate limiting, and retry logic
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private currentCampaign: QueueItem | null = null;
  private logger: (message: string, level?: 'info' | 'warn' | 'error') => void;

  constructor(
    logger: (message: string, level?: 'info' | 'warn' | 'error') => void = 
      (message, level = 'info') => console.log(`[EmailService][${level.toUpperCase()}] ${message}`)
  ) {
    this.logger = logger;
  }

  /**
   * Initialize the email service with the configured settings
   * @throws Error if email configuration is not found
   */
  async initialize() {
    const config = await storage.getEmailConfig();
    if (!config) {
      throw new Error("Email configuration not found");
    }

    this.logger(`Initializing email service with ${config.senderEmail}`, 'info');

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.senderEmail,
        pass: config.senderPassword,
      },
      // Add rate limiting to avoid Gmail throttling
      pool: true, // Use connection pool
      maxConnections: 5,
      maxMessages: 100, // max messages per connection
      rateDelta: 1000, // milliseconds between messages
      rateLimit: 5, // max messages per rateDelta
    });

    // Verify connection
    this.logger('Verifying connection to email server...', 'info');
    await this.transporter.verify();
    this.logger('Email server connection verified successfully', 'info');
  }

  /**
   * Helper method to sleep for a specified duration
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send a single email
   * @param emailData Email data to send
   * @param retryCount Current retry attempt (internal use)
   * @param initialDelay Initial delay for exponential backoff (internal use)
   * @returns Result of the send operation
   * @throws Error if daily limit is reached or if sending fails after max retries
   */
  async sendEmail(
    emailData: EmailData, 
    retryCount: number = 0, 
    initialDelay: number = 2000
  ): Promise<EmailSendResult> {
    try {
      if (!this.transporter) {
        this.logger('Email service not initialized, initializing now...', 'info');
        await this.initialize();
      }

      if (!this.transporter) {
        throw new Error("Email service not initialized");
      }

      const config = await storage.getEmailConfig();
      if (!config) {
        throw new Error("Email configuration not found");
      }

      // Check daily limit
      if ((config.usedToday || 0) >= (config.dailyLimit || 1500)) {
        throw new Error("Daily email limit reached");
      }

      // Prepare email options
      const mailOptions: nodemailer.SendMailOptions = {
        from: config.senderEmail,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      };

      // Add optional fields if provided
      if (emailData.cc) mailOptions.cc = emailData.cc;
      if (emailData.bcc) mailOptions.bcc = emailData.bcc;
      if (emailData.replyTo) mailOptions.replyTo = emailData.replyTo;
      if (emailData.attachments) mailOptions.attachments = emailData.attachments;

      // Send email
      this.logger(`Sending email to ${typeof emailData.to === 'string' ? emailData.to : emailData.to.join(', ')}`, 'info');
      const info = await this.transporter.sendMail(mailOptions);

      // Increment usage counter
      await storage.incrementDailyUsage();
      
      this.logger(`Email sent successfully with message ID: ${info.messageId}`, 'info');
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If we've reached the daily limit, don't retry
      if (errorMessage.includes("Daily email limit reached")) {
        this.logger(`Failed to send email: ${errorMessage}`, 'error');
        return {
          success: false,
          error: errorMessage
        };
      }
      
      // Implement exponential backoff for retries
      const maxRetries = 3; // Maximum number of retry attempts
      
      if (retryCount < maxRetries) {
        const delay = initialDelay * Math.pow(2, retryCount);
        this.logger(`Retry attempt ${retryCount + 1}/${maxRetries} after ${delay}ms: ${errorMessage}`, 'warn');
        
        // Wait before retrying
        await this.sleep(delay);
        
        // Recursive retry with incremented count
        return this.sendEmail(emailData, retryCount + 1, initialDelay);
      }
      
      // Max retries exceeded
      this.logger(`Failed to send email after ${maxRetries} attempts: ${errorMessage}`, 'error');
      return {
        success: false,
        error: `Failed after ${maxRetries} attempts: ${errorMessage}`
      };
    }
  }

  /**
   * Send bulk emails with rate limiting
   * @param emails Array of emails to send
   * @param delayBetweenEmails Delay between emails in milliseconds (default: 1000ms)
   * @param onProgress Callback for progress updates
   * @returns Summary of bulk send operation
   */
  async sendBulkEmails(
    emails: EmailData[], 
    delayBetweenEmails: number = 1000,
    onProgress?: (sent: number, total: number) => void
  ): Promise<{
    sent: number;
    failed: number;
    errors: string[];
  }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    this.logger(`Starting bulk email send of ${emails.length} emails with ${delayBetweenEmails}ms delay between emails`, 'info');

    for (let i = 0; i < emails.length; i++) {
      try {
        const result = await this.sendEmail(emails[i]);
        
        if (result.success) {
          sent++;
          this.logger(`Email ${i+1}/${emails.length} sent successfully`, 'info');
        } else {
          failed++;
          const errorMsg = `Failed to send to ${typeof emails[i].to === 'string' ? emails[i].to : emails[i].to.join(', ')}: ${result.error || "Unknown error"}`;
          errors.push(errorMsg);
          this.logger(errorMsg, 'error');
        }
      } catch (error) {
        failed++;
        const errorMsg = `Failed to send to ${typeof emails[i].to === 'string' ? emails[i].to : emails[i].to.join(', ')}: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMsg);
        this.logger(errorMsg, 'error');
      }
      
      if (onProgress) {
        onProgress(i + 1, emails.length);
      }
      
      // Add delay between emails to avoid rate limiting (except for the last email)
      if (i < emails.length - 1) {
        await this.sleep(delayBetweenEmails);
      }
    }

    this.logger(`Bulk email send completed: ${sent} sent, ${failed} failed`, 'info');
    return { sent, failed, errors };
  }

  /**
   * Queue a new email campaign for processing
   * @param campaign Campaign configuration
   * @param onProgress Callback for progress updates
   * @param onComplete Callback when campaign completes
   * @returns Campaign ID
   */
  queueCampaign(
    campaign: EmailCampaignConfig,
    onProgress?: (status: CampaignStatus) => void,
    onComplete?: (status: CampaignStatus) => void
  ): string {
    // Initialize progress tracking
    const progress: CampaignProgress = {
      total: campaign.emails.length,
      sent: 0,
      failed: 0,
      pending: campaign.emails.length,
      sending: 0,
      retrying: 0,
      emailStatuses: new Map(
        campaign.emails.map((_, index) => [index, { status: 'pending', attempts: 0 }])
      ),
      startTime: new Date(),
      errors: []
    };

    // Create queue item
    const queueItem: QueueItem = {
      config: campaign,
      progress,
      status: 'queued',
      onProgress,
      onComplete
    };

    // Add to queue
    this.queue.push(queueItem);
    this.logger(`Campaign "${campaign.name}" (${campaign.id}) added to queue with ${campaign.emails.length} emails`, 'info');

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return campaign.id;
  }

  /**
   * Get the status of a campaign
   * @param campaignId ID of the campaign
   * @returns Campaign status or null if not found
   */
  getCampaignStatus(campaignId: string): CampaignStatus | null {
    const campaign = this.queue.find(item => item.config.id === campaignId) || 
                    (this.currentCampaign?.config.id === campaignId ? this.currentCampaign : null);
    
    if (!campaign) return null;

    const { sent, failed, total, pending, sending, retrying } = campaign.progress;
    
    return {
      id: campaign.config.id,
      name: campaign.config.name,
      status: campaign.status,
      progress: {
        total,
        sent,
        failed,
        pending,
        sending,
        retrying,
        percentComplete: Math.round((sent + failed) / total * 100)
      },
      startTime: campaign.progress.startTime,
      endTime: campaign.progress.endTime,
      errors: campaign.progress.errors.map(e => ({
        to: typeof campaign.config.emails[e.index].to === 'string' 
          ? campaign.config.emails[e.index].to as string
          : (campaign.config.emails[e.index].to as string[]).join(', '),
        error: e.error,
        timestamp: e.timestamp
      })),
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(campaign)
    };
  }

  /**
   * Get status of all campaigns (active and queued)
   * @returns Array of campaign statuses
   */
  getAllCampaignStatuses(): CampaignStatus[] {
    const allCampaigns = [...this.queue];
    if (this.currentCampaign) {
      allCampaigns.unshift(this.currentCampaign);
    }
    
    return allCampaigns.map(campaign => {
      const { sent, failed, total, pending, sending, retrying } = campaign.progress;
      
      return {
        id: campaign.config.id,
        name: campaign.config.name,
        status: campaign.status,
        progress: {
          total,
          sent,
          failed,
          pending,
          sending,
          retrying,
          percentComplete: Math.round((sent + failed) / total * 100)
        },
        startTime: campaign.progress.startTime,
        endTime: campaign.progress.endTime,
        errors: campaign.progress.errors.map(e => ({
          to: typeof campaign.config.emails[e.index].to === 'string' 
            ? campaign.config.emails[e.index].to as string
            : (campaign.config.emails[e.index].to as string[]).join(', '),
          error: e.error,
          timestamp: e.timestamp
        })),
        estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(campaign)
      };
    });
  }

  /**
   * Pause a running campaign
   * @param campaignId ID of the campaign to pause
   * @returns True if campaign was paused, false if not found or already completed
   */
  pauseCampaign(campaignId: string): boolean {
    // Check if it's the current campaign
    if (this.currentCampaign && this.currentCampaign.config.id === campaignId) {
      if (this.currentCampaign.status === 'running') {
        this.currentCampaign.status = 'paused';
        this.logger(`Campaign "${this.currentCampaign.config.name}" (${campaignId}) paused`, 'info');
        return true;
      }
      return false;
    }
    
    // Check queued campaigns
    const campaign = this.queue.find(item => item.config.id === campaignId);
    if (campaign && campaign.status === 'queued') {
      campaign.status = 'paused';
      this.logger(`Queued campaign "${campaign.config.name}" (${campaignId}) paused`, 'info');
      return true;
    }
    
    return false;
  }

  /**
   * Resume a paused campaign
   * @param campaignId ID of the campaign to resume
   * @returns True if campaign was resumed, false if not found or not paused
   */
  resumeCampaign(campaignId: string): boolean {
    // Check if it's the current campaign
    if (this.currentCampaign && this.currentCampaign.config.id === campaignId) {
      if (this.currentCampaign.status === 'paused') {
        this.currentCampaign.status = 'running';
        this.logger(`Campaign "${this.currentCampaign.config.name}" (${campaignId}) resumed`, 'info');
        // Resume processing
        this.processQueue();
        return true;
      }
      return false;
    }
    
    // Check queued campaigns
    const campaign = this.queue.find(item => item.config.id === campaignId);
    if (campaign && campaign.status === 'paused') {
      campaign.status = 'queued';
      this.logger(`Queued campaign "${campaign.config.name}" (${campaignId}) resumed`, 'info');
      
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
      return true;
    }
    
    return false;
  }

  /**
   * Cancel a campaign (running or queued)
   * @param campaignId ID of the campaign to cancel
   * @returns True if campaign was cancelled, false if not found or already completed
   */
  cancelCampaign(campaignId: string): boolean {
    // Check if it's the current campaign
    if (this.currentCampaign && this.currentCampaign.config.id === campaignId) {
      if (['running', 'paused'].includes(this.currentCampaign.status)) {
        this.currentCampaign.status = 'failed';
        this.currentCampaign.progress.endTime = new Date();
        this.logger(`Campaign "${this.currentCampaign.config.name}" (${campaignId}) cancelled`, 'info');
        
        // Notify completion
        if (this.currentCampaign.onComplete) {
          this.currentCampaign.onComplete(this.getCampaignStatus(campaignId)!);
        }
        
        this.currentCampaign = null;
        this.isProcessing = false;
        
        // Resume queue processing
        this.processQueue();
        return true;
      }
      return false;
    }
    
    // Check queued campaigns
    const index = this.queue.findIndex(item => item.config.id === campaignId);
    if (index !== -1) {
      const campaign = this.queue[index];
      if (['queued', 'paused'].includes(campaign.status)) {
        campaign.status = 'failed';
        campaign.progress.endTime = new Date();
        this.logger(`Queued campaign "${campaign.config.name}" (${campaignId}) cancelled`, 'info');
        
        // Notify completion
        if (campaign.onComplete) {
          campaign.onComplete(this.getCampaignStatus(campaignId)!);
        }
        
        // Remove from queue
        this.queue.splice(index, 1);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Process the email queue
   * @private
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    // Get the next campaign from the queue that's not paused
    const nextCampaign = this.queue.find(item => item.status === 'queued');
    if (!nextCampaign) {
      this.isProcessing = false;
      return;
    }
    
    // Remove from queue and set as current
    this.queue = this.queue.filter(item => item !== nextCampaign);
    this.currentCampaign = nextCampaign;
    this.currentCampaign.status = 'running';
    
    this.logger(`Starting campaign "${nextCampaign.config.name}" (${nextCampaign.config.id})`, 'info');
    
    try {
      const { 
        emails, 
        delayBetweenEmails = 1000, 
        maxRetries = 3, 
        initialRetryDelay = 2000,
        concurrency = 1
      } = nextCampaign.config;
      
      const progress = nextCampaign.progress;
      
      // Process emails with concurrency control
      for (let i = 0; i < emails.length && this.currentCampaign?.status === 'running'; i += concurrency) {
        const batch = [];
        
        // Create a batch of emails to process concurrently
        for (let j = 0; j < concurrency && i + j < emails.length; j++) {
          const index = i + j;
          const emailStatus = progress.emailStatuses.get(index);
          
          // Skip emails that have already been sent or failed
          if (emailStatus?.status === 'sent' || emailStatus?.status === 'failed') {
            continue;
          }
          
          // Update status to sending
          progress.emailStatuses.set(index, { ...emailStatus!, status: 'sending', attempts: emailStatus!.attempts });
          progress.sending++;
          progress.pending--;
          
          batch.push(this.processEmail(index, nextCampaign, maxRetries, initialRetryDelay));
        }
        
        // Wait for all emails in batch to complete
        await Promise.all(batch);
        
        // Update progress
        if (nextCampaign.onProgress) {
          nextCampaign.onProgress(this.getCampaignStatus(nextCampaign.config.id)!);
        }
        
        // Check if campaign is paused, if so, break the loop
        if (this.currentCampaign?.status === 'paused') {
          this.logger(`Campaign "${nextCampaign.config.name}" (${nextCampaign.config.id}) paused during processing`, 'info');
          break;
        }
        
        // Add delay between batches (except for the last batch)
        if (i + concurrency < emails.length && this.currentCampaign?.status === 'running') {
          await this.sleep(delayBetweenEmails);
        }
      }
      
      // If campaign is still running (not paused), mark as completed
      if (this.currentCampaign?.status === 'running') {
        this.currentCampaign.status = 'completed';
        this.currentCampaign.progress.endTime = new Date();
        
        this.logger(`Campaign "${nextCampaign.config.name}" (${nextCampaign.config.id}) completed: ${progress.sent} sent, ${progress.failed} failed`, 'info');
        
        // Notify completion
        if (nextCampaign.onComplete) {
          nextCampaign.onComplete(this.getCampaignStatus(nextCampaign.config.id)!);
        }
        
        this.currentCampaign = null;
      }
    } catch (error) {
      if (this.currentCampaign) {
        this.currentCampaign.status = 'failed';
        this.currentCampaign.progress.endTime = new Date();
        
        this.logger(`Campaign "${nextCampaign.config.name}" (${nextCampaign.config.id}) failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
        
        // Notify completion
        if (nextCampaign.onComplete) {
          nextCampaign.onComplete(this.getCampaignStatus(nextCampaign.config.id)!);
        }
        
        this.currentCampaign = null;
      }
    } finally {
      this.isProcessing = false;
      
      // Continue processing the queue if there are more campaigns
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Process a single email within a campaign
   * @param index Index of the email in the campaign
   * @param campaign Campaign object
   * @param maxRetries Maximum retry attempts
   * @param initialRetryDelay Initial retry delay in milliseconds
   * @private
   */
  private async processEmail(
    index: number, 
    campaign: QueueItem, 
    maxRetries: number,
    initialRetryDelay: number
  ): Promise<void> {
    const email = campaign.config.emails[index];
    const progress = campaign.progress;
    let emailStatus = progress.emailStatuses.get(index)!;
    
    try {
      // Attempt to send the email with retry logic
      let result: EmailSendResult;
      let attempts = 0;
      let delay = initialRetryDelay;
      
      while (attempts <= maxRetries) {
        // Check if campaign is still running
        if (campaign.status !== 'running') {
          // Update status
          progress.emailStatuses.set(index, { ...emailStatus, status: 'pending' });
          progress.sending--;
          progress.pending++;
          return;
        }
        
        result = await this.sendEmail(email);
        
        // If successful, update status and break
        if (result.success) {
          emailStatus.status = 'sent';
          emailStatus.attempts = attempts + 1;
          progress.emailStatuses.set(index, emailStatus);
          progress.sent++;
          progress.sending--;
          this.logger(`Campaign "${campaign.config.name}" email ${index + 1}/${campaign.config.emails.length} sent successfully`, 'info');
          return;
        }
        
        // If this is the last attempt or we hit the daily limit, mark as failed
        if (attempts >= maxRetries || result.error?.includes('Daily email limit reached')) {
          throw new Error(result.error || 'Unknown error');
        }
        
        // Update status for retry
        emailStatus.status = 'retrying';
        emailStatus.attempts = attempts + 1;
        progress.emailStatuses.set(index, emailStatus);
        progress.sending--;
        progress.retrying++;
        
        this.logger(`Campaign "${campaign.config.name}" email ${index + 1}/${campaign.config.emails.length} retry ${attempts + 1}/${maxRetries}`, 'warn');
        
        // Wait before retrying
        await this.sleep(delay);
        
        // Update status back to sending
        emailStatus.status = 'sending';
        progress.emailStatuses.set(index, emailStatus);
        progress.sending++;
        progress.retrying--;
        
        // Increase delay for next retry (exponential backoff)
        delay *= 2;
        attempts++;
      }
      
      // Should never reach here due to the while loop condition
      throw new Error('Unexpected error in retry logic');
    } catch (error) {
      // Update status to failed
      emailStatus.status = 'failed';
      emailStatus.error = error instanceof Error ? error.message : String(error);
      progress.emailStatuses.set(index, emailStatus);
      progress.failed++;
      progress.sending--;
      
      // Add to errors list
      progress.errors.push({
        index,
        to: typeof email.to === 'string' ? email.to : email.to.join(', '),
        error: emailStatus.error,
        timestamp: new Date()
      });
      
      this.logger(`Campaign "${campaign.config.name}" email ${index + 1}/${campaign.config.emails.length} failed: ${emailStatus.error}`, 'error');
    }
  }

  /**
   * Calculate estimated time remaining for a campaign
   * @param campaign Campaign object
   * @returns Formatted string with estimated time remaining
   * @private
   */
  private calculateEstimatedTimeRemaining(campaign: QueueItem): string {
    const { startTime, sent, failed, total } = campaign.progress;
    
    // If campaign hasn't started or has no progress, return unknown
    if (!startTime || (sent === 0 && failed === 0)) {
      return 'Unknown';
    }
    
    // If campaign is complete, return completed
    if (sent + failed >= total) {
      return 'Completed';
    }
    
    // Calculate time elapsed
    const elapsed = Date.now() - startTime.getTime();
    
    // Calculate emails processed per millisecond
    const processedCount = sent + failed;
    const emailsPerMs = processedCount / elapsed;
    
    // Calculate remaining time
    const remainingEmails = total - processedCount;
    const remainingTimeMs = remainingEmails / emailsPerMs;
    
    // Format the time
    if (remainingTimeMs < 60000) {
      // Less than a minute
      return `${Math.ceil(remainingTimeMs / 1000)} seconds`;
    } else if (remainingTimeMs < 3600000) {
      // Less than an hour
      return `${Math.ceil(remainingTimeMs / 60000)} minutes`;
    } else {
      // Hours
      const hours = Math.floor(remainingTimeMs / 3600000);
      const minutes = Math.ceil((remainingTimeMs % 3600000) / 60000);
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }

  /**
   * Replace placeholders in a template with actual data
   * @param template Template string with placeholders in {{placeholder}} format
   * @param data Object containing key-value pairs to replace placeholders
   * @returns Processed template with placeholders replaced
   */
  replacePlaceholders(template: string, data: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Create email content for multiple recipients with personalized data
   * @param baseEmail Base email template
   * @param recipientsData Array of recipient data objects
   * @returns Array of personalized emails
   */
  createPersonalizedEmails(
    baseEmail: Omit<EmailData, 'to'>, 
    recipientsData: Array<{ email: string; data: Record<string, string> }>
  ): EmailData[] {
    return recipientsData.map(recipient => {
      const personalizedSubject = this.replacePlaceholders(baseEmail.subject, recipient.data);
      const personalizedText = this.replacePlaceholders(baseEmail.text, recipient.data);
      const personalizedHtml = baseEmail.html ? this.replacePlaceholders(baseEmail.html, recipient.data) : undefined;
      
      return {
        ...baseEmail,
        to: recipient.email,
        subject: personalizedSubject,
        text: personalizedText,
        html: personalizedHtml
      };
    });
  }
}

export const emailService = new EmailService();
