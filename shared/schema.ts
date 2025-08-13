import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  emoji: text("emoji").default("📧"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  section: text("section").notNull(),
  subject: text("subject"),
  message: text("message"),
  // Dynamic fields stored as JSON for flexibility
  additionalFields: jsonb("additional_fields").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  studentId: integer("student_id").references(() => students.id),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull(), // 'sent', 'failed', 'pending'
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const emailConfig = pgTable("email_config", {
  id: serial("id").primaryKey(),
  senderEmail: text("sender_email").notNull(),
  senderPassword: text("sender_password").notNull(),
  dailyLimit: integer("daily_limit").default(1500),
  usedToday: integer("used_today").default(0),
  lastResetDate: timestamp("last_reset_date").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

export const insertEmailConfigSchema = createInsertSchema(emailConfig).omit({
  id: true,
  lastResetDate: true,
});

// Update schema that makes password optional
export const updateEmailConfigSchema = insertEmailConfigSchema.extend({
  senderPassword: z.string().optional(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailConfig = typeof emailConfig.$inferSelect;
export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
