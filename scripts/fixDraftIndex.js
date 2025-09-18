import mongoose from 'mongoose';
import 'dotenv/config';

async function fixDraftIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the database
    const db = mongoose.connection.db;
    
    // Get the reportdrafts collection
    const collection = db.collection('reportdrafts');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);
    
    // Check if draftId_1 index exists and drop it
    const draftIdIndex = indexes.find(index => index.name === 'draftId_1');
    if (draftIdIndex) {
      console.log('Dropping draftId_1 index...');
      await collection.dropIndex('draftId_1');
      console.log('draftId_1 index dropped successfully');
    } else {
      console.log('draftId_1 index not found');
    }
    
    // List indexes after cleanup
    const indexesAfter = await collection.indexes();
    console.log('Indexes after cleanup:', indexesAfter);
    
  } catch (error) {
    console.error('Error fixing draft index:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixDraftIndex();
