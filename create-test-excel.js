import XLSX from 'xlsx';
import fs from 'fs';

// Sample student data for testing
const testData = [
  {
    name: 'John Smith',
    email: 'john.smith@college.edu',
    section: 'CSE',
    subject: 'Welcome to CSE Program',
    message: 'Dear John, Welcome to the Computer Science program. We are excited to have you!'
  },
  {
    name: 'Jane Doe',
    email: 'jane.doe@college.edu', 
    section: 'ECE',
    subject: 'Electronics Workshop Invitation',
    message: 'Hi Jane! You are invited to our upcoming electronics workshop.'
  },
  {
    name: 'Mike Johnson',
    email: 'mike.johnson@college.edu',
    section: 'MBA',
    subject: 'Business Strategy Session',
    message: 'Hello Mike! Join us for an important business strategy discussion.'
  },
  {
    name: 'Sarah Wilson',
    email: 'sarah.wilson@college.edu',
    section: 'CIVIL',
    subject: 'Construction Project Update',
    message: 'Dear Sarah, Here is an update on the current construction project.'
  },
  {
    name: 'David Brown',
    email: 'david.brown@college.edu',
    section: 'CSE',
    subject: '',
    message: ''
  },
  {
    name: 'Lisa Garcia',
    email: 'lisa.garcia@college.edu',
    section: 'ECE',
    subject: 'Lab Schedule Update',
    message: 'Hi Lisa! Please check the updated lab schedule for this week.'
  },
  {
    name: 'Robert Taylor',
    email: 'robert.taylor@college.edu',
    section: 'MBA',
    subject: '',
    message: ''
  },
  {
    name: 'Emma Davis',
    email: 'emma.davis@college.edu',
    section: 'CIVIL',
    subject: 'Site Visit Announcement',
    message: 'Dear Emma, We have scheduled a site visit for next week.'
  }
];

// Create minimal test data (only required columns)
const minimalData = [
  { name: 'Alex Johnson', email: 'alex@college.edu', section: 'CSE' },
  { name: 'Maria Rodriguez', email: 'maria@college.edu', section: 'ECE' },
  { name: 'Tom Anderson', email: 'tom@college.edu', section: 'MBA' },
  { name: 'Sophie Chen', email: 'sophie@college.edu', section: 'CIVIL' }
];

function createExcelFile(data, filename) {
  console.log(`Creating ${filename} with ${data.length} records...`);
  
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths for better readability
  const columnWidths = [
    { wch: 20 }, // name
    { wch: 30 }, // email  
    { wch: 10 }, // section
    { wch: 30 }, // subject
    { wch: 50 }  // message
  ];
  worksheet['!cols'] = columnWidths;
  
  // Add the worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  
  // Write the file
  XLSX.writeFile(workbook, filename);
  console.log(`✅ ${filename} created successfully!`);
  
  // Show file stats
  const stats = fs.statSync(filename);
  console.log(`📊 File size: ${(stats.size / 1024).toFixed(1)} KB`);
}

// Create both test files
try {
  console.log('🚀 Creating test Excel files...\n');
  
  // Full featured test file
  createExcelFile(testData, 'test-students-full.xlsx');
  
  // Minimal test file (only required columns)
  createExcelFile(minimalData, 'test-students-minimal.xlsx');
  
  console.log('\n🎉 Test Excel files created successfully!');
  console.log('\nFiles created:');
  console.log('📄 test-students-full.xlsx - Complete data with all columns');
  console.log('📄 test-students-minimal.xlsx - Only required columns (name, email, section)');
  console.log('\nYou can now test uploading these files to your campus email automation tool!');
  
} catch (error) {
  console.error('❌ Error creating Excel files:', error);
}
