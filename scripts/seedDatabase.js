#!/usr/bin/env node

import 'dotenv/config';
import { seedAllDirectories } from '../src/seeders/csvSeeder.js';

console.log('🚀 Starting database seeding process...');

seedAllDirectories()
  .then((result) => {
    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Summary:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  });
