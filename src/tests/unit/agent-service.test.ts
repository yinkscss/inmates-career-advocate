/**
 * Unit Tests: Agent Service
 * Tests conversation history trimming (bounded context for agent)
 */

import { getHistoryForAgent } from '../../services/agent.service.js';
import { config } from '../../config/config.js';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

function makeHistory(n: number, lastAssistantWithJobIds = -1): ConversationMessage[] {
  const out: ConversationMessage[] = [];
  for (let i = 0; i < n; i++) {
    const isAssistant = i % 2 === 1;
    let content = isAssistant ? `Assistant reply ${i}` : `User message ${i}`;
    if (isAssistant && lastAssistantWithJobIds === i) {
      content += ' The first job is Engineer at Co (ID: abc123).';
    }
    out.push({ role: isAssistant ? 'assistant' : 'user', content });
  }
  return out;
}

/**
 * Test history trimming: when history is under limit, return as-is
 */
function testTrimUnderLimit() {
  console.log('📝 Test: History under limit returned as-is');
  const max = config.maxHistoryMessages;
  const history = makeHistory(max - 2);
  const result = getHistoryForAgent(history, max);
  if (result.length !== history.length) {
    console.log(`   ❌ Expected ${history.length} messages, got ${result.length}`);
    return false;
  }
  if (result !== history) {
    console.log('   ❌ Expected same array reference when under limit');
    return false;
  }
  console.log('   ✅ Passed');
  return true;
}

/**
 * Test history trimming: when history exceeds limit, return last N messages
 */
function testTrimOverLimit() {
  console.log('📝 Test: History over limit trimmed to last N');
  const max = config.maxHistoryMessages;
  const history = makeHistory(max + 5);
  const result = getHistoryForAgent(history, max);
  if (result.length !== max) {
    console.log(`   ❌ Expected ${max} messages, got ${result.length}`);
    return false;
  }
  const expectedFirst = history[history.length - max];
  if (result[0].content !== expectedFirst.content) {
    console.log('   ❌ Expected result to be last N messages from original');
    return false;
  }
  console.log('   ✅ Passed');
  return true;
}

/**
 * Test history trimming: when last "job IDs" assistant message would be cut off, include it
 */
function testTrimPreservesJobListMessage() {
  console.log('📝 Test: Last job-list message preserved when it would be cut off');
  const max = 6;
  // 12 messages; last assistant with "ID: " at index 3 (0-based). So indices 0..11.
  // slice(-6) would give indices 6,7,8,9,10,11 -> message at 3 would be dropped.
  const history = makeHistory(12, 3);
  const result = getHistoryForAgent(history, max);
  const hasJobIds = result.some((m) => m.role === 'assistant' && m.content.includes('ID: '));
  if (!hasJobIds) {
    console.log('   ❌ Expected result to include the assistant message with job IDs');
    return false;
  }
  if (result.length < max) {
    console.log(`   ❌ Expected at least ${max} messages when preserving job list, got ${result.length}`);
    return false;
  }
  // Should have included from index 3 onward = 9 messages
  if (result[0].content !== history[3].content) {
    console.log('   ❌ Expected result to start from the job-list message');
    return false;
  }
  console.log('   ✅ Passed');
  return true;
}

export async function runAgentServiceTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n🔧 Agent Service (history trimming) Unit Tests\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  if (testTrimUnderLimit()) passed++;
  else failed++;

  if (testTrimOverLimit()) passed++;
  else failed++;

  if (testTrimPreservesJobListMessage()) passed++;
  else failed++;

  console.log('='.repeat(60));
  console.log(`Agent Service: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAgentServiceTests().then((r) => {
    process.exit(r.failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  });
}
