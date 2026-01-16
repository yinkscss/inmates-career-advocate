/**
 * Unit Tests: Query Builder
 * Tests query extraction and normalization logic
 */

import { buildQueryFromMessage, buildQueryFromFilters } from '../../utils/query-builder.js';
import { WorkMode } from '../../types/query.types.js';

/**
 * Test query extraction from natural language
 */
async function testQueryExtraction() {
  console.log('📝 Testing Query Extraction\n');
  
  let passed = 0;
  let failed = 0;

  const testCases = [
    {
      input: "I'm a software engineer, show me remote jobs",
      expected: {
        hasSearchTerm: true,
        hasWorkMode: true,
        workMode: 'Remote',
      },
    },
    {
      input: "Find me full-time React developer positions in San Francisco",
      expected: {
        hasSearchTerm: true,
        hasLocation: true,
        hasJobType: true,
        jobType: 'Full-time',
      },
    },
    {
      input: "I need a senior Python developer job, remote, $100k-$150k",
      expected: {
        hasSearchTerm: true,
        hasExperienceLevel: true,
        experienceLevel: 'Senior',
        hasWorkMode: true,
        workMode: 'Remote',
        hasSalaryMin: true,
        salaryMin: 100000,
        hasSalaryMax: true,
        salaryMax: 150000,
      },
    },
    {
      input: "Show me junior frontend jobs",
      expected: {
        hasSearchTerm: true,
        hasExperienceLevel: true,
        experienceLevel: 'Junior',
      },
    },
  ];

  for (const testCase of testCases) {
    try {
      const result = await buildQueryFromMessage(testCase.input);
      
      // Check expected fields
      let testPassed = true;
      const errors: string[] = [];

      if (testCase.expected.hasSearchTerm && !result.searchTerm) {
        testPassed = false;
        errors.push('Missing searchTerm');
      }
      if (testCase.expected.hasLocation && !result.location) {
        testPassed = false;
        errors.push('Missing location');
      }
      if (testCase.expected.hasJobType && result.jobType !== testCase.expected.jobType) {
        testPassed = false;
        errors.push(`Expected jobType "${testCase.expected.jobType}", got "${result.jobType}"`);
      }
      if (testCase.expected.hasWorkMode && result.workMode !== testCase.expected.workMode) {
        testPassed = false;
        errors.push(`Expected workMode "${testCase.expected.workMode}", got "${result.workMode}"`);
      }
      if (testCase.expected.hasExperienceLevel && result.experienceLevel !== testCase.expected.experienceLevel) {
        testPassed = false;
        errors.push(`Expected experienceLevel "${testCase.expected.experienceLevel}", got "${result.experienceLevel}"`);
      }
      if (testCase.expected.hasSalaryMin && result.salaryMin !== testCase.expected.salaryMin) {
        testPassed = false;
        errors.push(`Expected salaryMin ${testCase.expected.salaryMin}, got ${result.salaryMin}`);
      }
      if (testCase.expected.hasSalaryMax && result.salaryMax !== testCase.expected.salaryMax) {
        testPassed = false;
        errors.push(`Expected salaryMax ${testCase.expected.salaryMax}, got ${result.salaryMax}`);
      }

      if (testPassed) {
        console.log(`   ✅ "${testCase.input.substring(0, 50)}..."`);
        passed++;
      } else {
        console.log(`   ❌ "${testCase.input.substring(0, 50)}..."`);
        console.log(`      Errors: ${errors.join(', ')}`);
        console.log(`      Result:`, JSON.stringify(result, null, 2));
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ "${testCase.input.substring(0, 50)}..."`);
      console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log(`\n📊 Query Extraction Tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

/**
 * Test query normalization
 * Note: normalizeIntent expects ExtractedIntent with enum values from LLM extraction
 * The normalization happens during buildQueryFromMessage, not in normalizeIntent itself
 * So we test the end-to-end normalization via buildQueryFromMessage
 */
async function testQueryNormalization() {
  console.log('🔧 Testing Query Normalization\n');
  
  let passed = 0;
  let failed = 0;

  // Test normalization through buildQueryFromMessage (end-to-end)
  const testCases = [
    {
      input: "Show me remote jobs",
      expected: { workMode: 'Remote' },
    },
    {
      input: "Find WFH positions",
      expected: { workMode: 'Remote' },
    },
    {
      input: "I want on-site work",
      expected: { workMode: 'On-site' },
    },
    {
      input: "Looking for full-time positions",
      expected: { jobType: 'Full-time' },
    },
    {
      input: "Need FT work",
      expected: { jobType: 'Full-time' },
    },
    {
      input: "Junior level positions",
      expected: { experienceLevel: 'Junior' },
    },
    {
      input: "Entry-level or jr developer",
      expected: { experienceLevel: 'Junior' },
    },
    {
      input: "Senior engineer roles",
      expected: { experienceLevel: 'Senior' },
    },
  ];

  for (const testCase of testCases) {
    try {
      const result = await buildQueryFromMessage(testCase.input);
      
      let testPassed = true;
      const errors: string[] = [];

      for (const [key, expectedValue] of Object.entries(testCase.expected)) {
        if (result[key as keyof typeof result] !== expectedValue) {
          testPassed = false;
          errors.push(`Expected ${key}="${expectedValue}", got "${result[key as keyof typeof result]}"`);
        }
      }

      if (testPassed) {
        console.log(`   ✅ "${testCase.input.substring(0, 40)}..." → ${JSON.stringify(testCase.expected)}`);
        passed++;
      } else {
        console.log(`   ❌ Normalization failed: "${testCase.input.substring(0, 40)}..."`);
        console.log(`      Errors: ${errors.join(', ')}`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ Error normalizing: "${testCase.input.substring(0, 40)}..."`);
      console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log(`\n📊 Query Normalization Tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

/**
 * Test deterministic queries (same input should produce same output)
 */
async function testDeterministicQueries() {
  console.log('🎯 Testing Deterministic Queries\n');
  
  let passed = 0;
  let failed = 0;

  const testInput = "Show me remote Python developer jobs paying over $100k";
  
  try {
    // Run the same query multiple times
    const results = await Promise.all([
      buildQueryFromMessage(testInput),
      buildQueryFromMessage(testInput),
      buildQueryFromMessage(testInput),
    ]);

    // Check if all results are the same
    const firstResult = JSON.stringify(results[0]);
    const allSame = results.every((result) => JSON.stringify(result) === firstResult);

    if (allSame) {
      console.log('   ✅ Same input produces same output (deterministic)');
      console.log(`   Result: ${JSON.stringify(results[0], null, 2)}`);
      passed++;
    } else {
      console.log('   ❌ Same input produces different outputs (non-deterministic)');
      results.forEach((result, idx) => {
        console.log(`   Run ${idx + 1}:`, JSON.stringify(result, null, 2));
      });
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : String(error));
    failed++;
  }

  console.log(`\n📊 Deterministic Query Tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

/**
 * Test buildQueryFromFilters
 */
function testBuildQueryFromFilters() {
  console.log('🏗️  Testing buildQueryFromFilters\n');
  
  let passed = 0;
  let failed = 0;

  const testCases = [
    {
      input: { searchTerm: 'Python', workMode: WorkMode.REMOTE },
      expected: { searchTerm: 'Python', workMode: WorkMode.REMOTE, page: 1, limit: 10 },
    },
    {
      input: { salaryMin: 100000, salaryMax: 150000 },
      expected: { salaryMin: 100000, salaryMax: 150000, page: 1, limit: 10 },
    },
    {
      input: { location: 'San Francisco', jobType: 'Full-time' as const },
      expected: { location: 'San Francisco', jobType: 'Full-time', page: 1, limit: 10 },
    },
  ];

  for (const testCase of testCases) {
    try {
      const result = buildQueryFromFilters(testCase.input);
      
      let testPassed = true;
      const errors: string[] = [];

      for (const [key, expectedValue] of Object.entries(testCase.expected)) {
        if (result[key as keyof typeof result] !== expectedValue) {
          testPassed = false;
          errors.push(`Expected ${key}=${JSON.stringify(expectedValue)}, got ${JSON.stringify(result[key as keyof typeof result])}`);
        }
      }

      if (testPassed) {
        console.log(`   ✅ Filters: ${JSON.stringify(testCase.input)}`);
        passed++;
      } else {
        console.log(`   ❌ Filters failed: ${JSON.stringify(testCase.input)}`);
        console.log(`      Errors: ${errors.join(', ')}`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log(`\n📊 buildQueryFromFilters Tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

/**
 * Run all query builder tests
 */
export async function runQueryBuilderTests() {
  console.log('🧪 Query Builder Unit Tests\n');
  console.log('='.repeat(60));
  
  const extractionResults = await testQueryExtraction();
  const normalizationResults = await testQueryNormalization();
  const deterministicResults = await testDeterministicQueries();
  const filtersResults = testBuildQueryFromFilters();

  const totalPassed = extractionResults.passed + normalizationResults.passed + 
                     deterministicResults.passed + filtersResults.passed;
  const totalFailed = extractionResults.failed + normalizationResults.failed + 
                     deterministicResults.failed + filtersResults.failed;

  console.log('='.repeat(60));
  console.log('📊 Query Builder Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log();

  return { passed: totalPassed, failed: totalFailed };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runQueryBuilderTests().catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}
