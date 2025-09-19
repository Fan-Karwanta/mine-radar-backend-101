/**
 * Script to clean corrupted permit/contract numbers in MongoDB collections
 * Fixes issues like: 071-97-IV-1758080332921-0vq071-97-IV-1758080332921-0vq -> 071-97-IV
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

class PermitNumberCleaner {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      // Check if MONGO_URI is defined (matching the .env file)
      const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGO_URI environment variable is not defined. Please check your .env file.');
      }
      
      console.log('🔌 Connecting to MongoDB...');
      console.log('📍 Using URI:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
      
      this.client = new MongoClient(mongoUri);
      await this.client.connect();
      this.db = this.client.db();
      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      if (error.message.includes('MONGO_URI')) {
        console.error('💡 Make sure your .env file exists and contains MONGO_URI=your-connection-string');
      }
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
   * Check if a value has corruption patterns
   */
  isCorrupted(value) {
    if (!value || typeof value !== 'string') return false;
    
    const corruptionPatterns = [
      /-\d{10,}/, // Long numeric suffixes (10+ digits)
      /-[a-z0-9]{3,}$/, // Short alphanumeric suffixes at end
      /\d{13,}/, // Very long numbers embedded
      /GENERATED-.*-\d{13,}-[a-z0-9]+/i, // Generated pattern
    ];
    
    return corruptionPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Clean contract numbers for National directory
   * Handles various corruption patterns found in the database
   */
  cleanContractNumber(contractNumber) {
    if (!contractNumber || typeof contractNumber !== 'string') {
      return contractNumber;
    }

    let cleaned = contractNumber.trim();
    
    // If not corrupted, return as-is
    if (!this.isCorrupted(cleaned)) {
      return cleaned;
    }
    
    // Pattern 1: Remove duplicated parts like "071-97-IV-1758080332921-0vq071-97-IV-1758080332921-0vq"
    const duplicatePattern = /^(.+?)(-\d+.*?)\1/;
    const duplicateMatch = cleaned.match(duplicatePattern);
    if (duplicateMatch) {
      cleaned = duplicateMatch[1];
    }

    // Pattern 2: Remove long numeric/alphanumeric garbage suffixes
    cleaned = cleaned.replace(/-\d{10,}.*$/, ''); // Remove long numeric suffixes
    cleaned = cleaned.replace(/-[a-z0-9]{3,}$/, ''); // Remove short alphanumeric suffixes
    
    // Pattern 3: Handle GENERATED patterns
    if (cleaned.includes('GENERATED')) {
      cleaned = cleaned.replace(/GENERATED-.*-\d{13,}-[a-z0-9]+/i, 'GENERATED');
    }

    // Pattern 4: Extract main contract number formats
    const contractPatterns = [
      /^(\d{3}-\d{2,4}-IV)/, // XXX-XX-IV or XXX-XXXX-IV
      /^([A-Z]+-[A-Z]+-\d+)/, // EP-IVA-019 format
      /^([A-Z]+-\d+-\d+)/, // Other letter-number combinations
      /^([A-Z]+P?-[A-Z]+-[A-Z0-9-]+)/, // Complex patterns like MPSA, APSA
    ];
    
    for (const pattern of contractPatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        let baseNumber = match[1];
        
        // Check for valid "Amended" suffixes after the base
        const remainder = cleaned.substring(baseNumber.length);
        const amendedPatterns = [
          /^\s+Amended\s+[A-Z]$/,
          /^-Amended\s+[A-Z]$/,
          /^\s+Amended$/,
          /^-Amended$/
        ];
        
        for (const amendedPattern of amendedPatterns) {
          if (amendedPattern.test(remainder)) {
            const normalizedSuffix = remainder.replace(/^[-\s]+/, ' ').trim();
            return baseNumber + ' ' + normalizedSuffix;
          }
        }
        
        return baseNumber;
      }
    }

    return cleaned;
  }

  /**
   * Clean permit numbers for Local directory
   * Handles various permit number formats and corruption patterns
   */
  cleanPermitNumber(permitNumber) {
    if (!permitNumber || typeof permitNumber !== 'string') {
      return permitNumber;
    }

    let cleaned = permitNumber.trim();
    
    // If not corrupted, return as-is
    if (!this.isCorrupted(cleaned)) {
      return cleaned;
    }
    
    // Remove duplicated parts
    const duplicatePattern = /^(.+?)(-\d+.*?)\1/;
    const duplicateMatch = cleaned.match(duplicatePattern);
    if (duplicateMatch) {
      cleaned = duplicateMatch[1];
    }

    // Remove long numeric/alphanumeric garbage suffixes
    cleaned = cleaned.replace(/-\d{10,}.*$/, ''); // Remove long numeric suffixes
    cleaned = cleaned.replace(/-[a-z0-9]{3,}$/, ''); // Remove short alphanumeric suffixes
    
    // Handle GENERATED patterns
    if (cleaned.includes('GENERATED')) {
      cleaned = cleaned.replace(/GENERATED-.*-\d{13,}-[a-z0-9]+/i, 'GENERATED');
    }

    // Extract main permit patterns
    const permitPatterns = [
      /^(QP-Q-\d+(?:-Q\d+)?)/, // QP-Q-XXXX or QP-Q-XXXX-QX
      /^(BP-[A-Z]+-\d+-\d+)/, // BP-AQP-21-23 format
      /^(QPA-[A-Z]+-\d+-\d+)/, // QPA-CAV-2021-005 format
      /^(AQP-Q-\d+)/, // AQP-Q-741 format
      /^(CP-Q-\d+-\d+)/, // CP-Q-023-119 format
      /^([A-Z]+-\d+-\d+)/, // CSAG-04-24 format
      /^(IP-Q-\d+(?:-Q\d+)?)/, // IP-Q-322 or IP-Q-0119-Q4 format
      /^(IP-SAG-[A-Z]+-\d+)/, // IP-SAG-IVA-040 format
      /^([A-Z]+SAG-QP-\d+)/, // AISAG-QP-067 format
      /^(SP-\d+-\d+)/, // SP-24-24 format
      /^(SDP-[A-Z0-9]+-[A-Z]-\d+)/, // SDP-001A-S-2024 format
      /^([A-Z]+P?)$/, // ATHP format
    ];
    
    for (const pattern of permitPatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return cleaned;
  }

  /**
   * Clean complaint numbers for Hotspots directory
   */
  cleanComplaintNumber(complaintNumber) {
    if (!complaintNumber || typeof complaintNumber !== 'string') {
      return complaintNumber;
    }

    let cleaned = complaintNumber.trim();
    
    // If not corrupted, return as-is
    if (!this.isCorrupted(cleaned)) {
      return cleaned;
    }
    
    // Handle GENERATED patterns
    if (cleaned.includes('GENERATED')) {
      cleaned = cleaned.replace(/GENERATED-.*-\d{13,}-[a-z0-9]+/i, 'GENERATED-HOTSPOT');
    }
    
    // Remove long numeric/alphanumeric garbage suffixes
    cleaned = cleaned.replace(/-\d{10,}.*$/, '');
    cleaned = cleaned.replace(/-[a-z0-9]{3,}$/, '');
    
    return cleaned;
  }

  /**
   * Bulk update National directory collection
   */
  async cleanNationalDirectory() {
    try {
      console.log('🔧 Starting National directory cleanup...');
      
      // Find the correct collection name
      const { nationalCollections } = await this.findDirectoryCollections();
      
      if (nationalCollections.length === 0) {
        console.log('⚠️ No national directory collections found');
        return { updated: 0, errors: 0, total: 0 };
      }
      
      let totalUpdated = 0;
      let totalErrors = 0;
      let totalDocuments = 0;
      
      for (const collectionName of nationalCollections) {
        console.log(`📊 Processing collection: ${collectionName}`);
        const collection = this.db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        
        console.log(`📊 Found ${documents.length} documents in ${collectionName}`);
        totalDocuments += documents.length;
        
        let updateCount = 0;
        let errorCount = 0;
        
        // First, get all existing contract numbers to avoid conflicts
        const existingContracts = await collection.distinct('contractNumber');
        const usedContractNumbers = new Set(existingContracts);
        
        console.log(`📊 Found ${existingContracts.length} existing contract numbers in ${collectionName}`);
        
        for (const doc of documents) {
          try {
            const originalContract = doc.contractNumber;
            if (!originalContract) continue;
            
            let cleanedContract = this.cleanContractNumber(originalContract);
            
            if (originalContract !== cleanedContract) {
              // Handle duplicates by adding suffix
              let finalContract = cleanedContract;
              let suffix = 1;
              
              while (usedContractNumbers.has(finalContract)) {
                finalContract = `${cleanedContract}-${suffix}`;
                suffix++;
              }
              
              usedContractNumbers.add(finalContract);
              
              await collection.updateOne(
                { _id: doc._id },
                { $set: { contractNumber: finalContract } }
              );
              
              updateCount++;
              if (finalContract !== cleanedContract) {
                console.log(`✅ Updated (with suffix): "${originalContract}" → "${finalContract}"`);
              } else {
                console.log(`✅ Updated: "${originalContract}" → "${finalContract}"`);
              }
            } else {
              // Even if not changed, track the existing number
              usedContractNumbers.add(originalContract);
            }
          } catch (error) {
            errorCount++;
            console.error(`❌ Error updating document ${doc._id}:`, error.message);
          }
        }
        
        totalUpdated += updateCount;
        totalErrors += errorCount;
        console.log(`📊 ${collectionName}: ${updateCount} updated, ${errorCount} errors`);
      }
      
      console.log(`🎉 National cleanup complete: ${totalUpdated} updated, ${totalErrors} errors`);
      return { updated: totalUpdated, errors: totalErrors, total: totalDocuments };
      
    } catch (error) {
      console.error('❌ Error in National directory cleanup:', error);
      throw error;
    }
  }

  /**
   * Bulk update Local directory collection
   */
  async cleanLocalDirectory() {
    try {
      console.log('🔧 Starting Local directory cleanup...');
      
      // Find the correct collection name
      const { localCollections } = await this.findDirectoryCollections();
      
      if (localCollections.length === 0) {
        console.log('⚠️ No local directory collections found');
        return { updated: 0, errors: 0, total: 0 };
      }
      
      let totalUpdated = 0;
      let totalErrors = 0;
      let totalDocuments = 0;
      
      for (const collectionName of localCollections) {
        console.log(`📊 Processing collection: ${collectionName}`);
        const collection = this.db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        
        console.log(`📊 Found ${documents.length} documents in ${collectionName}`);
        totalDocuments += documents.length;
        
        let updateCount = 0;
        let errorCount = 0;
        
        // First, get all existing permit numbers to avoid conflicts
        const existingPermits = await collection.distinct('permitNumber');
        const usedPermitNumbers = new Set(existingPermits);
        
        console.log(`📊 Found ${existingPermits.length} existing permit numbers in ${collectionName}`);
        
        for (const doc of documents) {
          try {
            const originalPermit = doc.permitNumber;
            if (!originalPermit) continue;
            
            let cleanedPermit = this.cleanPermitNumber(originalPermit);
            
            if (originalPermit !== cleanedPermit) {
              // Handle duplicates by adding suffix
              let finalPermit = cleanedPermit;
              let suffix = 1;
              
              while (usedPermitNumbers.has(finalPermit)) {
                finalPermit = `${cleanedPermit}-${suffix}`;
                suffix++;
              }
              
              usedPermitNumbers.add(finalPermit);
              
              await collection.updateOne(
                { _id: doc._id },
                { $set: { permitNumber: finalPermit } }
              );
              
              updateCount++;
              if (finalPermit !== cleanedPermit) {
                console.log(`✅ Updated (with suffix): "${originalPermit}" → "${finalPermit}"`);
              } else {
                console.log(`✅ Updated: "${originalPermit}" → "${finalPermit}"`);
              }
            } else {
              // Even if not changed, track the existing number
              usedPermitNumbers.add(originalPermit);
            }
          } catch (error) {
            errorCount++;
            console.error(`❌ Error updating document ${doc._id}:`, error.message);
          }
        }
        
        totalUpdated += updateCount;
        totalErrors += errorCount;
        console.log(`📊 ${collectionName}: ${updateCount} updated, ${errorCount} errors`);
      }
      
      console.log(`🎉 Local cleanup complete: ${totalUpdated} updated, ${totalErrors} errors`);
      return { updated: totalUpdated, errors: totalErrors, total: totalDocuments };
      
    } catch (error) {
      console.error('❌ Error in Local directory cleanup:', error);
      throw error;
    }
  }

  /**
   * Bulk update Hotspots directory collection
   */
  async cleanHotspotsDirectory() {
    try {
      console.log('🔧 Starting Hotspots directory cleanup...');
      
      // Find hotspots collections
      const allCollections = await this.listCollections();
      const hotspotsCollections = allCollections.filter(name => 
        name.toLowerCase().includes('hotspot')
      );
      
      if (hotspotsCollections.length === 0) {
        console.log('⚠️ No hotspots directory collections found');
        return { updated: 0, errors: 0, total: 0 };
      }
      
      let totalUpdated = 0;
      let totalErrors = 0;
      let totalDocuments = 0;
      
      for (const collectionName of hotspotsCollections) {
        console.log(`📊 Processing collection: ${collectionName}`);
        const collection = this.db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        
        console.log(`📊 Found ${documents.length} documents in ${collectionName}`);
        totalDocuments += documents.length;
        
        let updateCount = 0;
        let errorCount = 0;
        
        // First, get all existing complaint numbers to avoid conflicts
        const existingComplaints = await collection.distinct('complaintNumber');
        const usedComplaintNumbers = new Set(existingComplaints);
        
        console.log(`📊 Found ${existingComplaints.length} existing complaint numbers in ${collectionName}`);
        
        for (const doc of documents) {
          try {
            const originalComplaint = doc.complaintNumber;
            if (!originalComplaint) continue;
            
            let cleanedComplaint = this.cleanComplaintNumber(originalComplaint);
            
            if (originalComplaint !== cleanedComplaint) {
              // Handle duplicates by adding suffix
              let finalComplaint = cleanedComplaint;
              let suffix = 1;
              
              while (usedComplaintNumbers.has(finalComplaint)) {
                finalComplaint = `${cleanedComplaint}-${suffix}`;
                suffix++;
              }
              
              usedComplaintNumbers.add(finalComplaint);
              
              await collection.updateOne(
                { _id: doc._id },
                { $set: { complaintNumber: finalComplaint } }
              );
              
              updateCount++;
              if (finalComplaint !== cleanedComplaint) {
                console.log(`✅ Updated (with suffix): "${originalComplaint}" → "${finalComplaint}"`);
              } else {
                console.log(`✅ Updated: "${originalComplaint}" → "${finalComplaint}"`);
              }
            } else {
              // Even if not changed, track the existing number
              usedComplaintNumbers.add(originalComplaint);
            }
          } catch (error) {
            errorCount++;
            console.error(`❌ Error updating document ${doc._id}:`, error.message);
          }
        }
        
        totalUpdated += updateCount;
        totalErrors += errorCount;
        console.log(`📊 ${collectionName}: ${updateCount} updated, ${errorCount} errors`);
      }
      
      console.log(`🎉 Hotspots cleanup complete: ${totalUpdated} updated, ${totalErrors} errors`);
      return { updated: totalUpdated, errors: totalErrors, total: totalDocuments };
      
    } catch (error) {
      console.error('❌ Error in Hotspots directory cleanup:', error);
      throw error;
    }
  }

  /**
   * List all collections in the database to debug collection names
   */
  async listCollections() {
    try {
      console.log('🔍 Checking available collections in database...');
      const collections = await this.db.listCollections().toArray();
      
      console.log(`📊 Found ${collections.length} collections:`);
      collections.forEach((collection, index) => {
        console.log(`  ${index + 1}. ${collection.name}`);
      });
      console.log('');
      
      return collections.map(c => c.name);
    } catch (error) {
      console.error('❌ Error listing collections:', error);
      return [];
    }
  }

  /**
   * Find the correct collection names for directory data
   */
  async findDirectoryCollections() {
    const allCollections = await this.listCollections();
    
    // Look for collections that might contain directory data
    const nationalCollections = allCollections.filter(name => 
      name.toLowerCase().includes('national') || 
      name.toLowerCase().includes('directory')
    );
    
    const localCollections = allCollections.filter(name => 
      name.toLowerCase().includes('local') && 
      name.toLowerCase().includes('directory')
    );
    
    console.log('🔎 Directory collection candidates:');
    console.log('  National:', nationalCollections);
    console.log('  Local:', localCollections);
    console.log('');
    
    return { nationalCollections, localCollections };
  }

  /**
   * Preview what changes would be made without actually updating
   */
  async previewChanges() {
    try {
      console.log('👀 Previewing changes that would be made...\n');
      
      // First, find the correct collection names
      const { nationalCollections, localCollections } = await this.findDirectoryCollections();
      
      // Preview National changes
      console.log('📋 NATIONAL DIRECTORY PREVIEW:');
      for (const collectionName of nationalCollections) {
        console.log(`  Checking collection: ${collectionName}`);
        const collection = this.db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`  Documents found: ${count}`);
        
        if (count > 0) {
          const docs = await collection.find({}).limit(5).toArray();
          for (const doc of docs) {
            const original = doc.contractNumber;
            if (original) {
              const cleaned = this.cleanContractNumber(original);
              if (original !== cleaned) {
                console.log(`    "${original}" → "${cleaned}"`);
              }
            }
          }
        }
      }
      
      // Preview Local changes
      console.log('\n📋 LOCAL DIRECTORY PREVIEW:');
      for (const collectionName of localCollections) {
        console.log(`  Checking collection: ${collectionName}`);
        const collection = this.db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`  Documents found: ${count}`);
        
        if (count > 0) {
          const docs = await collection.find({}).limit(5).toArray();
          for (const doc of docs) {
            const original = doc.permitNumber;
            if (original) {
              const cleaned = this.cleanPermitNumber(original);
              if (original !== cleaned) {
                console.log(`    "${original}" → "${cleaned}"`);
              }
            }
          }
        }
      }
      
      console.log('\n✨ Preview complete. Run with --execute to apply changes.');
      
    } catch (error) {
      console.error('❌ Error in preview:', error);
      throw error;
    }
  }

  /**
   * Run the complete cleanup process
   */
  async runCleanup(executeChanges = false) {
    try {
      await this.connect();
      
      if (!executeChanges) {
        await this.previewChanges();
        return;
      }
      
      console.log('🚀 Starting permit number cleanup process...\n');
      
      // Clean National directory
      const nationalResults = await this.cleanNationalDirectory();
      
      console.log(''); // Empty line for separation
      
      // Clean Local directory  
      const localResults = await this.cleanLocalDirectory();
      
      console.log(''); // Empty line for separation
      
      // Clean Hotspots directory
      const hotspotsResults = await this.cleanHotspotsDirectory();
      
      console.log('\n📊 CLEANUP SUMMARY:');
      console.log(`  National: ${nationalResults.updated}/${nationalResults.total} updated`);
      console.log(`  Local: ${localResults.updated}/${localResults.total} updated`);
      console.log(`  Hotspots: ${hotspotsResults.updated}/${hotspotsResults.total} updated`);
      console.log(`  Total Errors: ${nationalResults.errors + localResults.errors + hotspotsResults.errors}`);
      
      const totalUpdated = nationalResults.updated + localResults.updated + hotspotsResults.updated;
      const totalErrors = nationalResults.errors + localResults.errors + hotspotsResults.errors;
      
      if (totalErrors === 0) {
        console.log(`🎉 All ${totalUpdated} corrupted records cleaned successfully!`);
      } else {
        console.log(`⚠️ Completed with ${totalErrors} errors. ${totalUpdated} records were cleaned.`);
      }
      
      return {
        national: nationalResults,
        local: localResults,
        hotspots: hotspotsResults
      };
      
    } catch (error) {
      console.error('❌ Cleanup process failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Debug function to check environment
function checkEnvironment() {
  console.log('🔍 Environment Check:');
  console.log('  NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('  MONGO_URI:', process.env.MONGO_URI ? 'defined' : 'undefined');
  console.log('  MONGODB_URI:', process.env.MONGODB_URI ? 'defined' : 'undefined');
  
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (mongoUri) {
    console.log('  URI starts with:', mongoUri.substring(0, 20) + '...');
  }
  
  console.log('  Current working directory:', process.cwd());
  console.log('  .env file path should be:', process.cwd() + '/.env');
  console.log('');
}

// Command line execution
async function main() {
  const executeChanges = process.argv.includes('--execute');
  
  if (!executeChanges) {
    console.log('🔍 Running in PREVIEW mode. Add --execute flag to apply changes.\n');
  }
  
  // Check environment first
  checkEnvironment();
  
  const cleaner = new PermitNumberCleaner();
  
  try {
    await cleaner.runCleanup(executeChanges);
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export default PermitNumberCleaner;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
