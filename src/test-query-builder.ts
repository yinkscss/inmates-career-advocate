/**
 * Test Script for Query Builder
 * Run with: npm run test:query-builder
 * 
 * Tests natural language to query conversion
 */

import { buildQueryFromMessage, extractIntent } from './utils/query-builder.js';

async function testQueryBuilder() {
  console.log('🧪 Testing Query Builder (Natural Language to Query)\n');

  const testCases = [
    "I'm a software engineer, show me remote jobs",
    "Find me full-time React developer positions in San Francisco",
    "I need a senior Python developer job, remote, $100k-$150k",
    "Show me junior frontend jobs",
    "Looking for contract work, remote, JavaScript",
    "I want a job in New York, full-time, $80k minimum",
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Input: "${testCase}"`);
    console.log('─'.repeat(80));

    try {
      // Test intent extraction
      const intent = await extractIntent(testCase);
      console.log('🔍 Extracted Intent:');
      console.log(JSON.stringify(intent, null, 2));

      // Test query building
      const query = await buildQueryFromMessage(testCase);
      console.log('\n📋 Generated Query:');
      console.log(JSON.stringify(query, null, 2));
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
    }
  }

  console.log('\n✨ Query Builder Tests Complete!\n');
}

testQueryBuilder().catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
