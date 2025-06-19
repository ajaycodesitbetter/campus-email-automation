# Campus Email Automation System

## Overview

This is a full-stack web application designed for college staff and coordinators to send personalized bulk emails to students for placements, admissions, or notices. The system provides section-based messaging capabilities, CSV data import, email tracking, and a modern user interface built with React and shadcn/ui components.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM (Neon serverless connection)
- **File Uploads**: Multer for CSV file processing
- **Email Service**: Nodemailer with Gmail SMTP integration
- **CSV Processing**: Papa Parse for parsing uploaded CSV files
- **Data Persistence**: Full database migration from in-memory to PostgreSQL completed

### Database Design
The system uses PostgreSQL with four main tables:
- **students**: Core student information (name, email, section)
- **emailLogs**: Email delivery tracking and status
- **emailConfig**: Gmail SMTP configuration and daily limits
- **activityLogs**: System activity tracking with JSON metadata

## Key Components

### Data Management
- **CSV Import**: Validates and processes student data uploads with duplicate detection
- **Section-based Organization**: Auto-groups students by section for targeted messaging
- **Email Tracking**: Comprehensive logging of email status (sent, failed, pending)

### Email System
- **Gmail Integration**: Uses Gmail SMTP with app-specific passwords
- **Daily Limits**: Configurable sending limits with automatic reset
- **Template System**: Supports placeholders ({{Name}}, {{Section}}) for personalization
- **Bulk Operations**: Send to all students, specific sections, or individuals

### User Interface
- **Dashboard**: Real-time statistics and activity monitoring
- **File Upload**: Drag-and-drop CSV import with validation feedback
- **Email Composer**: Rich text editor with section filtering and preview
- **Student Management**: Searchable table with pagination and bulk operations
- **Configuration Panel**: Gmail settings and daily limit management

## Data Flow

1. **CSV Upload**: Users upload student data → Server validates → Database insertion
2. **Email Composition**: Select recipients → Compose message → Preview → Send
3. **Email Processing**: Template parsing → SMTP delivery → Status logging
4. **Monitoring**: Real-time stats updates → Activity logging → Error handling

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL (configured via Neon serverless)
- **Email Service**: Gmail SMTP (requires app-specific password)
- **File Processing**: Multer for uploads, Papa Parse for CSV

### UI Dependencies
- **Component Library**: Radix UI primitives with shadcn/ui styling
- **Icons**: Lucide React icon set
- **Date Handling**: date-fns for formatting and manipulation

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with TypeScript compilation via tsx
- **Database**: PostgreSQL 16 with automatic provisioning
- **Hot Reload**: Vite dev server with HMR for frontend changes
- **Error Handling**: Runtime error overlay for development debugging

### Production Build
- **Frontend**: Vite build generating optimized static assets
- **Backend**: esbuild bundling server code for Node.js deployment
- **Database**: Drizzle migrations for schema management
- **Environment**: Autoscale deployment target with port 80 external access

### Configuration Requirements
- **DATABASE_URL**: PostgreSQL connection string (auto-provisioned)
- **Gmail Credentials**: Configured via admin panel (sender email + app password)
- **File Limits**: 10MB upload limit for CSV files

## Changelog

- June 19, 2025: Enhanced Campus Email Automation System with Campaign-Based Architecture
  - **Campaign Management**: Chat-style sections for multiple email campaigns
  - **Flexible Campaign Creation**: Create custom campaigns with emojis and descriptions
  - **Isolated Data**: Each campaign has its own students, emails, and statistics
  - **Enhanced UI**: Modern sidebar navigation with campaign switching
  - **Real-time Metrics**: Per-campaign statistics and success rates
  - **Database Migration**: Fully migrated from in-memory to PostgreSQL with campaign support
  - **Campaign-scoped Operations**: Upload CSV, compose emails, and track status per campaign
- June 19, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.