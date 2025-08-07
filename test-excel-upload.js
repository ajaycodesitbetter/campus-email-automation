import { csvService } from './server/services/csvService.ts';
import fs from 'fs';
import path from 'path';

async function testExcelUpload() {
  console.log('🧪 Testing Excel Upload Process');
  console.log('=' .repeat(60));
  
  const testFiles = [
    'test-students-full.xlsx',
    'test-students-minimal.xlsx'
  ];
  
  for (const fileName of testFiles) {
    if (!fs.existsSync(fileName)) {
      console.log(`❌ File ${fileName} not found, skipping...`);
      continue;
    }
    
    console.log(`\n📊 Testing ${fileName}:`);
    console.log('-'.repeat(40));
    
    try {
      // Read the Excel file as a buffer (same as multer would do)
      const fileBuffer = fs.readFileSync(fileName);
      
      console.log('📁 File loaded:');
      console.log(`  - Size: ${fileBuffer.length} bytes`);
      console.log(`  - Type: ${typeof fileBuffer}`);
      console.log(`  - Is Buffer: ${Buffer.isBuffer(fileBuffer)}`);
      
      // Test the csvService.parseFile method
      const result = csvService.parseFile(fileBuffer, fileName, { campaignId: 1 });
      
      console.log('\n📊 Parse Result:');
      console.log(`  - Valid: ${result.valid}`);
      console.log(`  - Data count: ${result.data.length}`);
      console.log(`  - Errors: ${result.errors.length}`);
      console.log(`  - Duplicates: ${result.duplicates.length}`);
      
      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
      
      if (result.data.length > 0) {
        console.log('\n✅ Sample parsed data:');
        console.log(JSON.stringify(result.data[0], null, 2));
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${fileName}:`, error);
    }
  }
  
  console.log('\n🏁 Test Complete!');
}

// Run the test
testExcelUpload().catch(console.error);
