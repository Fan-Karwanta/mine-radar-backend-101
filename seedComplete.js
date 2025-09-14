import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { connectDB } from './src/lib/db.js';
import DirectoryNational from './src/models/DirectoryNational.js';
import DirectoryLocal from './src/models/DirectoryLocal.js';

// Load environment variables
dotenv.config();

// Helper function to clean and parse CSV data
const cleanCsvData = (data) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    const cleanKey = key.replace(/"/g, '').trim();
    cleaned[cleanKey] = value === '--' || value === 'ND' || value === 'N/A' ? '' : (value || '').toString().trim();
  }
  return cleaned;
};

const parseNumber = (numStr) => {
  if (!numStr || numStr === '--' || numStr === 'ND' || numStr === 'N/A') return 0;
  const num = parseInt(numStr);
  return isNaN(num) ? 0 : num;
};

const parseArea = (areaStr) => {
  if (!areaStr || areaStr === '--' || areaStr === 'ND' || areaStr === 'N/A') return 0;
  const match = areaStr.toString().match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
};

// Seed Directory National data
async function seedDirectoryNational() {
  try {
    console.log('🌱 Seeding Directory National data...');
    
    // Clear existing data
    await DirectoryNational.deleteMany({});
    
    const csvFilePath = path.join(process.cwd(), 'csv_files', 'Directory National ALL.xlsx - ALL.csv');
    const results = [];
    const errors = [];
    
    return new Promise((resolve, reject) => {
      let lineNumber = 0;
      
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => {
          lineNumber++;
          try {
            const cleanData = cleanCsvData(data);
            
            const record = {
              classification: cleanData['CLASSIFICATION'] || 'Unknown',
              type: cleanData['TYPE'] || 'Unknown',
              contractNumber: cleanData['CONTRACT/ PERMIT/ PATENT/ APPLICATION NUMBER'] || `UNKNOWN-${lineNumber}`,
              contractor: cleanData['CONTRACTOR/ PERMIT HOLDER/ PERMITTEE/ APPLICANT'] || 'Unknown',
              proponent: cleanData['PROPONENT'] || '',
              contactNumber: cleanData['CONTACT NUMBER'] || '',
              operator: cleanData['OPERATOR'] || '',
              area: parseArea(cleanData['AREA (HAS.)']),
              dateFiled: cleanData['DATE FILED'] || '',
              approvalDate: cleanData['APPROVAL DATE'] || '',
              renewalDate: cleanData['RENEWAL DATE'] || '',
              expirationDate: cleanData['EXPIRATION DATE'] || '',
              barangay: cleanData['BARANGAY'] || 'Unknown',
              municipality: cleanData['MUNICIPALITY/CITY'] || 'Unknown',
              province: cleanData['PROVINCE'] || 'Unknown',
              googleMapLink: cleanData['GOOGLE MAP LINK\n(LOCATION POINT)'] || cleanData['GOOGLE MAP LINK (LOCATION POINT)'] || '',
              commodity: cleanData['COMMODITY'] || 'Unknown',
              status: cleanData['STATUS'] || 'Unknown',
              sourceOfRawMaterials: cleanData['SOURCE OF RAW MATERIALS (FOR MPP ONLY)'] || ''
            };
            
            // Validate required fields
            if (record.contractNumber && record.contractor && record.barangay && record.municipality && record.province) {
              results.push(record);
            } else {
              errors.push({
                line: lineNumber,
                reason: 'Missing required fields',
                contractNumber: record.contractNumber,
                contractor: record.contractor
              });
            }
          } catch (error) {
            errors.push({
              line: lineNumber,
              reason: error.message
            });
          }
        })
        .on('end', async () => {
          try {
            console.log(`📊 Processed ${lineNumber} lines from National CSV`);
            console.log(`Valid records: ${results.length}`);
            console.log(`Errors: ${errors.length}`);
            
            if (results.length > 0) {
              const insertResult = await DirectoryNational.insertMany(results, { ordered: false });
              console.log(`✅ Successfully inserted ${insertResult.length} National records`);
            }
            
            resolve(results.length);
          } catch (error) {
            console.error('❌ Error inserting National data:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ Error reading National CSV:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('❌ Error seeding Directory National:', error);
    throw error;
  }
}

// Seed Directory Local data
async function seedDirectoryLocal() {
  try {
    console.log('🌱 Seeding Directory Local data...');
    
    // Clear existing data
    await DirectoryLocal.deleteMany({});
    
    const csvFilePath = path.join(process.cwd(), 'csv_files', 'Directory Local ALL.xlsx - ALL.csv');
    const results = [];
    const errors = [];
    
    return new Promise((resolve, reject) => {
      let lineNumber = 0;
      
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => {
          lineNumber++;
          try {
            const cleanData = cleanCsvData(data);
            
            const record = {
              classification: cleanData['CLASSIFICATION'] || 'Unknown',
              type: cleanData['TYPE'] || 'Unknown',
              permitNumber: cleanData['PERMIT/ APPLICATION/ CONTRACT NO.'] || `UNKNOWN-${lineNumber}`,
              permitHolder: cleanData['PERMIT HOLDER/ APPLICANT/ CONTRACTOR/ PETITIONER'] || 'Unknown',
              commodities: cleanData['COMMODITY(IES)'] || 'Unknown',
              area: cleanData['AREA \n(in hectares)'] || cleanData['AREA (in hectares)'] || '',
              barangays: cleanData['BARANGAY(S)'] || 'Unknown',
              municipality: cleanData['MUNICIPALITY/CITY'] || 'Unknown',
              province: cleanData['PROVINCE'] || 'Unknown',
              googleMapLink: cleanData['GOOGLE MAP LINK\n(LOCATION POINT)'] || cleanData['GOOGLE MAP LINK (LOCATION POINT)'] || '',
              dateFiled: cleanData['DATE FILED'] || '',
              dateApproved: cleanData['DATE APPROVED'] || '',
              dateOfExpiry: cleanData['DATE OF EXPIRY'] || '',
              numberOfRenewal: parseNumber(cleanData['NO. OF RENEWAL']),
              dateOfFirstIssuance: cleanData['DATE OF FIRST ISSUANCE'] || '',
              status: cleanData['STATUS'] || 'Unknown'
            };
            
            // Validate required fields
            if (record.permitNumber && record.permitHolder) {
              results.push(record);
            } else {
              errors.push({
                line: lineNumber,
                reason: 'Missing required fields',
                permitNumber: record.permitNumber,
                permitHolder: record.permitHolder
              });
            }
          } catch (error) {
            errors.push({
              line: lineNumber,
              reason: error.message
            });
          }
        })
        .on('end', async () => {
          try {
            console.log(`📊 Processed ${lineNumber} lines from Local CSV`);
            console.log(`Valid records: ${results.length}`);
            console.log(`Errors: ${errors.length}`);
            
            if (results.length > 0) {
              const insertResult = await DirectoryLocal.insertMany(results, { ordered: false });
              console.log(`✅ Successfully inserted ${insertResult.length} Local records`);
            }
            
            resolve(results.length);
          } catch (error) {
            console.error('❌ Error inserting Local data:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ Error reading Local CSV:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('❌ Error seeding Directory Local:', error);
    throw error;
  }
}

// Main seeding function
async function seedComplete() {
  try {
    console.log('🚀 Starting complete CSV data seeding process...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');
    
    // Seed both directories
    const nationalCount = await seedDirectoryNational();
    const localCount = await seedDirectoryLocal();
    
    console.log('🎉 Seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Directory National: ${nationalCount} records`);
    console.log(`   - Directory Local: ${localCount} records`);
    console.log(`   - Total: ${nationalCount + localCount} records`);
    
    // Verify final counts
    const finalNationalCount = await DirectoryNational.countDocuments();
    const finalLocalCount = await DirectoryLocal.countDocuments();
    
    console.log(`🔍 Database verification:`);
    console.log(`   - Directory National in DB: ${finalNationalCount} records`);
    console.log(`   - Directory Local in DB: ${finalLocalCount} records`);
    
    return {
      national: finalNationalCount,
      local: finalLocalCount
    };
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

seedComplete()
  .then(() => {
    console.log('✅ Complete seeding process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Complete seeding process failed:', error);
    process.exit(1);
  });
