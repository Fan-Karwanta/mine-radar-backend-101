/**
 * Comprehensive scan script to identify all corrupted permit/contract numbers
 * that still need cleaning in MongoDB collections
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

class DataScanner {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGO_URI environment variable is not defined.');
      }
      
      console.log('🔌 Connecting to MongoDB...');
      this.client = new MongoClient(mongoUri);
      await this.client.connect();
      this.db = this.client.db();
      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  /**
   * Check if a permit/contract number is corrupted
   */
  isCorrupted(value) {
    if (!value || typeof value !== 'string') return false;
    
    // Look for the corruption pattern: long numeric suffixes
    const corruptionPatterns = [
      /-\d{10,}/, // Long numeric suffixes (10+ digits)
      /-[a-z0-9]{3,}$/, // Short alphanumeric suffixes at end (but not valid patterns)
      /\d{13,}/, // Very long numbers embedded
      /GENERATED-.*-\d{13,}-[a-z0-9]+/i, // Generated pattern
    ];
    
    // Exclude valid patterns that might look corrupted but aren't
    const validPatterns = [
      /^QPA-[A-Z]+-\d{4}$/, // QPA-CAV-2021 format
      /^CP-Q-\d{3}$/, // CP-Q-023 format
      /^IP-SAG-[A-Z]+-\d{3}$/, // IP-SAG-IVA-032 format
      /^MPP-\d{4}-\d{3}$/, // MPP-2017-002 format
      /^[A-Z]+-\d{4}-\d{3}$/, // General XXXX-YYYY-ZZZ format
    ];
    
    // If it matches a valid pattern, it's not corrupted
    if (validPatterns.some(pattern => pattern.test(value))) {
      return false;
    }
    
    return corruptionPatterns.some(pattern => pattern.test(value));
  }

  /**
   * List all collections and find directory-related ones
   */
  async findAllCollections() {
    try {
      console.log('🔍 Scanning all collections in database...\n');
      const collections = await this.db.listCollections().toArray();
      
      console.log(`📊 Found ${collections.length} total collections:`);
      collections.forEach((collection, index) => {
        console.log(`  ${index + 1}. ${collection.name}`);
      });
      
      // Find directory-related collections
      const directoryCollections = collections.filter(c => 
        c.name.toLowerCase().includes('directory') || 
        c.name.toLowerCase().includes('national') ||
        c.name.toLowerCase().includes('local') ||
        c.name.toLowerCase().includes('hotspot')
      );
      
      console.log(`\n🎯 Directory-related collections (${directoryCollections.length}):`);
      directoryCollections.forEach((collection, index) => {
        console.log(`  ${index + 1}. ${collection.name}`);
      });
      
      return directoryCollections.map(c => c.name);
    } catch (error) {
      console.error('❌ Error listing collections:', error);
      return [];
    }
  }

  /**
   * Scan a specific collection for corrupted data
   */
  async scanCollection(collectionName) {
    try {
      console.log(`\n🔍 Scanning collection: ${collectionName}`);
      const collection = this.db.collection(collectionName);
      
      const totalCount = await collection.countDocuments();
      console.log(`📊 Total documents: ${totalCount}`);
      
      if (totalCount === 0) {
        console.log('⚠️ Collection is empty');
        return { collectionName, totalCount: 0, corruptedCount: 0, samples: [] };
      }
      
      // Get all documents
      const documents = await collection.find({}).toArray();
      
      // Check for corrupted contract numbers
      let corruptedContracts = [];
      let corruptedPermits = [];
      
      documents.forEach(doc => {
        // Check contract numbers (for national directory)
        if (doc.contractNumber && this.isCorrupted(doc.contractNumber)) {
          corruptedContracts.push({
            id: doc._id,
            original: doc.contractNumber,
            field: 'contractNumber'
          });
        }
        
        // Check permit numbers (for local directory)
        if (doc.permitNumber && this.isCorrupted(doc.permitNumber)) {
          corruptedPermits.push({
            id: doc._id,
            original: doc.permitNumber,
            field: 'permitNumber'
          });
        }
        
        // Check complaint numbers (for hotspots)
        if (doc.complaintNumber && this.isCorrupted(doc.complaintNumber)) {
          corruptedPermits.push({
            id: doc._id,
            original: doc.complaintNumber,
            field: 'complaintNumber'
          });
        }
      });
      
      const allCorrupted = [...corruptedContracts, ...corruptedPermits];
      
      console.log(`🔴 Corrupted records found: ${allCorrupted.length}`);
      
      if (allCorrupted.length > 0) {
        console.log('📋 Sample corrupted records:');
        allCorrupted.slice(0, 10).forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.field}: "${record.original}"`);
        });
        
        if (allCorrupted.length > 10) {
          console.log(`  ... and ${allCorrupted.length - 10} more`);
        }
      }
      
      return {
        collectionName,
        totalCount,
        corruptedCount: allCorrupted.length,
        samples: allCorrupted.slice(0, 5),
        allCorrupted
      };
      
    } catch (error) {
      console.error(`❌ Error scanning collection ${collectionName}:`, error);
      return { collectionName, totalCount: 0, corruptedCount: 0, samples: [], error: error.message };
    }
  }

  /**
   * Run comprehensive scan of all directory collections
   */
  async runComprehensiveScan() {
    try {
      await this.connect();
      
      console.log('🚀 Starting comprehensive data corruption scan...\n');
      
      // Find all directory collections
      const directoryCollections = await this.findAllCollections();
      
      if (directoryCollections.length === 0) {
        console.log('⚠️ No directory collections found');
        return;
      }
      
      // Scan each collection
      const scanResults = [];
      for (const collectionName of directoryCollections) {
        const result = await this.scanCollection(collectionName);
        scanResults.push(result);
      }
      
      // Summary report
      console.log('\n' + '='.repeat(60));
      console.log('📊 COMPREHENSIVE SCAN SUMMARY');
      console.log('='.repeat(60));
      
      let totalDocuments = 0;
      let totalCorrupted = 0;
      
      scanResults.forEach(result => {
        totalDocuments += result.totalCount;
        totalCorrupted += result.corruptedCount;
        
        console.log(`\n📁 ${result.collectionName}:`);
        console.log(`  Total documents: ${result.totalCount}`);
        console.log(`  Corrupted records: ${result.corruptedCount}`);
        console.log(`  Corruption rate: ${result.totalCount > 0 ? ((result.corruptedCount / result.totalCount) * 100).toFixed(1) : 0}%`);
        
        if (result.error) {
          console.log(`  ❌ Error: ${result.error}`);
        }
      });
      
      console.log('\n' + '='.repeat(60));
      console.log(`🎯 OVERALL SUMMARY:`);
      console.log(`  Total documents scanned: ${totalDocuments}`);
      console.log(`  Total corrupted records: ${totalCorrupted}`);
      console.log(`  Overall corruption rate: ${totalDocuments > 0 ? ((totalCorrupted / totalDocuments) * 100).toFixed(1) : 0}%`);
      
      if (totalCorrupted > 0) {
        console.log(`\n🔧 NEXT STEPS:`);
        console.log(`  Run the cleaning script to fix ${totalCorrupted} corrupted records`);
        console.log(`  Command: npm run clean-execute`);
      } else {
        console.log(`\n🎉 All data is clean! No corrupted records found.`);
      }
      
      return scanResults;
      
    } catch (error) {
      console.error('❌ Scan failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Command line execution
async function main() {
  const scanner = new DataScanner();
  
  try {
    await scanner.runComprehensiveScan();
  } catch (error) {
    console.error('💥 Scan failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export default DataScanner;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
