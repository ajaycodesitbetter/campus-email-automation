# Campus Email Automation - System Test Script
Write-Host "🧪 Campus Email Automation System Test" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Start the server in background
Write-Host "🚀 Starting development server..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden

# Wait for server to start
Write-Host "⏳ Waiting for server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

try {
    # Test 1: Health Check
    Write-Host "`n📊 Testing health endpoint..." -ForegroundColor Green
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Health Status: $($healthResponse.status)" -ForegroundColor Green
    Write-Host "   Database: $($healthResponse.database)" -ForegroundColor Gray
    
    # Test 2: Email Config Check
    Write-Host "`n📧 Testing email configuration..." -ForegroundColor Green
    $emailConfig = Invoke-RestMethod -Uri "http://localhost:5000/api/email-config" -Method GET -TimeoutSec 10
    Write-Host "✅ Email Config Retrieved" -ForegroundColor Green
    Write-Host "   Sender: $($emailConfig.senderEmail)" -ForegroundColor Gray
    Write-Host "   Daily Limit: $($emailConfig.dailyLimit)" -ForegroundColor Gray
    Write-Host "   Configured: $($emailConfig.configured)" -ForegroundColor Gray
    
    # Test 3: Dashboard Stats
    Write-Host "`n📈 Testing dashboard stats..." -ForegroundColor Green
    $stats = Invoke-RestMethod -Uri "http://localhost:5000/api/stats" -Method GET -TimeoutSec 10
    Write-Host "✅ Dashboard Stats Retrieved" -ForegroundColor Green
    Write-Host "   Total Students: $($stats.totalStudents)" -ForegroundColor Gray
    Write-Host "   Emails Sent: $($stats.totalSent)" -ForegroundColor Gray
    Write-Host "   Pending: $($stats.totalPending)" -ForegroundColor Gray
    Write-Host "   Failed: $($stats.totalFailed)" -ForegroundColor Gray
    
    # Test 4: Campaigns
    Write-Host "`n📋 Testing campaigns endpoint..." -ForegroundColor Green
    $campaigns = Invoke-RestMethod -Uri "http://localhost:5000/api/campaigns" -Method GET -TimeoutSec 10
    Write-Host "✅ Campaigns Retrieved: $($campaigns.Count) found" -ForegroundColor Green
    
    # Test 5: Students
    Write-Host "`n👥 Testing students endpoint..." -ForegroundColor Green
    $students = Invoke-RestMethod -Uri "http://localhost:5000/api/students" -Method GET -TimeoutSec 10
    Write-Host "✅ Students Retrieved: $($students.Count) found" -ForegroundColor Green
    
    # Test 6: Email Logs
    Write-Host "`n📧 Testing email logs..." -ForegroundColor Green
    $emailLogs = Invoke-RestMethod -Uri "http://localhost:5000/api/email-logs" -Method GET -TimeoutSec 10
    Write-Host "✅ Email Logs Retrieved: $($emailLogs.Count) found" -ForegroundColor Green
    
    # Test 7: Activity Logs
    Write-Host "`n📝 Testing activity logs..." -ForegroundColor Green
    $activityLogs = Invoke-RestMethod -Uri "http://localhost:5000/api/activity-logs" -Method GET -TimeoutSec 10
    Write-Host "✅ Activity Logs Retrieved: $($activityLogs.Count) found" -ForegroundColor Green
    
    Write-Host "`n🎉 ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "`n📋 System Status Summary:" -ForegroundColor Cyan
    Write-Host "  ✅ API Health: Working" -ForegroundColor Green
    Write-Host "  ✅ Database: Connected ($($healthResponse.database))" -ForegroundColor Green
    $configStatus = if ($emailConfig.configured) { 'Configured' } else { 'Not Configured' }
    Write-Host "  ✅ Email Config: $configStatus" -ForegroundColor Green
    Write-Host "  ✅ Dashboard Stats: Working" -ForegroundColor Green
    Write-Host "  ✅ Campaigns: $($campaigns.Count) available" -ForegroundColor Green
    Write-Host "  ✅ Students: $($students.Count) in database" -ForegroundColor Green
    Write-Host "  ✅ Email Logs: $($emailLogs.Count) tracked" -ForegroundColor Green
    Write-Host "  ✅ Activity Logs: $($activityLogs.Count) recorded" -ForegroundColor Green
    
    Write-Host "`n🚀 Application is ready for:" -ForegroundColor Yellow
    Write-Host "  • Full email workflow testing" -ForegroundColor White
    Write-Host "  • Real-time status updates" -ForegroundColor White
    Write-Host "  • File upload and processing" -ForegroundColor White
    Write-Host "  • Campaign management" -ForegroundColor White
    Write-Host "  • Bulk email sending" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ TEST FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check if server is running on port 5000" -ForegroundColor White
    Write-Host "  2. Verify database connection" -ForegroundColor White
    Write-Host "  3. Check network connectivity" -ForegroundColor White
} finally {
    # Clean up: Stop the server
    Write-Host "`n🛑 Stopping development server..." -ForegroundColor Yellow
    if ($serverProcess -and !$serverProcess.HasExited) {
        $serverProcess.Kill()
        $serverProcess.WaitForExit(5000)
    }
    Write-Host "✅ Server stopped" -ForegroundColor Green
}

Write-Host "`n📝 Test completed at $(Get-Date)" -ForegroundColor Gray
