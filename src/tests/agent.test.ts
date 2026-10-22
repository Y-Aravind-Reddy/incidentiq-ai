import { stateStore, computePlanHash } from '../agent/state.ts';
import { orchestrator } from '../agent/orchestrator.ts';
import { parseIncidentLogs } from '../tools/logParser.ts';
import { matchRunbooks } from '../tools/runbookRetriever.ts';
import { executeSandboxRemediation } from '../tools/sandboxRemediator.ts';
import { evaluateVerification } from '../tools/verifier.ts';
import type { RemediationProposal } from '../agent/types.ts';
import { setPersistenceTestMode } from '../agent/persistence.ts';
import { runGeminiValidationTests } from './gemini.test.ts';
import { runNavigationTests } from './navigation.test.ts';
import { setGeminiTestMode } from '../agent/gemini.ts';
import { fetchAllAudit, fetchIncidents, fetchRunbooks, createIncident } from '../services/api.ts';
import { runAuthorizationTests } from './authorization.test.ts';

export interface TestResultItem {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  input: any;
  expected: string;
  actual: string;
  evidence: string;
  duration_ms: number;
}

export interface AutomatedTestReport {
  timestamp: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  suite_status: 'PASSED' | 'FAILED';
  results: TestResultItem[];
}

async function runAutomatedTestsInMemory(): Promise<AutomatedTestReport> {
  const results: TestResultItem[] = [...await runGeminiValidationTests(), ...runNavigationTests(), ...await runAuthorizationTests()];

  // Reset store to pristine state before starting tests
  stateStore.reset();

  // Test 1: Incident Retrieval (Both scenarios)
  const t1Start = performance.now();
  const incA = stateStore.getIncident('INC-2026-8841');
  const incB = stateStore.getIncident('INC-2026-9024');
  const t1Passed = Boolean(incA && incB && incA.severity === 'critical' && incB.severity === 'high');
  results.push({
    id: 'TEST-01',
    name: 'Incident Retrieval (Scenario A & B)',
    category: 'Ingress & Storage',
    passed: t1Passed,
    input: { ids: ['INC-2026-8841', 'INC-2026-9024'] },
    expected: 'Both incidents retrieved with correct critical and high severities',
    actual: `Retrieved ${incA?.id} (${incA?.severity}), ${incB?.id} (${incB?.severity})`,
    evidence: `Service A: ${incA?.service_name}, Service B: ${incB?.service_name}`,
    duration_ms: Math.round(performance.now() - t1Start),
  });

  // Test 2: Log Parsing and Symptom Detection
  const t2Start = performance.now();
  const logsA = stateStore.getLogsForIncident('INC-2026-8841');
  const parsedA = parseIncidentLogs(logsA);
  const t2Passed = parsedA.fatal_count >= 2 && parsedA.key_symptoms.some((s) => s.includes('Database connection pool'));
  results.push({
    id: 'TEST-02',
    name: 'Log Parsing & Anomaly Extraction',
    category: 'Log Analytics',
    passed: t2Passed,
    input: { log_count: logsA.length, incident_id: 'INC-2026-8841' },
    expected: 'Extracts FATAL/ERROR counts and identifies database connection pool symptoms',
    actual: `Fatal count: ${parsedA.fatal_count}, Error count: ${parsedA.error_count}, Symptoms: ${parsedA.key_symptoms.join(', ')}`,
    evidence: `Primary suspect service identified: ${parsedA.primary_suspect_service}`,
    duration_ms: Math.round(performance.now() - t2Start),
  });

  // Test 3: Runbook Retrieval
  const t3Start = performance.now();
  const runbooks = stateStore.getAllRunbooks();
  const matched = matchRunbooks(runbooks, 'Database connection pool exhaustion and timeout', 'critical');
  const t3Passed = matched.length > 0 && matched[0].runbook.id === 'RBK-DB-POOL-01';
  results.push({
    id: 'TEST-03',
    name: 'Runbook Symptom & Severity Retrieval',
    category: 'Knowledge Base',
    passed: t3Passed,
    input: { query: 'Database connection pool exhaustion and timeout', severity: 'critical' },
    expected: 'Top ranked runbook is RBK-DB-POOL-01 with high relevance score',
    actual: `Matched ${matched.length} runbooks; Top: ${matched[0]?.runbook.id} (Score: ${matched[0]?.relevanceScore})`,
    evidence: `Match reasons: ${matched[0]?.matchReasons.join('; ')}`,
    duration_ms: Math.round(performance.now() - t3Start),
  });

  // Test 4: End-to-End AI Investigation & Hypothesis Ranking (Scenario A)
  const t4Start = performance.now();
  const invResultA = await orchestrator.runInvestigation('INC-2026-8841');
  const t4Passed =
    invResultA.investigation.hypotheses.length > 0 &&
    invResultA.investigation.evidence_citations.length > 0 &&
    invResultA.proposal.status === 'pending';
  results.push({
    id: 'TEST-04',
    name: 'AI Investigation & Evidence-Backed Hypotheses (Scenario A)',
    category: 'Reasoning Engine',
    passed: t4Passed,
    input: { incident_id: 'INC-2026-8841' },
    expected: 'Investigation produces ranked hypotheses citing verified log IDs and generates pending proposal',
    actual: `Generated ${invResultA.investigation.hypotheses.length} hypotheses, Top confidence: ${invResultA.investigation.confidence_score}, Proposal: ${invResultA.proposal.id}`,
    evidence: `Top hypothesis: "${invResultA.investigation.hypotheses[0]?.title}" with citations: ${invResultA.investigation.hypotheses[0]?.supporting_evidence_ids.join(', ')}`,
    duration_ms: Math.round(performance.now() - t4Start),
  });

  // Test 5: Plan Hash Tampering Protection
  const t5Start = performance.now();
  let hashTamperCaught = false;
  try {
    await orchestrator.submitApproval(
      invResultA.proposal.id,
      'approved',
      'malicious@external.com',
      'Untrusted Actor',
      'sha256:TAMPERED_HASH_00000000',
      'Attempting unauthorized modification'
    );
  } catch (err: any) {
    hashTamperCaught = err.message.includes('Plan hash integrity check failed');
  }
  results.push({
    id: 'TEST-05',
    name: 'Plan Hash Tampering Rejection',
    category: 'Security & Integrity',
    passed: hashTamperCaught,
    input: { proposal_id: invResultA.proposal.id, forged_hash: 'sha256:TAMPERED_HASH_00000000' },
    expected: 'Throws error rejecting approval due to plan hash mismatch',
    actual: hashTamperCaught ? 'Blocked execution and recorded security violation in audit log' : 'Failed to block tampered hash',
    evidence: `Stored plan hash: ${invResultA.proposal.plan_hash}`,
    duration_ms: Math.round(performance.now() - t5Start),
  });

  // Test 6: Rejection Enforcement
  const t6Start = performance.now();
  // Create another investigation for rejection test
  const invResultB = await orchestrator.runInvestigation('INC-2026-9024');
  const rejectionRecord = await orchestrator.submitApproval(
    invResultB.proposal.id,
    'rejected',
    'sre-lead@incidentiq.internal',
    'Elena Rostova',
    invResultB.proposal.plan_hash,
    'Rejecting action: Need manual failover check first'
  );
  let executeBlocked = false;
  try {
    await orchestrator.executeRemediation(invResultB.proposal.id, 'Operator');
  } catch (err: any) {
    executeBlocked = err.message.includes('is not approved');
  }
  const t6Passed = rejectionRecord.decision === 'rejected' && executeBlocked;
  results.push({
    id: 'TEST-06',
    name: 'Rejected Action Execution Prevention',
    category: 'Human-in-the-Loop',
    passed: t6Passed,
    input: { proposal_id: invResultB.proposal.id, decision: 'rejected' },
    expected: 'Proposal status set to rejected and execution strictly blocked',
    actual: `Proposal decision: ${rejectionRecord.decision}; Execution blocked: ${executeBlocked}`,
    evidence: `Comments recorded: "${rejectionRecord.comments}"`,
    duration_ms: Math.round(performance.now() - t6Start),
  });

  // Test 7: Valid Human Approval & Plan Hash Binding
  const t7Start = performance.now();
  const validApproval = await orchestrator.submitApproval(
    invResultA.proposal.id,
    'approved',
    'sre-oncall@incidentiq.internal',
    'Elena Rostova (Principal SRE)',
    invResultA.proposal.plan_hash,
    'Verified database pool exhaustion from log evidence. Authorized for sandbox execution.'
  );
  const t7Passed = validApproval.decision === 'approved' && validApproval.plan_hash_confirmed === invResultA.proposal.plan_hash;
  results.push({
    id: 'TEST-07',
    name: 'Valid Human Approval & Hash Binding',
    category: 'Human-in-the-Loop',
    passed: t7Passed,
    input: { proposal_id: invResultA.proposal.id, plan_hash: invResultA.proposal.plan_hash },
    expected: 'Approved status recorded with verified cryptographic plan hash binding',
    actual: `Approval ID: ${validApproval.id}, Decision: ${validApproval.decision}`,
    evidence: `Confirmed plan hash: ${validApproval.plan_hash_confirmed}`,
    duration_ms: Math.round(performance.now() - t7Start),
  });

  // Test 8: Deterministic Sandbox Remediation Execution
  const t8Start = performance.now();
  const execResult = await orchestrator.executeRemediation(
    invResultA.proposal.id,
    'Automated SRE Runner'
  );
  const t8Passed =
    execResult.action.execution_status === 'completed' &&
    execResult.action.after_state.connection_utilization_pct !== undefined &&
    execResult.action.after_state.connection_utilization_pct < 60;
  results.push({
    id: 'TEST-08',
    name: 'Deterministic Sandbox Remediation (Scenario A)',
    category: 'Remediation Engine',
    passed: t8Passed,
    input: { proposal_id: invResultA.proposal.id, action_type: invResultA.proposal.action_type },
    expected: 'Pool resized in sandbox; connection utilization drops below 60%',
    actual: `Status: ${execResult.action.execution_status}, After utilization: ${execResult.action.after_state.connection_utilization_pct}%, Latency: ${execResult.action.after_state.p99_latency_ms}ms`,
    evidence: `Execution log steps: ${execResult.action.execution_logs.length}`,
    duration_ms: Math.round(performance.now() - t8Start),
  });

  // Test 9: Duplicate Execution Prevention
  const t9Start = performance.now();
  let duplicateBlocked = false;
  try {
    await orchestrator.executeRemediation(invResultA.proposal.id, 'Second Attempt');
  } catch (err: any) {
    duplicateBlocked = err.message.includes('is not approved');
  }
  results.push({
    id: 'TEST-09',
    name: 'Duplicate Execution Prevention',
    category: 'Safety & Idempotency',
    passed: duplicateBlocked,
    input: { proposal_id: invResultA.proposal.id },
    expected: 'Subsequent execution attempt blocked because status is already executed',
    actual: duplicateBlocked ? 'Execution blocked with status guard' : 'Allowed duplicate execution',
    evidence: `Current proposal status: ${stateStore.getProposal(invResultA.proposal.id)?.status}`,
    duration_ms: Math.round(performance.now() - t9Start),
  });

  // Test 10: Before-and-After Recovery Verification
  const t10Start = performance.now();
  const verif = execResult.verification;
  const t10Passed =
    verif.status === 'VERIFIED_RECOVERED' &&
    verif.criteria_results.every((c) => c.passed === true);
  results.push({
    id: 'TEST-10',
    name: 'Telemetry Recovery Verification',
    category: 'Verification Gate',
    passed: t10Passed,
    input: { verification_id: verif.id, criteria_count: verif.criteria_results.length },
    expected: 'All criteria pass: utilization <= 60%, latency <= 250ms, health == HEALTHY',
    actual: `Verification status: ${verif.status}; All ${verif.criteria_results.length} gates passed`,
    evidence: `Explanation: ${verif.explanation}`,
    duration_ms: Math.round(performance.now() - t10Start),
  });

  // Test 11: Controlled Failure Verification Case
  const t11Start = performance.now();
  const failedVerif = evaluateVerification(
    'INC-2026-8841',
    'ACT-FAIL-TEST',
    { connection_utilization_pct: 98.4, p99_latency_ms: 4820, health_check_status: 'DEGRADED' },
    { connection_utilization_pct: 88.0, p99_latency_ms: 3200, health_check_status: 'DEGRADED' },
    [
      { metric: 'connection_utilization_pct', target_condition: '<=', threshold_value: 60 },
      { metric: 'p99_latency_ms', target_condition: '<=', threshold_value: 250 },
    ]
  );
  const t11Passed = failedVerif.status === 'RECOVERY_FAILED' && failedVerif.criteria_results.some((c) => !c.passed);
  results.push({
    id: 'TEST-11',
    name: 'Recovery Failure Honesty (Honest Reporting)',
    category: 'Verification Gate',
    passed: t11Passed,
    input: { observed_utilization: 88.0, observed_latency: 3200 },
    expected: 'Properly marks status RECOVERY_FAILED when metrics remain above threshold',
    actual: `Status: ${failedVerif.status}; Explanation: ${failedVerif.explanation}`,
    evidence: `Failed criteria count: ${failedVerif.criteria_results.filter((c) => !c.passed).length}`,
    duration_ms: Math.round(performance.now() - t11Start),
  });

  // Test 12: Audit Trail Event Recording
  const t12Start = performance.now();
  const audits = stateStore.getAuditEventsForIncident('INC-2026-8841');
  const requiredStages = ['OBSERVE', 'INVESTIGATE', 'PROPOSE', 'APPROVE', 'EXECUTE', 'VERIFY'];
  const coveredStages = new Set(audits.map((a) => a.action_stage));
  const t12Passed = requiredStages.every((s) => coveredStages.has(s as any));
  results.push({
    id: 'TEST-12',
    name: 'Comprehensive Audit Trail Logging',
    category: 'Audit & Compliance',
    passed: t12Passed,
    input: { incident_id: 'INC-2026-8841' },
    expected: 'Full lifecycle stages logged: OBSERVE -> INVESTIGATE -> PROPOSE -> APPROVE -> EXECUTE -> VERIFY',
    actual: `Total audit events: ${audits.length}; Stages present: ${Array.from(coveredStages).join(', ')}`,
    evidence: `Latest event: [${audits[0]?.action_stage}] ${audits[0]?.summary}`,
    duration_ms: Math.round(performance.now() - t12Start),
  });

  // Scenario B full deterministic workflow: evidence, approved config rollback, and independent verification.
  const t13Start = performance.now();
  const scenarioB = await orchestrator.runInvestigation('INC-2026-9024');
  const scenarioBLogs = stateStore.getLogsForIncident('INC-2026-9024');
  const scenarioBLogIds = new Set(scenarioBLogs.map((log) => log.id));
  const scenarioBRunbookIds = new Set(stateStore.getAllRunbooks().map((runbook) => runbook.id));
  const scenarioBEvidenceValid = scenarioB.investigation.evidence_citations.length > 0 &&
    scenarioB.investigation.evidence_citations.every((citation) => scenarioBLogIds.has(citation.log_id)) &&
    scenarioB.investigation.hypotheses.every((hypothesis) =>
      hypothesis.supporting_evidence_ids.length > 0 &&
      hypothesis.supporting_evidence_ids.every((id) => scenarioBLogIds.has(id)) &&
      (!hypothesis.relevant_runbook_id || scenarioBRunbookIds.has(hypothesis.relevant_runbook_id))
    );
  const scenarioBPlanValid = scenarioB.proposal.action_type === 'SIMULATE_RESTORE_KNOWN_GOOD_CONFIG' &&
    scenarioB.investigation.hypotheses.some((hypothesis) => hypothesis.relevant_runbook_id === 'RBK-CONFIG-FAIL-02');
  const scenarioBApproval = await orchestrator.submitApproval(
    scenarioB.proposal.id, 'approved', 'test-operator@incidentiq.internal', 'Scenario B Test Operator',
    scenarioB.proposal.plan_hash, 'Deterministic scenario B sandbox regression test.'
  );
  const scenarioBExecution = await orchestrator.executeRemediation(scenarioB.proposal.id, 'Scenario B Test Sandbox');
  const scenarioBStoredApproval = stateStore.getApprovalForProposal(scenarioB.proposal.id);
  const scenarioBStoredAction = stateStore.getAction(scenarioBExecution.action.id);
  const scenarioBStoredVerification = stateStore.getVerificationForIncident('INC-2026-9024');
  const scenarioBAudit = stateStore.getAuditEventsForIncident('INC-2026-9024');
  const scenarioBAuditComplete = scenarioBAudit.some((event) => event.action_stage === 'PROPOSE' && event.details.proposal_id === scenarioB.proposal.id) &&
    scenarioBAudit.some((event) => event.action_stage === 'APPROVE' && event.details.proposal_id === scenarioB.proposal.id) &&
    scenarioBAudit.some((event) => event.action_stage === 'EXECUTE' && event.details.action_id === scenarioBExecution.action.id) &&
    scenarioBAudit.some((event) => event.action_stage === 'VERIFY' && event.details.verification_id === scenarioBExecution.verification.id);
  const scenarioBPassed = scenarioBEvidenceValid && scenarioBPlanValid &&
    scenarioBApproval.decision === 'approved' && scenarioBStoredApproval?.proposal_id === scenarioB.proposal.id &&
    scenarioBStoredAction?.proposal_id === scenarioB.proposal.id &&
    scenarioBExecution.action.action_type === 'SIMULATE_RESTORE_KNOWN_GOOD_CONFIG' &&
    scenarioBExecution.action.after_state.active_config_version === 'rev-2026.4.18-stable' &&
    scenarioBExecution.verification.status === 'VERIFIED_RECOVERED' &&
    scenarioBExecution.verification.criteria_results.length === scenarioB.proposal.verification_criteria.length &&
    scenarioBExecution.verification.criteria_results.every((criterion) => criterion.passed === true) &&
    scenarioBStoredVerification?.id === scenarioBExecution.verification.id && scenarioBAuditComplete;
  results.push({
    id: 'TEST-13',
    name: 'Scenario B End-to-End Config Recovery (Sandbox)',
    category: 'Scenario Coverage',
    passed: scenarioBPassed,
    input: { incident_id: 'INC-2026-9024', action_type: scenarioB.proposal.action_type },
    expected: 'Real seeded evidence and config runbook, human approval, allowlisted sandbox restore, all verifier gates and audit rows',
    actual: `Evidence valid: ${scenarioBEvidenceValid}; action: ${scenarioBExecution.action.execution_status}; verification: ${scenarioBExecution.verification.status}`,
    evidence: `Recovered version: ${scenarioBExecution.action.after_state.active_config_version}; gates passed: ${scenarioBExecution.verification.criteria_results.filter((criterion) => criterion.passed).length}/${scenarioBExecution.verification.criteria_results.length}`,
    duration_ms: Math.round(performance.now() - t13Start),
  });

  // Failed verification must remain a failure even if the sandbox action itself completed.
  const t14Start = performance.now();
  // The in-memory latest-record lookup sorts by timestamps, so keep this distinct from TEST-13.
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  const failedScenarioB = await orchestrator.runInvestigation('INC-2026-9024');
  await orchestrator.submitApproval(
    failedScenarioB.proposal.id, 'approved', 'test-operator@incidentiq.internal', 'Scenario B Test Operator',
    failedScenarioB.proposal.plan_hash, 'Negative verifier regression test.'
  );
  const failedScenarioBExecution = await orchestrator.executeRemediation(
    failedScenarioB.proposal.id, 'Scenario B Negative Test Sandbox', { forceVerificationFail: true }
  );
  const failedScenarioBPassed = failedScenarioBExecution.verification.status === 'RECOVERY_FAILED' &&
    failedScenarioBExecution.verification.criteria_results.length > 0 &&
    failedScenarioBExecution.verification.criteria_results.every((criterion) => criterion.passed === false) &&
    stateStore.getVerificationForIncident('INC-2026-9024')?.id === failedScenarioBExecution.verification.id;
  results.push({
    id: 'TEST-14',
    name: 'Scenario B Failed Verification Is Not Recovery',
    category: 'Verification Gate',
    passed: failedScenarioBPassed,
    input: { incident_id: 'INC-2026-9024', forced_verification_failure: true },
    expected: 'A failed independent verifier remains RECOVERY_FAILED and is stored as such',
    actual: `Action: ${failedScenarioBExecution.action.execution_status}; verification: ${failedScenarioBExecution.verification.status}`,
    evidence: `Failed gates: ${failedScenarioBExecution.verification.criteria_results.filter((criterion) => !criterion.passed).length}/${failedScenarioBExecution.verification.criteria_results.length}`,
    duration_ms: Math.round(performance.now() - t14Start),
  });

  const createApprovedTamperFixture = async (id: string): Promise<RemediationProposal> => {
    const source = invResultA.proposal;
    const proposal: RemediationProposal = {
      ...structuredClone(source),
      id,
      parameters: structuredClone(source.parameters),
      verification_criteria: structuredClone(source.verification_criteria),
      plan_hash: '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    proposal.plan_hash = computePlanHash(proposal);
    stateStore.createProposal(proposal);
    await orchestrator.submitApproval(
      proposal.id, 'approved', 'test-operator@incidentiq.internal', 'Plan Integrity Test Operator',
      proposal.plan_hash, 'Plan-integrity tampering regression test.'
    );
    return proposal;
  };

  const runTamperTest = async (
    id: string,
    mutate: (proposal: RemediationProposal) => void
  ): Promise<boolean> => {
    const proposal = await createApprovedTamperFixture(id);
    const storedProposal = stateStore.getProposal(id)!;
    mutate(storedProposal);
    const executionAuditCountBefore = stateStore.getAuditEventsForIncident(proposal.incident_id)
      .filter((event) => event.action_stage === 'EXECUTE').length;
    let blocked = false;
    try {
      await orchestrator.executeRemediation(id, 'Plan Integrity Test Sandbox');
    } catch (error) {
      blocked = error instanceof Error && error.message.includes('plan integrity verification failed');
    }
    const auditRecorded = stateStore.getAuditEventsForIncident(proposal.incident_id).some((event) =>
      event.action_stage === 'REJECT' && event.details.proposal_id === id && event.details.reason === 'plan_integrity_check_failed'
    );
    const executionAuditCountAfter = stateStore.getAuditEventsForIncident(proposal.incident_id)
      .filter((event) => event.action_stage === 'EXECUTE').length;
    return blocked && auditRecorded && executionAuditCountAfter === executionAuditCountBefore;
  };

  const t15Start = performance.now();
  const actionTamperBlocked = await runTamperTest('PROP-TEST-TAMPER-ACTION', (proposal) => {
    proposal.action_type = 'SIMULATE_RELEASE_STALE_CONNECTIONS';
  });
  results.push({
    id: 'TEST-15', name: 'Action Mutation After Approval Is Blocked', category: 'Security & Integrity',
    passed: actionTamperBlocked, input: { field: 'action_type' },
    expected: 'Mutated action fails recomputed hash and creates a sanitized rejection audit event',
    actual: actionTamperBlocked ? 'Execution blocked and rejection audit recorded' : 'Tampered plan was not blocked',
    evidence: 'No sandbox action is executed after the mismatch.', duration_ms: Math.round(performance.now() - t15Start),
  });

  const t16Start = performance.now();
  const parameterTamperBlocked = await runTamperTest('PROP-TEST-TAMPER-PARAMETERS', (proposal) => {
    proposal.parameters.new_limit = 75;
  });
  results.push({
    id: 'TEST-16', name: 'Parameter Mutation After Approval Is Blocked', category: 'Security & Integrity',
    passed: parameterTamperBlocked, input: { field: 'parameters.new_limit' },
    expected: 'Mutated parameter fails recomputed hash and creates a sanitized rejection audit event',
    actual: parameterTamperBlocked ? 'Execution blocked and rejection audit recorded' : 'Tampered plan was not blocked',
    evidence: 'No sandbox action is executed after the mismatch.', duration_ms: Math.round(performance.now() - t16Start),
  });

  const t17Start = performance.now();
  const criteriaTamperBlocked = await runTamperTest('PROP-TEST-TAMPER-CRITERIA', (proposal) => {
    proposal.verification_criteria[0].threshold_value = 100;
  });
  results.push({
    id: 'TEST-17', name: 'Verification Criteria Mutation After Approval Is Blocked', category: 'Security & Integrity',
    passed: criteriaTamperBlocked, input: { field: 'verification_criteria[0].threshold_value' },
    expected: 'Mutated verification criteria fail recomputed hash and create a sanitized rejection audit event',
    actual: criteriaTamperBlocked ? 'Execution blocked and rejection audit recorded' : 'Tampered plan was not blocked',
    evidence: 'No sandbox action is executed after the mismatch.', duration_ms: Math.round(performance.now() - t17Start),
  });

  const t18Start = performance.now();
  const pendingProposal = stateStore.createProposal({
    ...structuredClone(invResultA.proposal),
    id: 'PROP-TEST-NO-APPROVAL', status: 'pending', created_at: new Date().toISOString(),
  });
  let missingApprovalBlocked = false;
  try {
    await orchestrator.executeRemediation(pendingProposal.id, 'No Approval Test Sandbox');
  } catch (error) {
    missingApprovalBlocked = error instanceof Error && error.message.includes('is not approved');
  }
  results.push({
    id: 'TEST-18', name: 'Execution Without Approval Is Blocked', category: 'Human-in-the-Loop',
    passed: missingApprovalBlocked, input: { proposal_id: pendingProposal.id },
    expected: 'Pending proposal cannot execute without an approved human decision',
    actual: missingApprovalBlocked ? 'Execution blocked before sandbox action' : 'Execution was not blocked',
    evidence: 'Proposal remains pending and no action is created.', duration_ms: Math.round(performance.now() - t18Start),
  });

  // Frontend API boundary tests use mocked fetch responses and never contact a service.
  const originalFetch = globalThis.fetch;
  const apiAssertions: boolean[] = [];
  const mockFetch = (body: string, status = 200) => {
    globalThis.fetch = (async () => new Response(body, { status, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
  };
  try {
    mockFetch(JSON.stringify({ error: 'sensitive provider content must not be returned' }), 503);
    try { await fetchIncidents(); } catch (error) { apiAssertions.push(error instanceof Error && error.message === 'Incident list failed (HTTP 503).'); }
    mockFetch(JSON.stringify({ runbooks: 'not-an-array' }));
    try { await fetchRunbooks(); } catch (error) { apiAssertions.push(error instanceof Error && error.message.includes('invalid runbooks list')); }
    mockFetch(JSON.stringify({ error: 'sensitive provider content must not be returned' }), 502);
    try { await fetchAllAudit(); } catch (error) { apiAssertions.push(error instanceof Error && error.message === 'Audit history failed (HTTP 502).'); }
    mockFetch(JSON.stringify({}));
    try {
      await createIncident({ title: 'Test incident', description: 'Synthetic test description', severity: 'low', service_name: 'test-service' });
    } catch (error) { apiAssertions.push(error instanceof Error && error.message.includes('no valid incident record')); }
  } finally {
    globalThis.fetch = originalFetch;
  }
  results.push({
    id: 'TEST-19', name: 'Frontend API Errors and Payload Validation', category: 'API Reliability',
    passed: apiAssertions.length === 4 && apiAssertions.every(Boolean), input: { cases: 4 },
    expected: 'Failed HTTP responses and malformed successful responses throw sanitized errors',
    actual: `${apiAssertions.filter(Boolean).length}/4 mocked response cases rejected safely`,
    evidence: 'Mock response body content is not included in thrown errors.', duration_ms: 0,
  });

  const passed_tests = results.filter((r) => r.passed).length;
  const failed_tests = results.length - passed_tests;

  return {
    timestamp: new Date().toISOString(),
    total_tests: results.length,
    passed_tests,
    failed_tests,
    suite_status: failed_tests === 0 ? 'PASSED' : 'FAILED',
    results,
  };
}

export async function runAutomatedTests(): Promise<AutomatedTestReport> {
  setPersistenceTestMode(true);
  setGeminiTestMode(true);
  try {
    return await runAutomatedTestsInMemory();
  } finally {
    setGeminiTestMode(false);
    setPersistenceTestMode(false);
  }
}
