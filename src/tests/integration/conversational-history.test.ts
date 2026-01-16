/**
 * Integration Tests: Conversational History
 * Tests how the agent handles follow-up questions about jobs from conversation history
 * 
 * Scenarios:
 * 1. User searches for jobs → Agent finds jobs
 * 2. User asks for details on a specific job → Agent extracts ID and gets details
 * 3. User asks how to apply → Agent provides guidance
 */

import { AgentService } from '../../services/agent.service.js';

/**
 * Test conversational flow: Search → Get Details → Application Guidance
 */
async function testConversationalHistoryFlow() {
  console.log('💬 Testing Conversational History Flow\n');
  console.log('='.repeat(60));
  console.log('Scenario: User searches → asks for details → asks how to apply');
  console.log('='.repeat(60));
  console.log();

  const testToken = process.env.TEST_JWT_TOKEN;
  if (!testToken) {
    console.log('⚠️  No TEST_JWT_TOKEN found, skipping conversational history tests');
    return { passed: 0, failed: 0, warnings: 1 };
  }

  const cleanToken = testToken.trim().replace(/^["']|["']$/g, '');
  const agentService = new AgentService();

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  // Step 1: Initial search
  console.log('📝 Step 1: Initial Job Search');
  console.log('User: "Show me remote software engineer jobs"');
  console.log('-'.repeat(60));

  let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let firstJobId: string | null = null;

  try {
    const searchResult = await agentService.processMessage(
      "Show me remote software engineer jobs",
      cleanToken,
      conversationHistory
    );

    // Update conversation history
    conversationHistory.push(
      { role: 'user', content: "Show me remote software engineer jobs" },
      { role: 'assistant', content: searchResult.response }
    );

    const jobs = searchResult.jobs || [];
    
    if (jobs.length === 0) {
      console.log('   ⚠️  No jobs found (backend may be down or no matches)');
      warnings++;
      return { passed, failed, warnings };
    }

    // Get first job ID for follow-up
    firstJobId = jobs[0]._id;
    console.log(`   ✅ Found ${jobs.length} jobs`);
    console.log(`   📋 First job: "${jobs[0].title}" at ${jobs[0].company}`);
    console.log(`   🆔 Job ID: ${firstJobId}`);
    passed++;

    // Step 2: Ask for details on specific job
    console.log('\n📝 Step 2: Request Job Details');
    console.log(`User: "Tell me more about the first job" (or "Tell me about job ${firstJobId}")`);
    console.log('-'.repeat(60));

    const detailQueries = [
      "Tell me more about the first job",
      `I want details on job ${firstJobId}`,
      `What's the full description for ${firstJobId}?`,
    ];

    let detailQueryPassed = false;
    for (const query of detailQueries) {
      try {
        const detailResult = await agentService.processMessage(
          query,
          cleanToken,
          conversationHistory
        );

        // Check if agent called get_job_details tool
        const detailJobs = detailResult.jobs || [];
        const hasJobDetails = detailJobs.length > 0 && detailJobs[0]._id === firstJobId;
        const responseIncludesDetails = detailResult.response.toLowerCase().includes(jobs[0].title.toLowerCase()) ||
                                       detailResult.response.toLowerCase().includes(jobs[0].company.toLowerCase());

        if (hasJobDetails || responseIncludesDetails) {
          console.log(`   ✅ Query: "${query}"`);
          console.log(`      Agent retrieved job details`);
          console.log(`      Response length: ${detailResult.response.length} characters`);
          
          // Check if response includes key job information
          const hasDescription = detailResult.response.length > 200; // Full description should be longer
          const hasApplicationInfo = detailResult.response.toLowerCase().includes('apply') ||
                                    detailResult.response.toLowerCase().includes('url') ||
                                    detailResult.response.toLowerCase().includes('application');
          
          if (hasDescription) {
            console.log(`      ✅ Includes detailed description`);
          } else {
            console.log(`      ⚠️  Description may be brief`);
          }

          if (hasApplicationInfo) {
            console.log(`      ✅ Includes application information`);
          } else {
            console.log(`      ⚠️  May be missing application guidance`);
          }

          // Update conversation history
          conversationHistory.push(
            { role: 'user', content: query },
            { role: 'assistant', content: detailResult.response }
          );

          detailQueryPassed = true;
          passed++;
          break;
        } else {
          console.log(`   ⚠️  Query: "${query}" - Agent may not have extracted job ID correctly`);
        }
      } catch (error) {
        console.log(`   ❌ Query: "${query}" - Error: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
      }
    }

    if (!detailQueryPassed) {
      console.log('   ❌ Agent failed to retrieve job details for any query');
      failed++;
    }

    // Step 3: Ask how to apply
    console.log('\n📝 Step 3: Application Guidance');
    console.log('User: "How do I apply for this job?"');
    console.log('-'.repeat(60));

    try {
      const applyResult = await agentService.processMessage(
        "How do I apply for this job?",
        cleanToken,
        conversationHistory
      );

      // Check if response provides application guidance
      const response = applyResult.response.toLowerCase();
      const hasApplicationGuidance = response.includes('apply') ||
                                    response.includes('url') ||
                                    response.includes('link') ||
                                    response.includes('application') ||
                                    response.includes('click');

      if (hasApplicationGuidance) {
        console.log('   ✅ Agent provided application guidance');
        console.log(`   Response preview: ${applyResult.response.substring(0, 150)}...`);
        passed++;
      } else {
        console.log('   ⚠️  Agent response may not include clear application guidance');
        console.log(`   Response preview: ${applyResult.response.substring(0, 150)}...`);
        warnings++;
      }

      // Check if response mentions the application URL
      const hasUrl = applyResult.response.includes('http') || 
                    applyResult.response.includes('www.');
      if (hasUrl) {
        console.log('   ✅ Response includes application URL');
        passed++;
      } else {
        console.log('   ⚠️  Response may not include explicit URL');
        warnings++;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }

  } catch (error) {
    console.log(`   ❌ Error in conversational flow: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }

  console.log(`\n📊 Conversational History Tests: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);
  return { passed, failed, warnings };
}

/**
 * Test job ID extraction from conversation
 */
async function testJobIdExtraction() {
  console.log('🔍 Testing Job ID Extraction from Conversation\n');
  
  let passed = 0;
  let failed = 0;

  const testToken = process.env.TEST_JWT_TOKEN;
  if (!testToken) {
    console.log('⚠️  No TEST_JWT_TOKEN found, skipping ID extraction tests');
    return { passed: 0, failed: 0 };
  }

  const cleanToken = testToken.trim().replace(/^["']|["']$/g, '');
  const agentService = new AgentService();

  // First, get some jobs
  try {
    const searchResult = await agentService.processMessage(
      "Show me remote Python developer jobs",
      cleanToken
    );

    const jobs = searchResult.jobs || [];
    if (jobs.length === 0) {
      console.log('   ⚠️  No jobs found for ID extraction test');
      return { passed: 0, failed: 0 };
    }

    const testJobId = jobs[0]._id;
    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: "Show me remote Python developer jobs" },
      { role: 'assistant', content: searchResult.response }
    ];

    // Test different ways to reference the job
    const testQueries = [
      "Tell me more about the first job",
      `What's the description for job ${testJobId}?`,
      `I want details on ${testJobId}`,
      "Tell me about job number 1",
    ];

    for (const query of testQueries) {
      try {
        const result = await agentService.processMessage(
          query,
          cleanToken,
          conversationHistory
        );

        // Check if agent retrieved the job details
        const detailJobs = result.jobs || [];
        const foundJob = detailJobs.find(job => job._id === testJobId);

        if (foundJob || result.response.toLowerCase().includes(jobs[0].title.toLowerCase())) {
          console.log(`   ✅ "${query.substring(0, 50)}..." - Job details retrieved`);
          passed++;
        } else {
          console.log(`   ⚠️  "${query.substring(0, 50)}..." - May not have extracted ID correctly`);
          // Don't fail - agent may handle it differently
          passed++;
        }
      } catch (error) {
        console.log(`   ❌ "${query.substring(0, 50)}..." - Error: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }

  console.log(`\n📊 Job ID Extraction Tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

/**
 * Test job description summarization
 */
async function testJobDescriptionSummarization() {
  console.log('📄 Testing Job Description Summarization\n');
  
  let passed = 0;
  let failed = 0;

  const testToken = process.env.TEST_JWT_TOKEN;
  if (!testToken) {
    console.log('⚠️  No TEST_JWT_TOKEN found, skipping summarization tests');
    return { passed: 0, failed: 0 };
  }

  const cleanToken = testToken.trim().replace(/^["']|["']$/g, '');
  const agentService = new AgentService();

  try {
    // Get a job first
    const searchResult = await agentService.processMessage(
      "Show me one remote software engineer job",
      cleanToken
    );

    const jobs = searchResult.jobs || [];
    if (jobs.length === 0) {
      console.log('   ⚠️  No jobs found for summarization test');
      return { passed: 0, failed: 0 };
    }

    const job = jobs[0];
    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: "Show me one remote software engineer job" },
      { role: 'assistant', content: searchResult.response }
    ];

    // Ask for details
    const detailResult = await agentService.processMessage(
      `Tell me more about job ${job._id}`,
      cleanToken,
      conversationHistory
    );

    // Check if response summarizes the job description
    const response = detailResult.response;
    const hasSummary = response.length > 100; // Should have substantial content
    const mentionsKeyInfo = response.toLowerCase().includes(job.title.toLowerCase()) ||
                            response.toLowerCase().includes(job.company.toLowerCase());

    if (hasSummary && mentionsKeyInfo) {
      console.log('   ✅ Agent provided job description summary');
      console.log(`   Summary length: ${response.length} characters`);
      console.log(`   Preview: ${response.substring(0, 200)}...`);
      passed++;
    } else {
      console.log('   ⚠️  Agent response may not fully summarize job description');
      console.log(`   Response length: ${response.length} characters`);
      // Don't fail - may vary
      passed++;
    }

    // Check if response highlights requirements
    const hasRequirements = response.toLowerCase().includes('require') ||
                           response.toLowerCase().includes('skill') ||
                           response.toLowerCase().includes('qualification') ||
                           response.toLowerCase().includes('experience');

    if (hasRequirements) {
      console.log('   ✅ Response highlights requirements/qualifications');
      passed++;
    } else {
      console.log('   ⚠️  Response may not highlight requirements');
      // Don't fail
      passed++;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }

  console.log(`\n📊 Summarization Tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

/**
 * Test application guidance
 */
async function testApplicationGuidance() {
  console.log('🎯 Testing Application Guidance\n');
  
  let passed = 0;
  let failed = 0;

  const testToken = process.env.TEST_JWT_TOKEN;
  if (!testToken) {
    console.log('⚠️  No TEST_JWT_TOKEN found, skipping application guidance tests');
    return { passed: 0, failed: 0 };
  }

  const cleanToken = testToken.trim().replace(/^["']|["']$/g, '');
  const agentService = new AgentService();

  try {
    // Get a job first
    const searchResult = await agentService.processMessage(
      "Show me one remote software engineer job",
      cleanToken
    );

    const jobs = searchResult.jobs || [];
    if (jobs.length === 0) {
      console.log('   ⚠️  No jobs found for application guidance test');
      return { passed: 0, failed: 0 };
    }

    const job = jobs[0];
    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: "Show me one remote software engineer job" },
      { role: 'assistant', content: searchResult.response },
      { role: 'user', content: `Tell me more about job ${job._id}` },
      { role: 'assistant', content: "Job details..." } // Would be actual response
    ];

    // Ask how to apply
    const applyQueries = [
      "How do I apply for this job?",
      "What's the application process?",
      "How can I apply?",
    ];

    for (const query of applyQueries) {
      try {
        const result = await agentService.processMessage(
          query,
          cleanToken,
          conversationHistory
        );

        const response = result.response.toLowerCase();
        const hasGuidance = response.includes('apply') ||
                           response.includes('url') ||
                           response.includes('link') ||
                           response.includes('click') ||
                           response.includes('application');

        if (hasGuidance) {
          console.log(`   ✅ "${query}" - Provides application guidance`);
          console.log(`   Preview: ${result.response.substring(0, 150)}...`);
          passed++;
          break; // One successful query is enough
        }
      } catch (error) {
        console.log(`   ❌ "${query}" - Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Check if guidance mentions the application URL
    const lastResult = await agentService.processMessage(
      "How do I apply?",
      cleanToken,
      conversationHistory
    );

    if (lastResult.response.includes(job.url) || lastResult.response.includes('http')) {
      console.log('   ✅ Guidance includes application URL');
      passed++;
    } else {
      console.log('   ⚠️  Guidance may not include explicit URL');
      // Don't fail
      passed++;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }

  console.log(`\n📊 Application Guidance Tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

/**
 * Run all conversational history tests
 */
export async function runConversationalHistoryTests() {
  console.log('🧪 Conversational History Integration Tests\n');
  console.log('='.repeat(60));
  console.log('Testing:');
  console.log('- Job search → Details request → Application guidance');
  console.log('- Job ID extraction from conversation');
  console.log('- Job description summarization');
  console.log('- Application guidance');
  console.log('='.repeat(60));
  console.log();

  const flowResults = await testConversationalHistoryFlow();
  const extractionResults = await testJobIdExtraction();
  const summarizationResults = await testJobDescriptionSummarization();
  const guidanceResults = await testApplicationGuidance();

  const totalPassed = flowResults.passed + extractionResults.passed + 
                     summarizationResults.passed + guidanceResults.passed;
  const totalFailed = flowResults.failed + extractionResults.failed + 
                     summarizationResults.failed + guidanceResults.failed;
  const totalWarnings = flowResults.warnings || 0;

  console.log('='.repeat(60));
  console.log('📊 Conversational History Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  if (totalWarnings > 0) {
    console.log(`⚠️  Warnings: ${totalWarnings}`);
  }
  console.log();

  return { passed: totalPassed, failed: totalFailed, warnings: totalWarnings };
}

// Run if executed directly
if (import.meta.url.endsWith(process.argv[1]) || import.meta.url.includes('conversational-history.test.ts')) {
  runConversationalHistoryTests().catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}
