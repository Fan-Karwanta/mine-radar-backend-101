import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixUsernameIndex = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    console.log('\n📋 Checking existing indexes on users collection...');
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Check if username_1 index exists
    const usernameIndexExists = indexes.some(index => index.name === 'username_1');

    if (usernameIndexExists) {
      console.log('\n🗑️  Dropping obsolete username_1 index...');
      await usersCollection.dropIndex('username_1');
      console.log('✅ Successfully dropped username_1 index');
    } else {
      console.log('\n✅ No username_1 index found - database is clean');
    }

    console.log('\n📋 Final indexes on users collection:');
    const finalIndexes = await usersCollection.indexes();
    console.log(JSON.stringify(finalIndexes, null, 2));

    console.log('\n✅ Index fix completed successfully!');
    console.log('You can now register users without username field errors.');

  } catch (error) {
    console.error('❌ Error fixing username index:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

fixUsernameIndex();
