import dotenv from 'dotenv';
import { connectDB } from './src/lib/db.js';
import DirectoryNational from './src/models/DirectoryNational.js';
import DirectoryLocal from './src/models/DirectoryLocal.js';

// Load environment variables
dotenv.config();

async function checkBothDatabases() {
  try {
    await connectDB();
    
    // Check National records
    const nationalCount = await DirectoryNational.countDocuments();
    console.log('Total DirectoryNational records in database:', nationalCount);
    
    const nationalSample = await DirectoryNational.find().limit(5);
    console.log('\nNational sample records:');
    nationalSample.forEach((record, index) => {
      console.log(`${index + 1}. [${record.classification}] ${record.contractNumber} - ${record.contractor} (${record.province})`);
    });
    
    // Check Local records
    const localCount = await DirectoryLocal.countDocuments();
    console.log('\nTotal DirectoryLocal records in database:', localCount);
    
    const localSample = await DirectoryLocal.find().limit(5);
    console.log('\nLocal sample records:');
    localSample.forEach((record, index) => {
      console.log(`${index + 1}. [${record.classification}] ${record.permitNumber} - ${record.permitHolder} (${record.province})`);
    });
    
    // Check classifications
    const nationalClassifications = await DirectoryNational.distinct('classification');
    const localClassifications = await DirectoryLocal.distinct('classification');
    
    console.log('\nNational Classifications:', nationalClassifications);
    console.log('Local Classifications:', localClassifications);
    
    console.log(`\n📊 Total Records Summary:`);
    console.log(`   - Directory National: ${nationalCount} records`);
    console.log(`   - Directory Local: ${localCount} records`);
    console.log(`   - Grand Total: ${nationalCount + localCount} records`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBothDatabases();
