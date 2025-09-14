import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import DirectoryHotspots from '../models/DirectoryHotspots.js';
import { connectDB } from '../lib/db.js';

// Custom CSV parser for hotspots data with multiline support
const parseHotspotsCSV = (csvContent) => {
  const lines = csvContent.split('\n');
  const headers = [];
  const records = [];
  
  // Parse headers from first few lines (they span multiple lines)
  let headerLine = '';
  let i = 0;
  
  // Combine header lines until we have all columns
  while (i < 10 && lines[i]) {
    headerLine += lines[i].replace(/"/g, '').trim() + ' ';
    i++;
    if (headerLine.includes('Remarks')) break;
  }
  
  // Extract headers
  const headerParts = headerLine.split(',').map(h => h.trim()).filter(h => h);
  const cleanHeaders = [
    'Subject',
    'Complaint Number', 
    'Province',
    'Municipality / City',
    'Barangay',
    'Sitio',
    'Longitude',
    'Latitude',
    'Google Map Link (Location Point)',
    'Nature of Reported Illegal Act',
    'Type of Commodity (Non-metallics)',
    'Actions Taken',
    'Details',
    'Date of Action Taken (mm/dd/yyyy)',
    'Laws Violated',
    'No. of CDO Issued',
    'Date Issued (mm/dd/yyyy)',
    'Remarks'
  ];
  
  console.log('📋 Using headers:', cleanHeaders);
  
  // Parse data records starting after headers
  let currentRecord = [];
  let inQuotes = false;
  let fieldCount = 0;
  
  for (let lineIndex = 4; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (!line.trim()) continue;
    
    // Simple approach: split by comma but handle quoted fields
    const fields = [];
    let currentField = '';
    let insideQuotes = false;
    
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add the last field
    if (currentField) {
      fields.push(currentField.trim());
    }
    
    // If we have enough fields for a complete record
    if (fields.length >= 10 && fields[1] && fields[1].includes('MMD-IMC')) {
      const record = {};
      
      // Map fields to headers
      cleanHeaders.forEach((header, index) => {
        record[header] = fields[index] || '';
      });
      
      // Clean up the record
      if (record['Subject'] && record['Complaint Number']) {
        records.push(record);
      }
    }
  }
  
  console.log(`📊 Parsed ${records.length} records from CSV`);
  return records;
};

// Seed Directory Hotspots with custom parser
export const seedDirectoryHotspotsCustom = async () => {
  try {
    console.log('🌱 Seeding Directory Hotspots data with custom parser...');
    
    // Clear existing data
    await DirectoryHotspots.deleteMany({});
    
    const csvFilePath = path.join(process.cwd(), 'csv_files', 'Directory Hotspots.xlsx - All.csv');
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    const records = parseHotspotsCSV(csvContent);
    const validRecords = [];
    
    for (const record of records) {
      try {
        const cleanRecord = {
          subject: record['Subject'] || '',
          complaintNumber: record['Complaint Number'] || '',
          province: record['Province'] || 'Unknown',
          municipality: record['Municipality / City'] || 'Unknown',
          barangay: record['Barangay'] || 'Unknown',
          sitio: record['Sitio'] || '',
          longitude: record['Longitude'] || '',
          latitude: record['Latitude'] || '',
          googleMapLink: record['Google Map Link (Location Point)'] || '',
          natureOfReportedIllegalAct: record['Nature of Reported Illegal Act'] || 'Unknown',
          typeOfCommodity: record['Type of Commodity (Non-metallics)'] || 'Unknown',
          actionsTaken: record['Actions Taken'] || 'Unknown',
          details: record['Details'] || '',
          dateOfActionTaken: record['Date of Action Taken (mm/dd/yyyy)'] || '',
          lawsViolated: record['Laws Violated'] || '',
          numberOfCDOIssued: parseInt(record['No. of CDO Issued']) || 0,
          dateIssued: record['Date Issued (mm/dd/yyyy)'] || '',
          remarks: record['Remarks'] || ''
        };
        
        // Validate required fields
        if (cleanRecord.complaintNumber && cleanRecord.subject) {
          validRecords.push(cleanRecord);
        }
      } catch (error) {
        console.warn('⚠️ Error processing record:', error.message);
      }
    }
    
    console.log(`📊 Processed ${validRecords.length} valid hotspots records`);
    
    if (validRecords.length > 0) {
      await DirectoryHotspots.insertMany(validRecords);
      console.log(`✅ Successfully seeded ${validRecords.length} Directory Hotspots records`);
    }
    
    return validRecords.length;
  } catch (error) {
    console.error('❌ Error seeding Directory Hotspots:', error);
    throw error;
  }
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  connectDB()
    .then(() => seedDirectoryHotspotsCustom())
    .then((count) => {
      console.log(`✅ Seeded ${count} hotspots records`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
