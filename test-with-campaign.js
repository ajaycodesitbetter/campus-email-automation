import fs from 'fs';
import { storage } from './server/storage.js';
import { csvService } from './server/services/csvService.js';

async function testWithCampaign() {
    console.log('🔍 TESTING EXCEL UPLOAD WITH PROPER CAMPAIGN SETUP');
    console.log('=' .repeat(60));
    
    try {
        // Step 1: Check/Create campaign
        console.log('\n📊 Step 1: Setting up campaign...');
        let campaigns = await storage.getCampaigns();
        let campaign;
        
        if (campaigns.length === 0) {
            console.log('🆕 No campaigns found, creating one...');
            campaign = await storage.createCampaign({
                name: 'Test Campaign for Excel Upload',
                description: 'Campaign created for testing Excel uploads',
                emoji: '🧪'
            });
            console.log('✅ Campaign created:', campaign);
        } else {
            campaign = campaigns[0];
            console.log('✅ Using existing campaign:', campaign);
        }
        
        // Step 2: Test Excel file processing
        console.log('\n📊 Step 2: Processing Excel file...');
        const fileName = 'test-students-full.xlsx';
        const fileBuffer = fs.readFileSync(fileName);
        
        console.log(`📁 File: ${fileName} (${fileBuffer.length} bytes)`);
        
        // This simulates exactly what happens in the server route
        console.log('\n🔄 Calling csvService.parseFile (same as server)...');
        const validation = await csvService.parseFile(fileBuffer, fileName, { 
            campaignId: campaign.id 
        });
        
        console.log('📋 Validation result:');
        console.log(`  - Valid: ${validation.valid}`);
        console.log(`  - Data count: ${validation.data.length}`);
        console.log(`  - Errors: ${validation.errors.length}`);
        console.log(`  - Duplicates: ${validation.duplicates.length}`);
        
        if (!validation.valid) {
            console.log('\n❌ VALIDATION FAILED!');
            console.log('📋 Errors:');
            validation.errors.forEach((error, i) => console.log(`  ${i+1}. ${error}`));
            
            if (validation.duplicates.length > 0) {
                console.log('\n📋 Duplicate emails:');
                validation.duplicates.forEach((email, i) => console.log(`  ${i+1}. ${email}`));
            }
            
            console.log('\n💡 THIS IS THE EXACT ERROR YOUR WEB INTERFACE WOULD SHOW!');
            return;
        }
        
        // Step 3: Test database operations
        console.log('\n💾 Step 3: Testing database operations...');
        console.log('🗑️ Clearing existing students for this campaign...');
        await storage.deleteAllStudents(campaign.id);
        
        console.log('💾 Inserting new student data...');
        const students = await storage.createStudents(validation.data);
        
        console.log('✅ Database operations successful!');
        console.log(`📊 ${students.length} students inserted`);
        
        // Step 4: Verify data
        console.log('\n🔍 Step 4: Verifying inserted data...');
        const retrievedStudents = await storage.getStudents(campaign.id);
        console.log(`📋 ${retrievedStudents.length} students retrieved from database`);
        
        if (retrievedStudents.length > 0) {
            console.log('\n📄 Sample student data:');
            const sample = retrievedStudents[0];
            console.log(`  Name: ${sample.name}`);
            console.log(`  Email: ${sample.email}`);
            console.log(`  Section: ${sample.section}`);
            console.log(`  Campaign: ${sample.campaignId}`);
        }
        
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('Your Excel file is perfect and should work in the web interface.');
        console.log('\n💡 SOLUTION:');
        console.log(`Make sure you use Campaign ID ${campaign.id} when uploading via web interface.`);
        
    } catch (error) {
        console.error('\n💥 ERROR FOUND:', error.message);
        console.error('\n🔍 This might be the cause of your "CSV validation failed" error!');
        console.error('\nDetailed error:', error);
        
        // Check for specific error patterns
        if (error.message.includes('campaign')) {
            console.error('\n📌 CAMPAIGN-RELATED ERROR: Create a campaign first in your web interface!');
        } else if (error.message.includes('connect')) {
            console.error('\n📌 DATABASE CONNECTION ERROR: Check your DATABASE_URL');
        } else if (error.message.includes('constraint') || error.message.includes('foreign key')) {
            console.error('\n📌 DATABASE CONSTRAINT ERROR: Campaign ID doesn\'t exist or invalid');
        }
    }
}

testWithCampaign().catch(console.error);
