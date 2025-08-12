import fs from 'fs';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';

// Test Excel parsing step by step
async function debugExcelParsing() {
    console.log('🔍 DEBUGGING EXCEL PARSING STEP BY STEP');
    console.log('=' .repeat(60));
    
    const fileName = 'test-students-full.xlsx';
    const fileBuffer = fs.readFileSync(fileName);
    
    console.log('📁 File info:');
    console.log(`  - Name: ${fileName}`);
    console.log(`  - Size: ${fileBuffer.length} bytes`);
    console.log(`  - Is Buffer: ${Buffer.isBuffer(fileBuffer)}`);
    
    try {
        // Step 1: Parse Excel with ExcelJS
        console.log('\n📊 Step 1: Parsing Excel with ExcelJS...');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fileBuffer);
        
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            throw new Error('No worksheet found');
        }
        console.log('✅ Worksheet loaded successfully');
        console.log(`  - Row count: ${worksheet.rowCount}`);
        console.log(`  - Column count: ${worksheet.columnCount}`);
        
        // Step 2: Convert to CSV manually (exact same logic as csvService)
        console.log('\n📄 Step 2: Converting to CSV...');
        const csvRows = [];
        
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            console.log(`  Processing row ${rowNumber}:`, row.values);
            if (!row.values) return;
            
            // Handle the first undefined element issue
            const values = Array.isArray(row.values) ? row.values.slice(1) : [];
            console.log(`    Processed values:`, values);
            
            const csvRow = values
                .map((cell) => {
                    if (cell === null || cell === undefined) return '';
                    // Handle different cell types
                    if (typeof cell === 'object' && cell && 'text' in cell) {
                        console.log(`      Complex cell:`, cell);
                        return `"${String(cell.text).replace(/"/g, '""')}"`;
                    }
                    return `"${String(cell).replace(/"/g, '""')}"`;
                })
                .join(',');
            
            console.log(`    CSV row: ${csvRow}`);
            csvRows.push(csvRow);
        });
        
        const csvContent = csvRows.join('\n');
        console.log('\n✅ CSV conversion complete');
        console.log('📄 Final CSV content:');
        console.log(csvContent);
        console.log(`\nCSV length: ${csvContent.length} characters`);
        
        // Step 3: Parse with Papa Parse (exact same logic)
        console.log('\n📊 Step 3: Parsing CSV with Papa Parse...');
        const parsed = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => {
                const transformed = header.trim().toLowerCase();
                console.log(`    Header transform: "${header}" -> "${transformed}"`);
                return transformed;
            },
            transform: (value) => {
                const transformed = value ? value.trim() : value;
                console.log(`    Value transform: "${value}" -> "${transformed}"`);
                return transformed;
            },
        });
        
        console.log('✅ Papa Parse complete');
        console.log(`  - Headers: ${JSON.stringify(parsed.meta.fields)}`);
        console.log(`  - Data rows: ${parsed.data.length}`);
        console.log(`  - Parse errors: ${parsed.errors.length}`);
        
        if (parsed.errors.length > 0) {
            console.log('❌ Papa Parse Errors:');
            parsed.errors.forEach(err => console.log(`    - ${err.message}`));
        }
        
        // Step 4: Validate headers
        console.log('\n🔍 Step 4: Validating headers...');
        const requiredColumns = ['name', 'email', 'section'];
        const headers = parsed.meta.fields || [];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        console.log(`  - Required: ${JSON.stringify(requiredColumns)}`);
        console.log(`  - Found: ${JSON.stringify(headers)}`);
        console.log(`  - Missing: ${JSON.stringify(missingColumns)}`);
        
        if (missingColumns.length > 0) {
            console.log('❌ VALIDATION FAILED: Missing required columns');
            console.log('💡 This is likely the source of your "CSV validation failed" error!');
            return;
        }
        
        // Step 5: Validate data rows
        console.log('\n🔍 Step 5: Validating data rows...');
        const validationErrors = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        for (let i = 0; i < parsed.data.length; i++) {
            const row = parsed.data[i];
            const rowNum = i + 2;
            
            console.log(`  Validating row ${rowNum}:`, row);
            
            if (!row.name?.trim()) {
                validationErrors.push(`Row ${rowNum}: Name is required`);
            }
            if (!row.email?.trim()) {
                validationErrors.push(`Row ${rowNum}: Email is required`);
            } else if (!emailRegex.test(row.email.trim())) {
                validationErrors.push(`Row ${rowNum}: Invalid email format`);
            }
            if (!row.section?.trim()) {
                validationErrors.push(`Row ${rowNum}: Section is required`);
            }
        }
        
        console.log(`\n📊 Final validation result:`);
        if (validationErrors.length > 0) {
            console.log('❌ VALIDATION FAILED');
            console.log('📋 Errors:');
            validationErrors.forEach((error, i) => console.log(`  ${i+1}. ${error}`));
        } else {
            console.log('✅ ALL VALIDATION PASSED!');
            console.log(`📊 ${parsed.data.length} students are ready to be processed`);
        }
        
    } catch (error) {
        console.error('💥 ERROR:', error);
        console.error('Stack:', error.stack);
    }
}

debugExcelParsing().catch(console.error);
