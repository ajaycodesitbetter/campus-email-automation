# Campus Email Automation System

A modern, campaign-based email automation system designed for college staff and coordinators to send personalized bulk emails to students for placements, admissions, or notices.

## Features

- **Campaign Management**: Create multiple email campaigns with custom names and emojis
- **Flexible Section-Based Messaging**: Send different messages to different student groups
- **CSV Data Import**: Upload student data with validation and duplicate detection
- **Gmail SMTP Integration**: Secure email sending with app password support
- **Email Tracking**: Monitor sent, failed, and pending email status
- **Personalization**: Use placeholders like {{Name}}, {{Section}}, {{Email}}
- **Real-time Statistics**: Campaign metrics and success rates
- **PostgreSQL Database**: Persistent data storage with full CRUD operations

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- TanStack Query for state management
- Wouter for routing
- React Hook Form with Zod validation

### Backend
- Node.js with Express.js
- PostgreSQL with Drizzle ORM
- Nodemailer for email sending
- Multer for file uploads
- Papa Parse for CSV processing

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Create a PostgreSQL database and set the DATABASE_URL environment variable:
```bash
npm run db:push
```

### 3. Gmail Configuration
- Enable 2-factor authentication on your Gmail account
- Generate an app-specific password
- Configure these in the application's Gmail settings

### 4. Run the Application
```bash
npm run dev
```

## Usage

1. **Create Campaigns**: Use the sidebar to create new email campaigns
2. **Upload Student Data**: Upload CSV files with columns: Name, Email, Section
3. **Compose Emails**: Write personalized messages using placeholders
4. **Send Emails**: Send to all students or specific sections
5. **Track Progress**: Monitor email delivery status and statistics

## CSV Format

Required columns:
- Name: Student's full name
- Email: Valid email address
- Section: Student's section/category

Optional columns:
- Subject: Custom subject for individual students
- Message: Custom message for individual students

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: development/production

## Local Development

To set up this project locally after downloading from Replit:

1. **Configure Environment Variables**
   - Create a `.env` file in the project root
   - Add the following variables:
     ```
     NODE_ENV=development
     DATABASE_URL=<your-postgres-connection-string>
     ```

2. **Initialize Database**
   - Run `npm run db:push` to create all required tables
   - If migrating from Replit, export data or use the same database URL

3. **Configure Email Settings**
   - The app will prompt you to set up Gmail credentials on first run
   - Use a Gmail account with an app-specific password

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License


MIT License