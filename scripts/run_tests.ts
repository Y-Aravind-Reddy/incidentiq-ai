async function main() {
  // Set the marker before importing application modules so Supabase initialization
  // can skip its network-only startup schema probe for this isolated test run.
  process.env.INCIDENTIQ_AUTOMATED_TESTS = 'true';
  const { runAutomatedTests } = await import('../src/tests/agent.test.ts');
  const report = await runAutomatedTests();
  console.log(`\nTEST_SUITE_STATUS: ${report.suite_status} (${report.passed_tests}/${report.total_tests})`);
  for (const r of report.results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
  }
}

main().catch(console.error);
