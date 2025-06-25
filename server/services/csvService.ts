import Papa from 'papaparse';
import { InsertStudent } from '@shared/schema';

export interface CSVValidationResult {
  valid: boolean;
  data: Omit<InsertStudent, 'campaignId'>[];
  errors: string[];
  duplicates: string[];
}

export class CSVService {
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  parseCSV(csvContent: string): CSVValidationResult {
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
          email: row.email.trim(),
          section: row.section.trim(),
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
