/**
 * Test Script for Backend API Communication
 * Run with: npm run test:api
 * 
 * This script tests the connection to the inmates-backend API
 */

import { config } from './config/config.js';
import { backendApiClient } from './api/client.js';
import { jobsApiClient } from './api/jobs-api.js';
import { verifyToken } from './api/auth.js';
import { WorkMode } from './types/query.types.js';

async function testBackendConnection() {
  console.log('🧪 Testing Backend API Connection\n');
  console.log('Configuration:');
  console.log(`  Backend URL: ${config.backendApiBaseUrl}`);
  console.log(`  Environment: ${config.nodeEnv}\n`);

  // Test 1: Health Check
  console.log('1️⃣ Testing Backend Health Check...');
  try {
    const isHealthy = await backendApiClient.healthCheck();
    if (isHealthy) {
      console.log('   ✅ Backend is reachable\n');
    } else {
      console.log('   ❌ Backend is not reachable\n');
      return;
    }
  } catch (error) {
    console.log('   ❌ Health check failed:', (error as Error).message, '\n');
    return;
  }

  // Test 2: Check if JWT token is provided
  let testToken = process.env.TEST_JWT_TOKEN;
  if (!testToken) {
    console.log('2️⃣ JWT Token Test');
    console.log('   ⚠️  No TEST_JWT_TOKEN found in environment');
    console.log('   💡 To test authenticated endpoints, set TEST_JWT_TOKEN in .env');
    console.log('   💡 Example: TEST_JWT_TOKEN=your_jwt_token_here\n');
    console.log('   Skipping authenticated endpoint tests...\n');
    return;
  }

  // Clean up token (remove quotes, whitespace)
  testToken = testToken.trim().replace(/^["']|["']$/g, '');
  
  // Test 3: Verify JWT Token
  console.log('2️⃣ Testing JWT Token Verification...');
  console.log(`   Token length: ${testToken.length} characters`);
  console.log(`   Token preview: ${testToken.substring(0, 30)}...`);
  console.log(`   Token format: ${testToken.split('.').length === 3 ? '✅ Valid JWT format (3 parts)' : '❌ Invalid format'}`);
  
  // Try to decode token without verification to check format
  try {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.decode(testToken) as { userId?: string; email?: string; exp?: number } | null;
    if (decoded) {
      console.log(`   Token decoded successfully (not verified yet)`);
      if (decoded.userId) console.log(`   User ID in token: ${decoded.userId}`);
      if (decoded.email) console.log(`   Email in token: ${decoded.email}`);
      if (decoded.exp) {
        const expiryDate = new Date(decoded.exp * 1000);
        const isExpired = expiryDate < new Date();
        console.log(`   Token expires: ${expiryDate.toISOString()} ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
      }
    }
  } catch {
    console.log(`   ⚠️  Could not decode token (format issue)`);
  }
  
  console.log(`   JWT Secret configured: ${config.jwtSecret ? '✅ Yes' : '❌ No'}`);
  console.log(`   JWT Secret length: ${config.jwtSecret ? config.jwtSecret.length : 0} characters`);
  console.log(`   JWT Secret preview: ${config.jwtSecret ? config.jwtSecret.substring(0, 10) + '...' : 'Not set'}\n`);
  
  try {
    const payload = verifyToken(testToken);
    console.log('   ✅ Token is valid and verified!');
    console.log(`   User ID: ${payload.userId}`);
    if (payload.email) {
      console.log(`   Email: ${payload.email}`);
    }
    console.log();
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.log('   ❌ Token verification failed:', errorMessage);
    console.log('\n   🔍 Troubleshooting:');
    console.log('   1. Ensure JWT_SECRET in .env matches the backend JWT secret exactly');
    console.log('   2. Check your backend .env file for JWT_SECRET value');
    console.log('   3. Verify TEST_JWT_TOKEN has no quotes or extra spaces in .env');
    console.log('   4. Make sure the token is the full accessToken from login response');
    console.log('   5. Try getting a fresh token from the backend\n');
    
    // Continue with other tests even if token verification fails
    // (the API might still work if the backend accepts the token)
    console.log('   ⚠️  Continuing with API tests (token may still work with backend)...\n');
  }

  // Test 4: Search Jobs (minimal query)
  if (!testToken) {
    console.log('3️⃣ Jobs API Test');
    console.log('   ⚠️  Skipped - No TEST_JWT_TOKEN provided\n');
  } else {
    console.log('3️⃣ Testing Jobs API - Search Jobs...');
    try {
      const result = await jobsApiClient.searchJobs(
        {
          page: 1,
          limit: 5,
        },
        testToken
      );

      console.log('   ✅ Jobs API call successful');
      
      // Debug: Log the actual response structure
      if (config.nodeEnv === 'development') {
        console.log('   📋 Response structure:', {
          hasData: !!result.data,
          hasMeta: !!result.meta,
          hasLinks: !!result.links,
          dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
          dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
          keys: Object.keys(result),
        });
      }

      // Handle different response structures
      if (!result.meta && result.data) {
        // Response might be just an array
        if (Array.isArray(result.data)) {
          console.log(`   ⚠️  Response is array, not paginated object`);
          console.log(`   Found ${result.data.length} jobs (no pagination info)`);
          if (result.data.length > 0) {
            console.log('\n   Sample job:');
            const job = result.data[0];
            console.log(`     Title: ${job.title}`);
            console.log(`     Company: ${job.company}`);
            console.log(`     Location: ${job.location || 'N/A'}`);
            console.log(`     Type: ${job.jobType}`);
          }
          console.log();
          return;
        }
      }

      if (!result.meta) {
        throw new Error('Response missing meta property. Actual structure: ' + JSON.stringify(Object.keys(result)));
      }

      console.log(`   Found ${result.meta.totalItems} total jobs`);
      console.log(`   Retrieved ${result.data.length} jobs on page ${result.meta.currentPage}`);
      console.log(`   Total pages: ${result.meta.totalPages}`);
      
      if (result.data.length > 0) {
        console.log('\n   Sample job:');
        const job = result.data[0];
        console.log(`     Title: ${job.title}`);
        console.log(`     Company: ${job.company}`);
        console.log(`     Location: ${job.location || 'N/A'}`);
        console.log(`     Type: ${job.jobType}`);
      }
      console.log();
    } catch (error) {
      const apiError = error as { error?: string; message?: string; statusCode?: number };
      console.log('   ❌ Jobs API call failed');
      console.log(`   Error: ${apiError.error || apiError.message || 'Unknown error'}`);
      if (apiError.statusCode) {
        console.log(`   Status Code: ${apiError.statusCode}`);
        if (apiError.statusCode === 401) {
          console.log('   💡 This is likely an authentication issue');
          console.log('   💡 The token may be invalid or the JWT_SECRET may not match');
        }
      }
      // Log full error in development
      if (config.nodeEnv === 'development' && error instanceof Error) {
        console.log(`   Full error: ${error.message}`);
        if (error.stack) {
          console.log(`   Stack: ${error.stack.split('\n')[0]}`);
        }
      }
      console.log();
    }
  }

  // Test 5: Get Job by ID (if we have a job ID)
  const testJobId = process.env.TEST_JOB_ID;
  if (!testToken) {
    console.log('4️⃣ Get Job by ID Test');
    console.log('   ⚠️  Skipped - No TEST_JWT_TOKEN provided\n');
  } else if (testJobId) {
    console.log('4️⃣ Testing Jobs API - Get Job by ID...');
    try {
      const job = await jobsApiClient.getJobById(testJobId, testToken);
      console.log('   ✅ Job retrieval successful');
      console.log(`   Title: ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   Description: ${job.description.substring(0, 100)}...`);
      console.log();
    } catch (error) {
      const apiError = error as { error?: string; message?: string; statusCode?: number };
      console.log('   ❌ Job retrieval failed');
      console.log(`   Error: ${apiError.error || apiError.message || 'Unknown error'}`);
      if (apiError.statusCode) {
        console.log(`   Status Code: ${apiError.statusCode}`);
      }
      console.log();
    }
  } else {
    console.log('4️⃣ Get Job by ID Test');
    console.log('   ⚠️  No TEST_JOB_ID found in environment');
    console.log('   💡 To test job retrieval, set TEST_JOB_ID in .env');
    console.log('   💡 Example: TEST_JOB_ID=64abc1234567890abcdef\n');
  }

  // Test 6: Search with filters
  if (!testToken) {
    console.log('5️⃣ Filtered Search Test');
    console.log('   ⚠️  Skipped - No TEST_JWT_TOKEN provided\n');
  } else {
    console.log('5️⃣ Testing Jobs API - Search with Filters...');
    try {
      const result = await jobsApiClient.searchJobs(
        {
          searchTerm: 'software',
          workMode: WorkMode.REMOTE,
          page: 1,
          limit: 3,
        },
        testToken
      );

      console.log('   ✅ Filtered search successful');
      
      if (!result.meta) {
        if (Array.isArray(result.data)) {
          console.log(`   Found ${result.data.length} jobs matching "software" and "Remote" (no pagination)\n`);
        } else {
          throw new Error('Unexpected response structure');
        }
      } else {
        console.log(`   Found ${result.meta.totalItems} jobs matching "software" and "Remote"`);
        console.log(`   Retrieved ${result.data.length} jobs\n`);
      }
    } catch (error) {
      const apiError = error as { error?: string; message?: string; statusCode?: number };
      console.log('   ❌ Filtered search failed');
      console.log(`   Error: ${apiError.error || apiError.message || 'Unknown error'}`);
      if (apiError.statusCode) {
        console.log(`   Status Code: ${apiError.statusCode}`);
      }
      console.log();
    }
  }

  console.log('✨ API Connection Tests Complete!\n');
}

// Run tests
testBackendConnection().catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
