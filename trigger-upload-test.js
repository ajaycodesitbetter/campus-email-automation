import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

async function testExcelUpload() {
    console.log('🧪 Testing Excel upload with server running...');
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        // Test server health first
        console.log('🔍 Checking server health...');
        const healthResponse = await fetch('http://localhost:5000/api/health');
        if (!healthResponse.ok) {
            throw new Error('Server health check failed');
        }
        console.log('✅ Server is healthy');
        
        // Create form data
        console.log('📁 Preparing Excel file upload...');
        const form = new FormData();
        const fileBuffer = fs.readFileSync('test-students-full.xlsx');
        
        form.append('campaignId', '1');
        form.append('file', fileBuffer, {
            filename: 'test-students-full.xlsx',
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        console.log('🚀 Uploading Excel file...');
        const uploadResponse = await fetch('http://localhost:5000/api/upload-csv', {
            method: 'POST',
            body: form
        });
        
        const responseText = await uploadResponse.text();
        
        if (uploadResponse.ok) {
            console.log('✅ SUCCESS! Upload completed');
            console.log('Response:', JSON.parse(responseText));
        } else {
            console.log('❌ UPLOAD FAILED!');
            console.log('Status:', uploadResponse.status);
            console.log('Response:', responseText);
            
            // Try to parse as JSON to get detailed error
            try {
                const errorJson = JSON.parse(responseText);
                if (errorJson.details) {
                    console.log('\n📋 Detailed validation errors:');
                    if (errorJson.details.errors) {
                        errorJson.details.errors.forEach((error, i) => {
                            console.log(`  ${i+1}. ${error}`);
                        });
                    }
                    if (errorJson.details.duplicates) {
                        console.log('📋 Duplicate emails:');
                        errorJson.details.duplicates.forEach((email, i) => {
                            console.log(`  ${i+1}. ${email}`);
                        });
                    }
                }
            } catch (parseError) {
                console.log('Could not parse error response as JSON');
            }
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

testExcelUpload();
