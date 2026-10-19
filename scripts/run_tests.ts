import { runAutomatedTests } from '../src/tests/agent.test.ts';

async function main() {
  const report = await runAutomatedTests();
  console.log(`\nTEST_SUITE_STATUS: ${report.suite_status} (${report.passed_tests}/${report.total_tests})`);
  for (const r of report.results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
  }
}

main().catch(console.error);
