import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import DirectoryNational from '../models/DirectoryNational.js';
import DirectoryLocal from '../models/DirectoryLocal.js';
import DirectoryHotspots from '../models/DirectoryHotspots.js';
import { connectDB } from '../lib/db.js';

// Helper function to clean and parse CSV data
const cleanCsvData = (data) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    // Clean key names - remove quotes, trim, and handle special characters
    const cleanKey = key.replace(/"/g, '').trim();
    // Clean values - handle empty strings and special cases
    cleaned[cleanKey] = value === '--' || value === 'ND' ? '' : (value || '').toString().trim();
  }
  return cleaned;
};

// Function to parse area value (extract number from string)
const parseArea = (areaStr) => {
  if (!areaStr || areaStr === '--' || areaStr === 'ND') return 0;
  const match = areaStr.toString().match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
};

// Function to parse number of renewals
const parseNumber = (numStr) => {
  if (!numStr || numStr === '--' || numStr === 'ND') return 0;
  const num = parseInt(numStr);
  return isNaN(num) ? 0 : num;
};

// Seed Directory National data
export const seedDirectoryNational = async () => {
  try {
    console.log('🌱 Seeding Directory National data...');
    
    // Clear existing data
    await DirectoryNational.deleteMany({});
    
    const csvFilePath = path.join(process.cwd(), 'csv_files', 'Directory National ALL.xlsx - ALL.csv');
    const results = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => {
          const cleanData = cleanCsvData(data);
          
          // Map CSV columns to schema fields
          const record = {
            classification: cleanData['CLASSIFICATION'] || '',
            type: cleanData['TYPE'] || '',
            contractNumber: cleanData['CONTRACT/ PERMIT/ PATENT/ APPLICATION NUMBER'] || '',
            contractor: cleanData['CONTRACTOR/ PERMIT HOLDER/ PERMITTEE/ APPLICANT'] || '',
            proponent: cleanData['PROPONENT'] || '',
            contactNumber: cleanData['CONTACT NUMBER'] || '',
            operator: cleanData['OPERATOR'] || '',
            area: parseArea(cleanData['AREA (HAS.)']),
            dateFiled: cleanData['DATE FILED'] || '',
            approvalDate: cleanData['APPROVAL DATE'] || '',
            renewalDate: cleanData['RENEWAL DATE'] || '',
            expirationDate: cleanData['EXPIRATION DATE'] || '',
            barangay: cleanData['BARANGAY'] || '',
            municipality: cleanData['MUNICIPALITY/CITY'] || '',
            province: cleanData['PROVINCE'] || '',
            googleMapLink: cleanData['GOOGLE MAP LINK\n(LOCATION POINT)'] || cleanData['GOOGLE MAP LINK (LOCATION POINT)'] || '',
            commodity: cleanData['COMMODITY'] || '',
            status: cleanData['STATUS'] || '',
            sourceOfRawMaterials: cleanData['SOURCE OF RAW MATERIALS (FOR MPP ONLY)'] || 'N/A'
          };
          
          // Only require contractor (permit holder), generate contract number if missing
          if (record.contractor && record.contractor.trim() !== '') {
            
            // Generate unique contract number if missing, empty, or duplicate
            if (!record.contractNumber || record.contractNumber.trim() === '' || record.contractNumber === '--') {
              record.contractNumber = `GENERATED-NATIONAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            } else {
              // Add timestamp to handle duplicates
              record.contractNumber = `${record.contractNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
            }
            
            // Provide defaults for all fields
            if (!record.classification || record.classification === '') {
              record.classification = 'Unknown';
            }
            if (!record.type || record.type === '') {
              record.type = 'Unknown';
            }
            if (!record.commodity || record.commodity === '') {
              record.commodity = 'Unknown';
            }
            if (!record.status || record.status === '') {
              record.status = 'Unknown';
            }
            if (!record.barangay || record.barangay === '') {
              record.barangay = 'Unknown';
            }
            if (!record.municipality || record.municipality === '') {
              record.municipality = 'Unknown';
            }
            if (!record.province || record.province === '') {
              record.province = 'Unknown';
            }
            results.push(record);
          }
        })
        .on('end', async () => {
          try {
            if (results.length > 0) {
              await DirectoryNational.insertMany(results);
              console.log(`✅ Successfully seeded ${results.length} Directory National records`);
            }
            resolve(results.length);
          } catch (error) {
            console.error('❌ Error inserting Directory National data:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ Error reading Directory National CSV:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('❌ Error seeding Directory National:', error);
    throw error;
  }
};

// Seed Directory Local data
export const seedDirectoryLocal = async () => {
  try {
    console.log('🌱 Seeding Directory Local data...');
    
    // Clear existing data
    await DirectoryLocal.deleteMany({});
    
    const csvFilePath = path.join(process.cwd(), 'csv_files', 'Directory Local ALL.xlsx - ALL.csv');
    const results = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => {
          const cleanData = cleanCsvData(data);
          
          // Map CSV columns to schema fields
          const record = {
            classification: cleanData['CLASSIFICATION'] || '',
            type: cleanData['TYPE'] || '',
            permitNumber: cleanData['PERMIT/ APPLICATION/ CONTRACT NO.'] || '',
            permitHolder: cleanData['PERMIT HOLDER/ APPLICANT/ CONTRACTOR/ PETITIONER'] || '',
            commodities: cleanData['COMMODITY(IES)'] || '',
            area: cleanData['AREA \n(in hectares)'] || cleanData['AREA (in hectares)'] || '',
            barangays: cleanData['BARANGAY(S)'] || '',
            municipality: cleanData['MUNICIPALITY/CITY'] || '',
            province: cleanData['PROVINCE'] || '',
            googleMapLink: cleanData['GOOGLE MAP LINK\n(LOCATION POINT)'] || cleanData['GOOGLE MAP LINK (LOCATION POINT)'] || '',
            dateFiled: cleanData['DATE FILED'] || '',
            dateApproved: cleanData['DATE APPROVED'] || '',
            dateOfExpiry: cleanData['DATE OF EXPIRY'] || '',
            numberOfRenewal: parseNumber(cleanData['NO. OF RENEWAL']),
            dateOfFirstIssuance: cleanData['DATE OF FIRST ISSUANCE'] || '',
            status: cleanData['STATUS'] || ''
          };
          
          // Only require permit holder, generate permit number if missing
          if (record.permitHolder && record.permitHolder.trim() !== '') {
            
            // Generate unique permit number if missing, empty, or duplicate
            if (!record.permitNumber || record.permitNumber.trim() === '' || record.permitNumber === '--' || record.permitNumber === 'N/A') {
              record.permitNumber = `GENERATED-LOCAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            } else {
              // Add timestamp to handle duplicates
              record.permitNumber = `${record.permitNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
            }
            
            // Provide defaults for required fields
            if (!record.classification || record.classification === '') {
              record.classification = 'Unknown';
            }
            if (!record.type || record.type === '') {
              record.type = 'Unknown';
            }
            if (!record.status || record.status === '') {
              record.status = 'Unknown';
            }
            if (!record.commodities || record.commodities === '') {
              record.commodities = 'Unknown';
            }
            if (!record.barangays || record.barangays === '') {
              record.barangays = 'Unknown';
            }
            if (!record.municipality || record.municipality === '') {
              record.municipality = 'Unknown';
            }
            if (!record.province || record.province === '') {
              record.province = 'Unknown';
            }
            
            results.push(record);
          }
        })
        .on('end', async () => {
          try {
            if (results.length > 0) {
              await DirectoryLocal.insertMany(results);
              console.log(`✅ Successfully seeded ${results.length} Directory Local records`);
            }
            resolve(results.length);
          } catch (error) {
            console.error('❌ Error inserting Directory Local data:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ Error reading Directory Local CSV:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('❌ Error seeding Directory Local:', error);
    throw error;
  }
};

// Seed Directory Hotspots data
export const seedDirectoryHotspots = async () => {
  try {
    console.log('🌱 Seeding Directory Hotspots data...');
    
    // Clear existing data
    await DirectoryHotspots.deleteMany({});
    
    const csvFilePath = path.join(process.cwd(), 'csv_files', 'Directory Hotspots.xlsx - All.csv');
    const results = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv({
          skipEmptyLines: true,
          skipLinesWithError: true
        }))
        .on('data', (data) => {
          try {
            const cleanData = cleanCsvData(data);
            
            // Debug: Log the first few records to understand structure
            if (results.length < 3) {
              console.log('Raw data keys:', Object.keys(data));
              console.log('Clean data sample:', cleanData);
            }
            
            // Map CSV columns to schema fields with more flexible key matching
            const record = {
              subject: cleanData['Subject'] || cleanData['Subject '] || '',
              complaintNumber: cleanData['Complaint Number'] || '',
              province: cleanData['Province'] || '',
              municipality: cleanData['Municipality / City'] || cleanData['Municipality /\nCity'] || cleanData['Municipality /City'] || '',
              barangay: cleanData['Barangay'] || '',
              sitio: cleanData['Sitio'] || '',
              longitude: cleanData['Longitude'] || '',
              latitude: cleanData['Latitude'] || '',
              googleMapLink: cleanData['Google Map Link (Location Point)'] || cleanData['Google Map Link\n(Location Point)'] || '',
              natureOfReportedIllegalAct: cleanData['Nature of Reported Illegal Act'] || '',
              typeOfCommodity: cleanData['Type of Commodity (Non-metallics)'] || '',
              actionsTaken: cleanData['Actions Taken'] || '',
              details: cleanData['Details'] || cleanData['Details '] || '',
              dateOfActionTaken: cleanData['Date of Action Taken (mm/dd/yyyy)'] || cleanData['Date of\nAction Taken (mm/dd/yyyy)'] || '',
              lawsViolated: cleanData['Laws Violated'] || '',
              numberOfCDOIssued: parseNumber(cleanData['No. of CDO Issued']),
              dateIssued: cleanData['Date Issued (mm/dd/yyyy)'] || '',
              remarks: cleanData['Remarks'] || ''
            };
            
            // More lenient validation - only require complaint number and subject
            if (record.complaintNumber && record.complaintNumber.trim() !== '' && 
                record.subject && record.subject.trim() !== '') {
              
              // Provide defaults for required fields
              if (!record.province || record.province === '') {
                record.province = 'Unknown';
              }
              if (!record.municipality || record.municipality === '') {
                record.municipality = 'Unknown';
              }
              if (!record.barangay || record.barangay === '') {
                record.barangay = 'Unknown';
              }
              if (!record.natureOfReportedIllegalAct || record.natureOfReportedIllegalAct === '') {
                record.natureOfReportedIllegalAct = 'Unknown';
              }
              if (!record.typeOfCommodity || record.typeOfCommodity === '') {
                record.typeOfCommodity = 'Unknown';
              }
              if (!record.actionsTaken || record.actionsTaken === '') {
                record.actionsTaken = 'Unknown';
              }
              
              results.push(record);
            }
          } catch (recordError) {
            console.warn('⚠️ Error processing record:', recordError.message);
            // Continue processing other records
          }
        })
        .on('end', async () => {
          try {
            console.log(`📊 Processed ${results.length} valid Directory Hotspots records`);
            
            if (results.length > 0) {
              await DirectoryHotspots.insertMany(results);
              console.log(`✅ Successfully seeded ${results.length} Directory Hotspots records`);
            } else {
              console.log('⚠️ No valid records found to seed');
            }
            resolve(results.length);
          } catch (error) {
            console.error('❌ Error inserting Directory Hotspots data:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ Error reading Directory Hotspots CSV:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('❌ Error seeding Directory Hotspots:', error);
    throw error;
  }
};

// Main seeding function
export const seedAllDirectories = async () => {
  try {
    console.log('🚀 Starting CSV data seeding process...');
    
    // Connect to database
    await connectDB();
    
    // Seed all directories
    const nationalCount = await seedDirectoryNational();
    const localCount = await seedDirectoryLocal();
    const hotspotsCount = await seedDirectoryHotspots();
    
    console.log('🎉 Seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Directory National: ${nationalCount} records`);
    console.log(`   - Directory Local: ${localCount} records`);
    console.log(`   - Directory Hotspots: ${hotspotsCount} records`);
    
    return {
      national: nationalCount,
      local: localCount,
      hotspots: hotspotsCount
    };
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAllDirectories()
    .then(() => {
      console.log('✅ Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding process failed:', error);
      process.exit(1);
    });
}
