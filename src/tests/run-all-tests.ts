/**
 * Run All Tests
 * Executes all unit, integration, and validation tests
 */

import { runQueryBuilderTests } from './unit/query-builder.test.js';
import { runApiClientTests } from './unit/api-client.test.js';
import { runAgentServiceTests } from './unit/agent-service.test.js';
import { runValidationTests } from './integration/agent-validation.test.js';

async function runAllTests() {
  console.log('🧪 Complete Test Suite\n');
  console.log('='.repeat(60));
  console.log('Running all Phase 6 tests');
  console.log('='.repeat(60));
  console.log();

  const queryBuilderResults = await runQueryBuilderTests();
  const apiClientResults = await runApiClientTests();
  const agentServiceResults = await runAgentServiceTests();
  const validationResults = await runValidationTests();

  const totalPassed =
    queryBuilderResults.passed +
    apiClientResults.passed +
    agentServiceResults.passed +
    validationResults.passed;
  const totalFailed =
    queryBuilderResults.failed +
    apiClientResults.failed +
    agentServiceResults.failed +
    validationResults.failed;

  console.log('='.repeat(60));
  console.log('📊 Complete Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Total Passed: ${totalPassed}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log(`📈 Total Tests: ${totalPassed + totalFailed}`);
  console.log();

  if (totalFailed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review the output above.');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
