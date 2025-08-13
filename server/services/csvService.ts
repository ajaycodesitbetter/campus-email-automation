import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { InsertStudent } from '@shared/schema';

export interface CSVValidationResult {
  valid: boolean;
  data: InsertStudent[];
  errors: string[];
  duplicates: string[];
  // Dynamic field information for placeholder generation
  availableFields: string[];
  fieldMapping: Record<string, string>; // originalField -> placeholderName
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
      console.log('🔄 Starting Excel parsing...');
      console.log('📊 Buffer details:', { size: buffer.length, type: typeof buffer });
      
      // Verify ExcelJS import
      console.log('📦 ExcelJS availability check:', {
        ExcelJSExists: !!ExcelJS,
        WorkbookExists: !!(ExcelJS && ExcelJS.Workbook),
        WorkbookType: ExcelJS && ExcelJS.Workbook ? typeof ExcelJS.Workbook : 'undefined'
      });
      
      if (!ExcelJS || !ExcelJS.Workbook) {
        throw new Error('ExcelJS or Workbook class not available');
      }
      
      console.log('🏗️ Creating ExcelJS Workbook instance...');
      const workbook = new ExcelJS.Workbook();
      console.log('✅ Workbook created successfully:', workbook.constructor.name);
      
      console.log('📖 Loading Excel data from buffer...');
      await workbook.xlsx.load(buffer);
      console.log('✅ Excel data loaded successfully');
      
      const worksheet = workbook.getWorksheet(1); // Get first worksheet
      if (!worksheet) {
        throw new Error('No worksheet found in Excel file');
      }
      console.log('📋 Worksheet found:', { name: worksheet.name, rowCount: worksheet.rowCount });

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
      
      console.log('✅ Excel to CSV conversion completed:', { totalRows: csvRows.length });
      return csvRows.join('\n');
    } catch (error) {
      console.error('❌ Excel parsing error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Universal file parser - handles both CSV and Excel
  async parseFile(fileContent: string | Buffer, fileName: string, options: CSVParseOptions): Promise<CSVValidationResult> {
    try {
      let csvContent: string;
      
      // Check file extension to determine format
      const fileExt = fileName.toLowerCase().split('.').pop();
      
      if (fileExt === 'xlsx' || fileExt === 'xls') {
        // Handle Excel files
        if (typeof fileContent === 'string') {
          throw new Error('Excel files must be processed as binary data');
        }
        csvContent = await this.parseExcel(fileContent as Buffer);
      } else if (fileExt === 'csv') {
        // Handle CSV files
        csvContent = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf-8');
      } else {
        throw new Error('Unsupported file format. Please upload CSV or Excel files.');
      }
      
      const result = this.parseCSV(csvContent, options);
      return result;
    } catch (error) {
      return {
        valid: false,
        data: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duplicates: [],
        availableFields: [],
        fieldMapping: {}
      };
    }
  }

  /**
   * Convert field name to placeholder format
   * Examples: 'student_id' -> 'Student_id', 'account number' -> 'Account_number'
   */
  private fieldToPlaceholder(fieldName: string): string {
    return fieldName
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_') // Replace spaces and hyphens with underscores
      .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters
      .replace(/^(.)/, match => match.toUpperCase()); // Capitalize first letter
  }

  parseCSV(csvContent: string, options: CSVParseOptions): CSVValidationResult {
    const result: CSVValidationResult = {
      valid: true,
      data: [],
      errors: [],
      duplicates: [],
      availableFields: [],
      fieldMapping: {},
    };

    try {
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase().replace(/[\s-]+/g, '_'),
        transform: (value) => value ? value.trim() : value,
      });

      if (parsed.errors.length > 0) {
        result.valid = false;
        result.errors.push(...parsed.errors.map(err => err.message));
        return result;
      }

      const headers = parsed.meta.fields || [];
      console.log('📋 Detected columns:', headers);

      // Check for required columns
      const requiredColumns = ['name', 'email', 'section'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        result.valid = false;
        result.errors.push(`Missing required columns: ${missingColumns.join(', ')}. Required: name, email, section`);
        return result;
      }

      // Generate field mapping for all columns
      headers.forEach(header => {
        const placeholderName = this.fieldToPlaceholder(header);
        result.fieldMapping[header] = placeholderName;
        result.availableFields.push(placeholderName);
      });

      console.log('🏷️ Generated placeholders:', result.fieldMapping);

      const emailSet = new Set<string>();
      const data = parsed.data as any[];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // Account for header row

        // Skip rows that are completely empty
        const hasAnyData = Object.values(row).some(value => 
          value !== null && value !== undefined && String(value).trim() !== ''
        );
        
        if (!hasAnyData) {
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

        // Prepare additional fields (excluding core fields)
        const additionalFields: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          // Skip core fields that are already handled
          if (!['name', 'email', 'section', 'subject', 'message'].includes(key)) {
            const value = row[key];
            if (value !== null && value !== undefined && String(value).trim() !== '') {
              additionalFields[key] = String(value).trim();
            }
          }
        });

        // Create student record
        const studentRecord: InsertStudent = {
          name: row.name.trim(),
          email: email,
          section: row.section.trim().toUpperCase(),
          campaignId: options.campaignId,
          subject: row.subject?.trim() || '',
          message: row.message?.trim() || '',
          additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : null,
        };

        result.data.push(studentRecord);
      }

      if (result.errors.length > 0 || result.duplicates.length > 0) {
        result.valid = false;
      }

      console.log(`✅ Parsed ${result.data.length} student records with ${result.availableFields.length} available placeholders`);
      return result;
    } catch (error) {
      result.valid = false;
      result.errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }
}

export const csvService = new CSVService();
