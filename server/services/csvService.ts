import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { InsertStudent } from '@shared/schema';

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

  // Convert Excel file buffer to CSV content
  parseExcel(buffer: Buffer): string {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_csv(worksheet);
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Universal file parser - handles both CSV and Excel
  parseFile(fileContent: string | Buffer, fileName: string, options: CSVParseOptions): CSVValidationResult {
    try {
      let csvContent: string;
      
      // Check file extension to determine format
      const fileExt = fileName.toLowerCase().split('.').pop();
      
      if (fileExt === 'xlsx' || fileExt === 'xls') {
        // Handle Excel files
        if (typeof fileContent === 'string') {
          throw new Error('Excel files must be processed as binary data');
        }
        csvContent = this.parseExcel(fileContent as Buffer);
      } else if (fileExt === 'csv') {
        // Handle CSV files
        csvContent = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf-8');
      } else {
        throw new Error('Unsupported file format. Please upload CSV or Excel files.');
      }
      
      return this.parseCSV(csvContent, options);
    } catch (error) {
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
