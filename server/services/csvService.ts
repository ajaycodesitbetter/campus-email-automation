import Papa from 'papaparse';
import { InsertStudent } from '@shared/schema';

// Use require for ExcelJS to handle CommonJS module compatibility
const ExcelJS = require('exceljs');

export interface CSVValidationResult {
  valid: boolean;
  data: InsertStudent[];
  errors: string[];
  duplicates: string[];
}

export interface CSVParseOptions {
  campaignId: number;
}

export class CSVService {
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Convert Excel file buffer to CSV content using secure ExcelJS
  async parseExcel(buffer: Buffer): Promise<string> {
    try {
      // Create workbook using require-imported ExcelJS
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      
      const worksheet = workbook.getWorksheet(1); // Get first worksheet
      if (!worksheet) {
        throw new Error('No worksheet found in Excel file');
      }

      const csvRows: string[] = [];
      
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (!row.values) return;
        
        // Convert row.values to array and handle the first undefined element
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        
        const csvRow = values
          .map((cell: any) => {
            if (cell === null || cell === undefined) return '';
            // Handle different cell types
            if (typeof cell === 'object' && cell && 'text' in cell) {
              return `"${String(cell.text).replace(/"/g, '""')}"`;
            }
            return `"${String(cell).replace(/"/g, '""')}"`;
          })
          .join(',');
        csvRows.push(csvRow);
      });
      
      return csvRows.join('\n');
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Universal file parser - handles both CSV and Excel
  async parseFile(fileContent: string | Buffer, fileName: string, options: CSVParseOptions): Promise<CSVValidationResult> {
    try {
      console.log('🔍 parseFile called with:');
      console.log('  - fileName:', fileName);
      console.log('  - fileContent type:', typeof fileContent);
      console.log('  - fileContent is Buffer:', Buffer.isBuffer(fileContent));
      
      let csvContent: string;
      
      // Check file extension to determine format
      const fileExt = fileName.toLowerCase().split('.').pop();
      console.log('  - detected file extension:', fileExt);
      
      if (fileExt === 'xlsx' || fileExt === 'xls') {
        console.log('📊 Processing as Excel file...');
        // Handle Excel files
        if (typeof fileContent === 'string') {
          console.error('❌ ERROR: Excel file received as string instead of buffer!');
          throw new Error('Excel files must be processed as binary data');
        }
        console.log('✅ Excel file received as buffer, parsing...');
        csvContent = await this.parseExcel(fileContent as Buffer);
        console.log('✅ Excel parsed to CSV, length:', csvContent.length);
        console.log('📄 CSV preview:', csvContent.substring(0, 200) + '...');
      } else if (fileExt === 'csv') {
        console.log('📄 Processing as CSV file...');
        // Handle CSV files
        csvContent = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf-8');
      } else {
        console.error('❌ Unsupported file format:', fileExt);
        throw new Error('Unsupported file format. Please upload CSV or Excel files.');
      }
      
      console.log('🔄 Calling parseCSV...');
      const result = this.parseCSV(csvContent, options);
      console.log('✅ parseCSV result:', { valid: result.valid, errors: result.errors.length, data: result.data.length });
      return result;
    } catch (error) {
      console.error('❌ parseFile error:', error);
      return {
        valid: false,
        data: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duplicates: []
      };
    }
  }

  parseCSV(csvContent: string, options: CSVParseOptions): CSVValidationResult {
    const result: CSVValidationResult = {
      valid: true,
      data: [],
      errors: [],
      duplicates: [],
    };

    try {
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
        transform: (value) => value ? value.trim() : value,
      });

      if (parsed.errors.length > 0) {
        result.valid = false;
        result.errors.push(...parsed.errors.map(err => err.message));
        return result;
      }

      const requiredColumns = ['name', 'email', 'section'];
      const headers = parsed.meta.fields || [];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        result.valid = false;
        result.errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
        return result;
      }

      const emailSet = new Set<string>();
      const data = parsed.data as any[];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // Account for header row

        // Skip rows that are completely empty (all fields are empty/null/undefined)
        const hasAnyData = Object.values(row).some(value => 
          value !== null && value !== undefined && String(value).trim() !== ''
        );
        
        if (!hasAnyData) {
          console.log(`⏩ Skipping empty row ${rowNum}`);
          continue;
        }

        // Validate required fields
        if (!row.name?.trim()) {
          result.errors.push(`Row ${rowNum}: Name is required`);
          continue;
        }

        if (!row.email?.trim()) {
          result.errors.push(`Row ${rowNum}: Email is required`);
          continue;
        }

        if (!row.section?.trim()) {
          result.errors.push(`Row ${rowNum}: Section is required`);
          continue;
        }

        // Validate email format
        const email = row.email.trim().toLowerCase();
        if (!this.validateEmail(email)) {
          result.errors.push(`Row ${rowNum}: Invalid email format`);
          continue;
        }

        // Check for duplicates
        if (emailSet.has(email)) {
          result.duplicates.push(email);
          continue;
        }
        emailSet.add(email);

        // Add valid student data
        result.data.push({
          name: row.name.trim(),
          email: email,
          section: row.section.trim().toUpperCase(),
          campaignId: options.campaignId,
          subject: row.subject?.trim() || '',
          message: row.message?.trim() || '',
        });
      }

      if (result.errors.length > 0 || result.duplicates.length > 0) {
        result.valid = false;
      }

      return result;
    } catch (error) {
      result.valid = false;
      result.errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }
}

export const csvService = new CSVService();
