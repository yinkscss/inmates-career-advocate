/**
 * Test Script for Phase 5: Response Generation & Formatting
 * Run with: npm run test:phase5
 * 
 * Tests:
 * 1. Response formatter utilities
 * 2. Chat endpoint (POST /api/chat)
 * 3. Error handling scenarios
 */

import axios from 'axios';
import { config } from './config/config.js';
import {
  formatJobSummary,
  formatSalaryRange,
  formatJobsList,
  formatErrorMessage,
  formatNoJobsMessage,
  groupJobsByCategory,
} from './utils/response-formatter.js';
import type { JobListing } from './types/job.types.js';

// Test data
const mockJob: JobListing = {
  _id: '507f1f77bcf86cd799439011',
  source: 'indeed',
  title: 'Senior Software Engineer',
  company: 'Tech Corp',
  description: 'We are looking for a senior software engineer...',
  url: 'https://example.com/job/123',
  logo: 'https://example.com/logo.png',
  location: 'San Francisco, CA',
  salaryMin: 120000,
  salaryMax: 180000,
  jobType: 'Full-time',
  workMode: 'Remote',
  tags: ['React', 'TypeScript', 'Node.js'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockJobs: JobListing[] = [
  mockJob,
  {
    ...mockJob,
    _id: '507f1f77bcf86cd799439012',
    title: 'Frontend Developer',
    company: 'Startup Inc',
    location: 'New York, NY',
    salaryMin: 90000,
    salaryMax: 130000,
    workMode: 'Hybrid',
    tags: ['React', 'Vue', 'CSS'],
  },
  {
    ...mockJob,
    _id: '507f1f77bcf86cd799439013',
    title: 'Backend Engineer',
    company: 'Cloud Systems',
    location: 'Remote',
    salaryMin: 110000,
    salaryMax: 150000,
    workMode: 'Remote',
    tags: ['Node.js', 'Python', 'AWS'],
  },
];

/**
 * Test response formatter utilities
 */
function testResponseFormatters() {
  console.log('📝 Testing Response Formatter Utilities\n');
  
  let passed = 0;
  let failed = 0;

  // Test formatSalaryRange
  console.log('1. Testing formatSalaryRange()');
  try {
    const range1 = formatSalaryRange(120000, 180000);
    const expected1 = '$120,000 - $180,000';
    if (range1 === expected1) {
      console.log('   ✅ Both min and max:', range1);
      passed++;
    } else {
      console.log(`   ❌ Expected "${expected1}", got "${range1}"`);
      failed++;
    }

    const range2 = formatSalaryRange(120000, null);
    const expected2 = '$120,000+';
    if (range2 === expected2) {
      console.log('   ✅ Only min:', range2);
      passed++;
    } else {
      console.log(`   ❌ Expected "${expected2}", got "${range2}"`);
      failed++;
    }

    const range3 = formatSalaryRange(null, 180000);
    const expected3 = 'Up to $180,000';
    if (range3 === expected3) {
      console.log('   ✅ Only max:', range3);
      passed++;
    } else {
      console.log(`   ❌ Expected "${expected3}", got "${range3}"`);
      failed++;
    }

    const range4 = formatSalaryRange(null, null);
    if (range4 === 'Not specified') {
      console.log('   ✅ No salary:', range4);
      passed++;
    } else {
      console.log(`   ❌ Expected "Not specified", got "${range4}"`);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : String(error));
    failed++;
  }

  // Test formatJobSummary
  console.log('\n2. Testing formatJobSummary()');
  try {
    const summary = formatJobSummary(mockJob);
    if (summary.includes('Senior Software Engineer') && 
        summary.includes('Tech Corp') &&
        summary.includes('San Francisco') &&
        summary.includes('Remote') &&
        summary.includes('$120,000 - $180,000')) {
      console.log('   ✅ Job summary formatted correctly');
      console.log('   Preview:', summary.substring(0, 100) + '...');
      passed++;
    } else {
      console.log('   ❌ Job summary missing expected fields');
      console.log('   Summary:', summary);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : String(error));
    failed++;
  }

  // Test formatJobsList
  console.log('\n3. Testing formatJobsList()');
  try {
    const list = formatJobsList(mockJobs);
    if (list.includes('3 jobs') && list.includes('Senior Software Engineer')) {
      console.log('   ✅ Jobs list formatted correctly');
      console.log('   Preview:', list.substring(0, 150) + '...');
      passed++;
    } else {
      console.log('   ❌ Jobs list missing expected content');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : String(error));
    failed++;
  }

  // Test groupJobsByCategory
  console.log('\n4. Testing groupJobsByCategory()');
  try {
    const grouped = groupJobsByCategory(mockJobs, 'workMode');
    if (grouped['Remote'] && grouped['Remote'].length === 2 &&
        grouped['Hybrid'] && grouped['Hybrid'].length === 1) {
      console.log('   ✅ Jobs grouped by work mode correctly');
      console.log(`   Remote: ${grouped['Remote'].length}, Hybrid: ${grouped['Hybrid'].length}`);
      passed++;
    } else {
      console.log('   ❌ Jobs grouping incorrect');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : String(error));
    failed++;
  }

  // Test formatErrorMessage
  console.log('\n5. Testing formatErrorMessage()');
  try {
    const authError = formatErrorMessage(new Error('401 Unauthorized'));
    if (authError.includes('authenticating')) {
      console.log('   ✅ Authentication error formatted correctly');
      passed++;
    } else {
      console.log('   ❌ Authentication error format incorrect');
      failed++;
    }

    const networkError = formatErrorMessage(new Error('Network timeout'));
    if (networkError.includes('connection')) {
      console.log('   ✅ Network error formatted correctly');
      passed++;
    } else {
      console.log('   ❌ Network error format incorrect');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : String(error));
    failed++;
  }

  // Test formatNoJobsMessage
  console.log('\n6. Testing formatNoJobsMessage()');
  try {
    const noJobsMsg = formatNoJobsMessage({ searchTerm: 'Python', salaryMin: 200000 });
    if (noJobsMsg.includes("couldn't find") && noJobsMsg.includes('suggestions')) {
      console.log('   ✅ No jobs message formatted correctly');
      console.log('   Preview:', noJobsMsg.substring(0, 100) + '...');
      passed++;
    } else {
      console.log('   ❌ No jobs message format incorrect');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : String(error));
    failed++;
  }

  console.log(`\n📊 Response Formatter Tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

/**
 * Test chat endpoint
 */
async function testChatEndpoint() {
  console.log('🌐 Testing Chat Endpoint (POST /api/chat)\n');

  let passed = 0;
  let failed = 0;

  const baseURL = `http://localhost:${config.port}`;
  const testToken = process.env.TEST_JWT_TOKEN;

  if (!testToken) {
    console.log('⚠️  No TEST_JWT_TOKEN found, skipping endpoint tests');
    console.log('💡 Set TEST_JWT_TOKEN in .env to test the chat endpoint\n');
    return { passed: 0, failed: 0 };
  }

  const cleanToken = testToken.trim().replace(/^["']|["']$/g, '');

  // Test 1: Valid request
  console.log('1. Testing valid chat request');
  try {
    const response = await axios.post(
      `${baseURL}/api/chat`,
      {
        message: 'Show me remote software engineer jobs',
      },
      {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout for agent processing
      }
    );

    if (response.status === 200 && response.data.success) {
      console.log('   ✅ Valid request succeeded');
      console.log(`   Response length: ${response.data.data.response.length} characters`);
      console.log(`   Jobs found: ${response.data.data.jobs?.length || 0}`);
      console.log(`   Conversation ID: ${response.data.data.conversationId}`);
      if (response.data.data.suggestedActions) {
        console.log(`   Suggested actions: ${response.data.data.suggestedActions.join(', ')}`);
      }
      passed++;
    } else {
      console.log('   ❌ Unexpected response format');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      failed++;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠️  Server not running. Start with: npm run dev');
        console.log('   Skipping endpoint tests...\n');
        return { passed: 0, failed: 0 };
      }
      console.log(`   ❌ Request failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    } else {
      console.log('   ❌ Error:', error instanceof Error ? error.message : String(error));
    }
    failed++;
  }

  // Test 2: Missing message
  console.log('\n2. Testing missing message (should return 400)');
  try {
    await axios.post(
      `${baseURL}/api/chat`,
      {},
      {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // Don't throw on any status
      }
    );
    console.log('   ❌ Should have returned 400 error');
    failed++;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      console.log('   ✅ Correctly returned 400 for missing message');
      passed++;
    } else {
      console.log('   ❌ Unexpected error:', error instanceof Error ? error.message : String(error));
      failed++;
    }
  }

  // Test 3: Empty message
  console.log('\n3. Testing empty message (should return 400)');
  try {
    const response = await axios.post(
      `${baseURL}/api/chat`,
      { message: '' },
      {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );
    if (response.status === 400) {
      console.log('   ✅ Correctly returned 400 for empty message');
      passed++;
    } else {
      console.log(`   ❌ Expected 400, got ${response.status}`);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : String(error));
    failed++;
  }

  // Test 4: Missing authentication
  console.log('\n4. Testing missing authentication (should return 401)');
  try {
    const response = await axios.post(
      `${baseURL}/api/chat`,
      { message: 'Test message' },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );
    if (response.status === 401) {
      console.log('   ✅ Correctly returned 401 for missing auth');
      passed++;
    } else {
      console.log(`   ❌ Expected 401, got ${response.status}`);
      failed++;
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.log('   ✅ Correctly returned 401 for missing auth');
      passed++;
    } else {
      console.log('   ❌ Unexpected error:', error instanceof Error ? error.message : String(error));
      failed++;
    }
  }

  console.log(`\n📊 Chat Endpoint Tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Phase 5 Testing Suite\n');
  console.log('='.repeat(60));
  console.log('Testing Response Generation & Formatting');
  console.log('='.repeat(60));
  console.log();

  const formatterResults = testResponseFormatters();
  const endpointResults = await testChatEndpoint();

  const totalPassed = formatterResults.passed + endpointResults.passed;
  const totalFailed = formatterResults.failed + endpointResults.failed;

  console.log('='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📈 Total: ${totalPassed + totalFailed}`);
  console.log();

  if (totalFailed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review the output above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
