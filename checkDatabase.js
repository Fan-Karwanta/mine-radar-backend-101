import dotenv from 'dotenv';
import { connectDB } from './src/lib/db.js';
import DirectoryLocal from './src/models/DirectoryLocal.js';

// Load environment variables
dotenv.config();

async function checkDatabase() {
  try {
    await connectDB();
    const count = await DirectoryLocal.countDocuments();
    console.log('Total DirectoryLocal records in database:', count);
    
    // Get a sample of records to verify
    const sample = await DirectoryLocal.find().limit(10);
    console.log('\nSample records:');
    sample.forEach((record, index) => {
      console.log(`${index + 1}. ${record.permitNumber} - ${record.permitHolder} (${record.province})`);
    });
    
    // Check for duplicates
    const duplicates = await DirectoryLocal.aggregate([
      { $group: { _id: "$permitNumber", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    if (duplicates.length > 0) {
      console.log('\nDuplicate permit numbers found:', duplicates.length);
    } else {
      console.log('\nNo duplicate permit numbers found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabase();
