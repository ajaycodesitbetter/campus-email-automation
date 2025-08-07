import XLSX from 'xlsx';
import fs from 'fs';

function verifyExcelFile(filename) {
  if (!fs.existsSync(filename)) {
    console.log(`❌ File ${filename} not found`);
    return;
  }
  
  console.log(`\n📊 Analyzing ${filename}:`);
  console.log('=' .repeat(60));
  
  // Read the Excel file
  const workbook = XLSX.readFile(filename);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📋 Sheet Name: ${sheetName}`);
  console.log(`📊 Records: ${data.length}`);
  console.log(`📁 File Size: ${(fs.statSync(filename).size / 1024).toFixed(1)} KB`);
  
  if (data.length > 0) {
    console.log(`🔑 Columns: ${Object.keys(data[0]).join(', ')}`);
    console.log('\n📄 Sample Data:');
    console.log('─'.repeat(60));
    
    // Show first few records
    data.slice(0, 3).forEach((row, index) => {
      console.log(`${index + 1}. Name: ${row.name}`);
      console.log(`   Email: ${row.email}`);
      console.log(`   Section: ${row.section}`);
      if (row.subject) console.log(`   Subject: ${row.subject}`);
      if (row.message) console.log(`   Message: ${row.message.substring(0, 50)}${row.message.length > 50 ? '...' : ''}`);
      console.log('');
    });
    
    if (data.length > 3) {
      console.log(`   ... and ${data.length - 3} more records`);
    }
  }
}

console.log('🔍 Excel File Verification Report');
console.log('═'.repeat(60));

verifyExcelFile('test-students-full.xlsx');
verifyExcelFile('test-students-minimal.xlsx');

console.log('\n✅ Verification Complete!');
console.log('\n🎯 Test Instructions:');
console.log('1. Start your campus email automation tool');
console.log('2. Select or create a campaign');
console.log('3. Go to the File Upload section');
console.log('4. Drag and drop one of these Excel files:');
console.log('   • test-students-full.xlsx (8 records with all columns)');
console.log('   • test-students-minimal.xlsx (4 records with required columns only)');
console.log('5. Click "Process File" to upload');
console.log('6. Verify the data appears in the Student Table');
console.log('\n🚀 Both files should upload successfully and show the student data!');
