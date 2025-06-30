// API Response Types for frontend components

export interface Campaign {
  id: number;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  createdAt: string;
  totalEmails: number;
  sentEmails: number;
  description?: string;
}

export interface EmailConfig {
  senderEmail: string;
  configured: boolean;
  dailyLimit: number;
  usedToday: number;
}

export interface ActivityItem {
  id: number;
  type: 'email_sent' | 'campaign_created' | 'user_action';
  message: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Campaign related types
export interface CampaignListResponse {
  campaigns: Campaign[];
}

export interface EmailConfigResponse {
  config: EmailConfig;
}

export interface RecentActivityResponse {
  activities: ActivityItem[];
}

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

export interface UserSession {
  user: User;
  isAuthenticated: boolean;
}

// Email types
export interface EmailData {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
