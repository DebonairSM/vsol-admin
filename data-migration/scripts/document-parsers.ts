import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { FileStorageService } from '../../apps/api/src/lib/file-storage';

/**
 * Parse a DOCX file and return its text content
 */
export async function parseDocx(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to parse DOCX file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse dates in various formats (DD/MM/YYYY, MM/DD/YYYY, ISO, etc.)
 */
export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Try ISO format first
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try DD/MM/YYYY format (Brazilian)
  const brazilianMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilianMatch) {
    const [, day, month, year] = brazilianMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try MM/DD/YYYY format (US)
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

/**
 * Extract CPF from text (handles various formats)
 */
export function extractCPF(text: string): string | null {
  // Remove all non-digits
  const clean = text.replace(/\D/g, '');
  
  // CPF should be 11 digits
  if (clean.length === 11) {
    return clean;
  }

  // Try to find CPF pattern in text (XXX.XXX.XXX-XX)
  const cpfMatch = text.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
  if (cpfMatch) {
    return cpfMatch[0].replace(/\D/g, '');
  }

  return null;
}

/**
 * Extract CNPJ from text (handles various formats)
 */
export function extractCNPJ(text: string): string | null {
  // Remove all non-digits
  const clean = text.replace(/\D/g, '');
  
  // CNPJ should be 14 digits
  if (clean.length === 14) {
    return clean;
  }

  // Try to find CNPJ pattern in text (XX.XXX.XXX/XXXX-XX)
  const cnpjMatch = text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
  if (cnpjMatch) {
    return cnpjMatch[0].replace(/\D/g, '');
  }

  return null;
}

/**
 * Extract email from text
 */
export function extractEmail(text: string): string | null {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return emailMatch ? emailMatch[0] : null;
}

/**
 * Extract phone number from text (Brazilian format)
 */
export function extractPhone(text: string): string | null {
  // Remove all non-digits
  const clean = text.replace(/\D/g, '');
  
  // Brazilian phone: 11 digits (with area code) or 13 digits (with country code)
  if (clean.length === 11) {
    return clean;
  }
  
  if (clean.length === 13 && clean.startsWith('55')) {
    return clean;
  }

  // Try to find phone pattern
  const phoneMatch = text.match(/(\+?55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
  if (phoneMatch) {
    return phoneMatch[0].replace(/\D/g, '');
  }

  return null;
}

/**
 * Extract CEP (Brazilian postal code) from text
 */
export function extractCEP(text: string): string | null {
  // Remove all non-digits
  const clean = text.replace(/\D/g, '');
  
  // CEP should be 8 digits
  if (clean.length === 8) {
    return clean;
  }

  // Try to find CEP pattern (XXXXX-XXX)
  const cepMatch = text.match(/\d{5}-?\d{3}/);
  if (cepMatch) {
    return cepMatch[0].replace(/\D/g, '');
  }

  return null;
}

/**
 * Extract value after a label in text
 */
export function extractFieldValue(text: string, label: string, caseSensitive = false): string | null {
  if (!text || !label) return null;
  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:]?\\s*([^\\n\\r]+)`, flags);
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Extract multiple values from a table-like structure
 */
export function extractTableRows(text: string, headers: string[]): Array<Record<string, string>> {
  const lines = text.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
  const rows: Array<Record<string, string>> = [];
  
  // Find header row
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (headers.some(header => line.includes(header.toLowerCase()))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return rows;
  }

  // Extract data rows (skip header row)
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim().length === 0) continue;
    
    // Split by tabs or multiple spaces
    const cells = line.split(/\t|\s{2,}/).map(cell => cell.trim()).filter(cell => cell.length > 0);
    
    if (cells.length > 0) {
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        if (cells[idx]) {
          row[header] = cells[idx];
        }
      });
      if (Object.keys(row).length > 0) {
        rows.push(row);
      }
    }
  }

  return rows;
}

/**
 * Normalize Brazilian phone number to standard format
 */
export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  
  const clean = phone.replace(/\D/g, '');
  
  // If it's 11 digits, assume it's a Brazilian number without country code
  if (clean.length === 11) {
    return `+55 ${clean.slice(0, 2)} ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  
  // If it's 13 digits and starts with 55, format it
  if (clean.length === 13 && clean.startsWith('55')) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  
  return phone;
}

/**
 * Format CEP to standard format (XXXXX-XXX)
 */
export function formatCEP(cep: string | null): string | null {
  if (!cep) return null;
  
  const clean = cep.replace(/\D/g, '');
  if (clean.length === 8) {
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  
  return cep;
}

