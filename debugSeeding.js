import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { connectDB } from './src/lib/db.js';
import DirectoryLocal from './src/models/DirectoryLocal.js';

// Load environment variables
dotenv.config();

// Helper function to clean and parse CSV data
const cleanCsvData = (data) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    const cleanKey = key.replace(/"/g, '').trim();
    cleaned[cleanKey] = value === '--' || value === 'ND' ? '' : (value || '').toString().trim();
  }
  return cleaned;
};

const parseNumber = (numStr) => {
  if (!numStr || numStr === '--' || numStr === 'ND') return 0;
  const num = parseInt(numStr);
  return isNaN(num) ? 0 : num;
};

async function debugSeeding() {
  try {
    await connectDB();
    console.log('Connected to database');
    
    // Clear existing data first
    const deleteResult = await DirectoryLocal.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing records`);
    
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
            
            // Log first few records to debug
            if (lineNumber <= 3) {
              console.log(`\nLine ${lineNumber} raw data:`, Object.keys(data));
              console.log(`Line ${lineNumber} clean data:`, cleanData);
            }
            
            const record = {
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
            
            // Check validation
            if (record.permitNumber && record.permitNumber.trim() !== '' && 
                record.permitHolder && record.permitHolder.trim() !== '') {
              
              // Provide defaults for required fields
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
              reason: error.message,
              data: data
            });
          }
        })
        .on('end', async () => {
          try {
            console.log(`\nProcessed ${lineNumber} lines from CSV`);
            console.log(`Valid records: ${results.length}`);
            console.log(`Errors: ${errors.length}`);
            
            if (errors.length > 0) {
              console.log('\nFirst 5 errors:');
              errors.slice(0, 5).forEach(error => {
                console.log(`Line ${error.line}: ${error.reason}`);
                if (error.permitNumber) console.log(`  Permit: ${error.permitNumber}`);
                if (error.permitHolder) console.log(`  Holder: ${error.permitHolder}`);
              });
            }
            
            if (results.length > 0) {
              console.log('\nInserting records...');
              const insertResult = await DirectoryLocal.insertMany(results, { ordered: false });
              console.log(`✅ Successfully inserted ${insertResult.length} records`);
              
              // Verify final count
              const finalCount = await DirectoryLocal.countDocuments();
              console.log(`Final database count: ${finalCount}`);
            }
            
            resolve(results.length);
          } catch (error) {
            console.error('❌ Error inserting data:', error);
            if (error.writeErrors) {
              console.log('Write errors:', error.writeErrors.slice(0, 3));
            }
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ Error reading CSV:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugSeeding()
  .then(() => {
    console.log('✅ Debug seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug seeding failed:', error);
    process.exit(1);
  });
