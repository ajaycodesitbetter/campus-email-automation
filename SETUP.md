# Campus Email Automation - Setup Guide

## Quick Start

### 1. Database Configuration (Critical)

**⚠️ IMPORTANT**: The application requires a valid Neon database connection to function.

1. **Get your Neon database URL**:
   - Login to [Neon Console](https://console.neon.tech/)
   - Go to your project dashboard
   - Copy the connection string (should look like): 
     ```
     postgresql://neondb_owner:your_password@your_host.neon.tech/neondb?sslmode=require&channel_binding=require
     ```

2. **Setup environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Update .env file**:
   - Replace `YOUR_PASSWORD` with your actual Neon password
   - Replace `YOUR_HOST` with your actual Neon hostname
   - Update Gmail credentials if you want to test email functionality

### 2. Installation & Running

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### 3. Verify Setup

Check if everything is working:
```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-08-08T..."
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | ✅ Yes |
| `GMAIL_USER` | Gmail address for sending emails | ✅ Yes |
| `GMAIL_APP_PASSWORD` | Gmail app password | ✅ Yes |
| `SESSION_SECRET` | Secret for session management | ✅ Yes |
| `EMAIL_DAILY_LIMIT` | Daily email sending limit | No (default: 150) |
| `VITE_API_BASE_URL` | Backend URL for frontend | No (for production) |

## Database Schema

The application will automatically create required tables on first run:
- `students` - Student data and email information
- `campaigns` - Email campaign tracking
- `email_logs` - Email sending history and status

## Troubleshooting

### Database Connection Issues
- Ensure your Neon database is active (not paused)
- Check that the connection string includes `?sslmode=require&channel_binding=require`
- Verify your IP is whitelisted in Neon (if IP restrictions are enabled)

### Email Sending Issues
- Ensure Gmail App Password is correctly generated
- Check that 2FA is enabled on your Gmail account
- Verify the daily email limit hasn't been exceeded

## Production Deployment

For Railway deployment:
1. Set environment variables in Railway dashboard
2. Use the production build command: `npm run build`
3. Ensure the start command points to: `node dist/index.js`

---

**Last Updated**: August 8, 2025
**Database Status**: ✅ Connected and Operational
