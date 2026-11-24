import { campaigns, students, emailLogs, emailConfig, activityLogs, type Campaign, type InsertCampaign, type Student, type InsertStudent, type EmailLog, type InsertEmailLog, type EmailConfig, type InsertEmailConfig, type ActivityLog, type InsertActivityLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getCampaignById(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  deleteCampaign(id: number): Promise<void>;

  // Students
  getStudents(campaignId?: number): Promise<Student[]>;
  getStudentsBySection(section: string, campaignId?: number): Promise<Student[]>;
  getStudentById(id: number): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  createStudents(students: InsertStudent[]): Promise<Student[]>;
  replaceCampaignStudents(campaignId: number, students: InsertStudent[]): Promise<Student[]>;
  deleteAllStudents(campaignId?: number): Promise<void>;

  // Email Logs
  getEmailLogs(campaignId?: number): Promise<EmailLog[]>;
  getEmailLogsByStudent(studentId: number): Promise<EmailLog[]>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;
  updateEmailLogStatus(id: number, status: string, errorMessage?: string): Promise<void>;

  // Email Config
  getEmailConfig(): Promise<EmailConfig | undefined>;
  createOrUpdateEmailConfig(config: InsertEmailConfig): Promise<EmailConfig>;
  incrementDailyUsage(): Promise<void>;
  resetDailyUsage(): Promise<void>;

  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Stats
  getStats(campaignId?: number): Promise<{
    totalStudents: number;
    emailsSent: number;
    emailsFailed: number;
    emailsPending: number;
  }>;
  getCampaignStats(campaignId: number): Promise<{
    totalStudents: number;
    emailsSent: number;
    emailsFailed: number;
    emailsPending: number;
    sections: string[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaignById(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db
      .insert(campaigns)
      .values(insertCampaign)
      .returning();
    return campaign;
  }

  async deleteCampaign(id: number): Promise<void> {
    await db.delete(emailLogs).where(eq(emailLogs.campaignId, id));
    await db.delete(students).where(eq(students.campaignId, id));
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Students
  async getStudents(campaignId?: number): Promise<Student[]> {
    if (campaignId) {
      return await db.select().from(students).where(eq(students.campaignId, campaignId)).orderBy(desc(students.createdAt));
    }
    return await db.select().from(students).orderBy(desc(students.createdAt));
  }

  async getStudentsBySection(section: string, campaignId?: number): Promise<Student[]> {
    if (campaignId) {
      return await db.select().from(students)
        .where(and(eq(students.section, section), eq(students.campaignId, campaignId)))
        .orderBy(desc(students.createdAt));
    }
    return await db.select().from(students).where(eq(students.section, section)).orderBy(desc(students.createdAt));
  }

  async getStudentById(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db
      .insert(students)
      .values(insertStudent)
      .returning();
    return student;
  }

  async createStudents(insertStudents: InsertStudent[]): Promise<Student[]> {
    if (insertStudents.length === 0) return [];
    return await db
      .insert(students)
      .values(insertStudents)
      .returning();
  }

  async replaceCampaignStudents(campaignId: number, records: InsertStudent[]): Promise<Student[]> {
    return db.transaction(async tx => {
      await tx.delete(emailLogs).where(eq(emailLogs.campaignId, campaignId));
      await tx.delete(students).where(eq(students.campaignId, campaignId));
      if (!records.length) return [];
      return tx.insert(students).values(records).returning();
    });
  }

  async deleteAllStudents(campaignId?: number): Promise<void> {
    if (campaignId) {
      await db.delete(emailLogs).where(eq(emailLogs.campaignId, campaignId));
      await db.delete(students).where(eq(students.campaignId, campaignId));
    } else {
      await db.delete(emailLogs);
      await db.delete(students);
    }
  }

  async getEmailLogs(campaignId?: number): Promise<EmailLog[]> {
    if (campaignId) {
      return await db.select().from(emailLogs).where(eq(emailLogs.campaignId, campaignId)).orderBy(desc(emailLogs.sentAt));
    }
    return await db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt));
  }

  async getEmailLogsByStudent(studentId: number): Promise<EmailLog[]> {
    return await db.select().from(emailLogs).where(eq(emailLogs.studentId, studentId)).orderBy(desc(emailLogs.sentAt));
  }

  async createEmailLog(insertLog: InsertEmailLog): Promise<EmailLog> {
    const [log] = await db
      .insert(emailLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async updateEmailLogStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(emailLogs)
      .set({
        status,
        errorMessage: errorMessage ?? null
      })
      .where(eq(emailLogs.id, id));
  }

  async getEmailConfig(): Promise<EmailConfig | undefined> {
    const [config] = await db.select().from(emailConfig).limit(1);

    if (config && config.lastResetDate) {
      // Check if we need to reset daily usage (new day)
      const today = new Date().toDateString();
      const lastResetDate = new Date(config.lastResetDate).toDateString();

      if (today !== lastResetDate) {
        console.log(`🔄 Daily reset needed: Last reset ${lastResetDate}, Today is ${today}`);
        // Reset directly without calling this.resetDailyUsage() to avoid recursion
        await db
          .update(emailConfig)
          .set({
            usedToday: 0,
            lastResetDate: new Date()
          })
          .where(eq(emailConfig.id, config.id));

        // Fetch the updated config after reset
        const [updatedConfig] = await db.select().from(emailConfig).limit(1);
        return updatedConfig || undefined;
      }
    }

    return config || undefined;
  }

  async createOrUpdateEmailConfig(insertConfig: InsertEmailConfig): Promise<EmailConfig> {
    const existing = await this.getEmailConfig();

    if (existing) {
      const [updated] = await db
        .update(emailConfig)
        .set(insertConfig)
        .where(eq(emailConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(emailConfig)
        .values(insertConfig)
        .returning();
      return created;
    }
  }

  async incrementDailyUsage(): Promise<void> {
    const config = await this.getEmailConfig();
    if (config) {
      await db
        .update(emailConfig)
        .set({
          usedToday: sql`COALESCE(${emailConfig.usedToday}, 0) + 1`
        })
        .where(eq(emailConfig.id, config.id));
    }
  }

  async resetDailyUsage(): Promise<void> {
    const config = await this.getEmailConfig();
    if (config) {
      await db
        .update(emailConfig)
        .set({
          usedToday: 0,
          lastResetDate: new Date()
        })
        .where(eq(emailConfig.id, config.id));
    }
  }

  async getActivityLogs(limit = 50): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getStats(campaignId?: number): Promise<{
    totalStudents: number;
    emailsSent: number;
    emailsFailed: number;
    emailsPending: number;
  }> {
    const allStudents = await this.getStudents(campaignId);
    const logs = await this.getEmailLogs(campaignId);

    return {
      totalStudents: allStudents.length,
      emailsSent: logs.filter(l => l.status === 'sent').length,
      emailsFailed: logs.filter(l => l.status === 'failed').length,
      emailsPending: logs.filter(l => l.status === 'pending').length,
    };
  }

  async getCampaignStats(campaignId: number): Promise<{
    totalStudents: number;
    emailsSent: number;
    emailsFailed: number;
    emailsPending: number;
    sections: string[];
  }> {
    const stats = await this.getStats(campaignId);
    const campaignStudents = await this.getStudents(campaignId);
    const sections = Array.from(new Set(campaignStudents.map(s => s.section)));

    return {
      ...stats,
      sections,
    };
  }
}

export const storage = new DatabaseStorage();
