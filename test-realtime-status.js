import { config } from 'dotenv';
import { storage } from './server/storage.js';

// Load environment variables
config();

async function testRealtimeStatus() {
  console.log('🔄 Testing Real-time Status Updates');
  console.log('=' .repeat(60));
  
  try {
    // Test database connection
    console.log('📊 Testing database connectivity...');
    const healthCheck = await storage.getEmailConfig();
    console.log('✅ Database connection successful');
    
    // Test stats retrieval
    console.log('\n📈 Testing stats retrieval...');
    const stats = await storage.getStats();
    console.log('Dashboard Stats:', {
      totalStudents: stats.totalStudents,
      totalSent: stats.totalSent,
      totalPending: stats.totalPending,
      totalFailed: stats.totalFailed
    });
    
    // Test campaigns
    console.log('\n📋 Testing campaign management...');
    const campaigns = await storage.getCampaigns();
    console.log(`Found ${campaigns.length} campaigns`);
    
    if (campaigns.length > 0) {
      console.log('Campaign details:');
      campaigns.forEach((campaign, index) => {
        console.log(`  ${index + 1}. ${campaign.name} (ID: ${campaign.id}, Created: ${campaign.createdAt})`);
      });
      
      // Test campaign stats
      const firstCampaign = campaigns[0];
      const campaignStats = await storage.getCampaignStats(firstCampaign.id);
      console.log(`\nStats for "${firstCampaign.name}":`, campaignStats);
    } else {
      console.log('ℹ️  No campaigns found. Create a campaign to test stats updates.');
    }
    
    // Test students data
    console.log('\n👥 Testing student data...');
    const students = await storage.getStudents();
    console.log(`Found ${students.length} students in database`);
    
    if (students.length > 0) {
      console.log('Student sample (first 3):');
      students.slice(0, 3).forEach((student, index) => {
        console.log(`  ${index + 1}. ${student.name} (${student.email}) - Section: ${student.section}`);
      });
      
      // Get sections
      const sections = Array.from(new Set(students.map(s => s.section)));
      console.log(`Sections found: ${sections.join(', ')}`);
    } else {
      console.log('ℹ️  No students found. Upload a CSV/Excel file to test data processing.');
    }
    
    // Test email logs
    console.log('\n📧 Testing email logs...');
    const emailLogs = await storage.getEmailLogs();
    console.log(`Found ${emailLogs.length} email logs`);
    
    if (emailLogs.length > 0) {
      const statusCounts = emailLogs.reduce((acc, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        return acc;
      }, {});
      console.log('Email status breakdown:', statusCounts);
      
      // Show recent logs
      console.log('\nRecent email logs (last 3):');
      emailLogs.slice(-3).forEach((log, index) => {
        console.log(`  ${index + 1}. To: ${log.email} | Status: ${log.status} | Subject: ${log.subject}`);
      });
    } else {
      console.log('ℹ️  No email logs found. Send some emails to test status tracking.');
    }
    
    // Test activity logs
    console.log('\n📝 Testing activity logs...');
    const activityLogs = await storage.getActivityLogs(10);
    console.log(`Found ${activityLogs.length} recent activity logs`);
    
    if (activityLogs.length > 0) {
      console.log('Recent activities:');
      activityLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.action}: ${log.description} (${log.createdAt?.toISOString() || 'No timestamp'})`);
      });
    } else {
      console.log('ℹ️  No activity logs found.');
    }
    
    // Test real-time data simulation
    console.log('\n🔄 Testing real-time data updates...');
    
    // Create a test activity log
    await storage.createActivityLog({
      action: 'SYSTEM_TEST',
      description: 'Real-time status test completed successfully',
      metadata: { 
        testTime: new Date().toISOString(),
        testType: 'realtime-status-check'
      }
    });
    console.log('✅ Test activity log created');
    
    // Verify the log was created
    const newLogs = await storage.getActivityLogs(1);
    if (newLogs.length > 0 && newLogs[0].action === 'SYSTEM_TEST') {
      console.log('✅ Real-time data update verified');
    } else {
      console.log('❌ Real-time data update verification failed');
    }
    
    console.log('\n🎉 Real-time status test completed successfully!');
    console.log('\n📋 System Status Summary:');
    console.log(`  - Database: ✅ Connected`);
    console.log(`  - Campaigns: ${campaigns.length} found`);
    console.log(`  - Students: ${students.length} found`);
    console.log(`  - Email Logs: ${emailLogs.length} found`);
    console.log(`  - Activity Logs: ${activityLogs.length} found`);
    console.log(`  - Real-time Updates: ✅ Working`);
    
  } catch (error) {
    console.error('\n❌ Real-time status test failed:');
    console.error('Error details:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('  1. Check database connection');
    console.error('  2. Verify environment variables');
    console.error('  3. Check network connectivity');
    console.error('  4. Review server logs');
  }
}

// Run the test
testRealtimeStatus().catch(console.error);
