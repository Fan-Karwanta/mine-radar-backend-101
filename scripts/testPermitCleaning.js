/**
 * Test script to verify permit number cleaning logic
 */

import PermitNumberCleaner from './cleanPermitNumbers.js';

function testCleaningLogic() {
  const cleaner = new PermitNumberCleaner();
  
  console.log('🧪 Testing Contract Number Cleaning Logic:\n');
  
  // Test cases for National directory (contract numbers)
  const contractTests = [
    {
      input: '071-97-IV-1758080332921-0vq071-97-IV-1758080332921-0vq',
      expected: '071-97-IV'
    },
    {
      input: '125-98-IV-Amended B',
      expected: '125-98-IV Amended B'  // Normalized to space format
    },
    {
      input: '124-98-IV Amended A',
      expected: '124-98-IV Amended A'  // Space format (from your image)
    },
    {
      input: '124-98-IV Amended B',
      expected: '124-98-IV Amended B'  // Space format (from your image)
    },
    {
      input: '125-98-IV Amended A',
      expected: '125-98-IV Amended A'  // Space format (from your image)
    },
    {
      input: '029-95-IV',
      expected: '029-95-IV'
    },
    {
      input: '032-95-IV-12345678901234567890',
      expected: '032-95-IV'
    },
    {
      input: '035-96-IV-Amended A-1758080332921-0vq',
      expected: '035-96-IV Amended A'  // Normalized to space format
    },
    {
      input: '136-99-IV',
      expected: '136-99-IV'  // From your image
    },
    {
      input: '138-99-IV',
      expected: '138-99-IV'  // From your image
    },
    {
      input: '159-2000-IV',
      expected: '159-2000-IV'  // From your image (4-digit year)
    }
  ];
  
  console.log('📋 CONTRACT NUMBER TESTS:');
  contractTests.forEach((test, index) => {
    const result = cleaner.cleanContractNumber(test.input);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${index + 1}. ${status} Input: "${test.input}"`);
    console.log(`   Expected: "${test.expected}"`);
    console.log(`   Got:      "${result}"`);
    console.log('');
  });
  
  console.log('📋 PERMIT NUMBER TESTS:');
  
  // Test cases for Local directory (permit numbers)
  const permitTests = [
    {
      input: 'QP-Q-0222-Q2',
      expected: 'QP-Q-0222-Q2'
    },
    {
      input: 'QP-Q-0063',
      expected: 'QP-Q-0063'
    },
    {
      input: 'QP-Q-0064-1758080332921-0vqQP-Q-0064-1758080332921-0vq',
      expected: 'QP-Q-0064'
    },
    {
      input: 'QP-Q-054-Q1',
      expected: 'QP-Q-054-Q1'
    },
    {
      input: 'QP-Q-0067-12345678901234567890',
      expected: 'QP-Q-0067'
    }
  ];
  
  permitTests.forEach((test, index) => {
    const result = cleaner.cleanPermitNumber(test.input);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${index + 1}. ${status} Input: "${test.input}"`);
    console.log(`   Expected: "${test.expected}"`);
    console.log(`   Got:      "${result}"`);
    console.log('');
  });
  
  console.log('🎯 Test completed! Check results above.');
}

// Run tests
testCleaningLogic();
