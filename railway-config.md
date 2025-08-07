# Railway Sleep Mode Configuration

## Current Status
✅ Your app is deployed and responding
⚠️ Need to verify sleep mode is enabled

## How to Enable Sleep Mode

### Method 1: Railway Dashboard (Recommended)
1. Visit: https://railway.app/dashboard
2. Select your project: "campus-email-automation" 
3. Click on your service (backend/server)
4. Go to **Settings** tab
5. Look for **"Sleep Mode"** or **"Auto Sleep"**
6. Enable with 5-10 minute timeout

### Method 2: railway.json Configuration
Create this file in your project root if dashboard option not available:

```json
{
  "deploy": {
    "sleepMode": {
      "enabled": true,
      "timeout": 300
    }
  }
}
```

### Method 3: Environment Variable
Add to Railway environment variables:
```
RAILWAY_SLEEP_MODE=true
RAILWAY_SLEEP_TIMEOUT=300
```

## Verification Steps

### 1. Test Sleep Functionality
```bash
# Make a request to wake up app
curl https://campus-email-automation-production.up.railway.app/api/health

# Wait 10 minutes, then try again
# If sleep mode is working, first request after sleep will be slower
```

### 2. Monitor Usage
- Check Railway dashboard for compute hour usage
- Should show significant reduction after enabling sleep

### 3. Expected Behavior
- **First request after sleep**: 2-5 second delay (cold start)
- **Subsequent requests**: Normal speed
- **Auto-sleep**: After 5-10 minutes of inactivity

## College Usage Pattern with Sleep Mode

### Daily Usage
```
8:00 AM: Admin opens app (cold start - 3 seconds)
8:01 AM: Upload CSV, send emails (15 minutes active)
8:16 AM: Close browser, app sleeps in 5 minutes
1:00 PM: Check email status (cold start - 3 seconds) 
1:05 PM: App sleeps again
```

### Monthly Compute Hours
- **Active time**: ~10 hours
- **Sleep time**: 0 hours charged
- **Total cost**: 10/500 = 2% of free limit

## Benefits for College Use
✅ **Cost Effective**: Uses only 2% of free compute hours
✅ **Always Available**: App wakes up automatically when accessed
✅ **No Maintenance**: Fully automated sleep/wake cycle
✅ **Performance**: 3-second cold start is acceptable for college admin use

## Troubleshooting
- **Slow first load**: Normal behavior (cold start)
- **App not sleeping**: Check Railway dashboard settings
- **High compute usage**: Sleep mode may not be enabled
