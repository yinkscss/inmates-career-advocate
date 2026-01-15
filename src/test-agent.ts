/**
 * Test Script for Job Discovery Agent
 * Run with: npm run test:agent
 * 
 * Tests the LangChain agent with sample queries
 */

import { AgentService } from './services/agent.service.js';
import { config } from './config/config.js';

async function testAgent() {
  console.log('🤖 Testing Job Discovery Agent\n');
  console.log(`Model: ${config.agentModel}`);
  console.log(`Temperature: ${config.agentTemperature}`);
  console.log(`Backend URL: ${config.backendApiBaseUrl}\n`);

  let testToken = process.env.TEST_JWT_TOKEN;
  if (!testToken) {
    console.error('❌ No TEST_JWT_TOKEN found in environment');
    console.log('💡 Set TEST_JWT_TOKEN in .env to test the agent\n');
    process.exit(1);
  }

  // Clean the token (remove quotes, whitespace)
  testToken = testToken.trim().replace(/^["']|["']$/g, '');

  // Debug token info
  console.log('🔑 Token Info:');
  console.log(`   Length: ${testToken.length} characters`);
  console.log(`   Preview: ${testToken.substring(0, 30)}...`);
  console.log(`   Format: ${testToken.startsWith('eyJ') ? '✅ Valid JWT format' : '❌ Invalid format'}`);
  
  // Try to decode token to check expiry
  try {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.decode(testToken) as { exp?: number } | null;
    if (decoded?.exp) {
      const expiryDate = new Date(decoded.exp * 1000);
      const isExpired = expiryDate < new Date();
      console.log(`   Expires: ${expiryDate.toISOString()} ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
    }
  } catch {
    // Ignore decode errors
  }
  
  // Try to verify token locally
  try {
    const { verifyToken } = await import('./api/auth.js');
    const payload = verifyToken(testToken);
    console.log(`   Local verification: ✅ Valid (User ID: ${payload.userId || 'N/A'})\n`);
  } catch (error) {
    console.log(`   Local verification: ❌ ${(error as Error).message}\n`);
    console.warn('⚠️  Token failed local verification. Backend will likely reject it too.');
    console.warn('💡 Get a fresh token from the backend login endpoint.\n');
  }

  // Check backend connectivity first
  const { backendApiClient } = await import('./api/client.js');
  const isBackendReachable = await backendApiClient.healthCheck();
  if (!isBackendReachable) {
    console.warn('⚠️  Backend is not reachable. Agent will still run but API calls will fail.');
    console.warn('💡 Make sure the backend is running at:', config.backendApiBaseUrl);
    console.warn('💡 The agent will demonstrate error handling.\n');
  } else {
    console.log('✅ Backend is reachable\n');
  }

  const agentService = new AgentService();
  const testQueries = [
    "I'm a software engineer, show me remote jobs",
    "Find me React developer positions",
    "Show me senior Python jobs paying over $100k",
  ];

  for (const query of testQueries) {
    console.log(`\n📝 User: "${query}"`);
    console.log('─'.repeat(80));

    try {
      const result = await agentService.processMessage(query, testToken);

      console.log(`\n🤖 Agent Response:`);
      console.log(result.response);
      
      if (result.jobs && result.jobs.length > 0) {
        console.log(`\n📋 Jobs Found: ${result.jobs.length}`);
        result.jobs.slice(0, 3).forEach((job, idx) => {
          console.log(`\n  ${idx + 1}. ${job.title} at ${job.company}`);
          console.log(`     Location: ${job.location || 'N/A'}`);
          console.log(`     Type: ${job.jobType}`);
          if (job.workMode) {
            console.log(`     Work Mode: ${job.workMode}`);
          }
        });
      } else {
        console.log('\n📋 No jobs extracted from agent response');
        console.log('   (This is normal if backend is not running or no jobs match)');
      }
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
    }

    console.log('\n' + '─'.repeat(80));
  }

  console.log('\n✨ Agent Tests Complete!\n');
}

testAgent().catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
