import { stateStore } from '../agent/state.ts';
import { runGeminiInvestigation, type GeminiGenerator } from '../agent/gemini.ts';
import type { InvestigationOutput } from '../agent/prompts.ts';
import type { TestResultItem } from './agent.test.ts';

function validPayload(logId: string, runbookId: string): InvestigationOutput {
  return {
    summary: 'A synthetic incident is associated with the retrieved error evidence.',
    confidence_score: 0.8,
    uncertainty_explanation: 'This synthetic result needs further operator review.',
    missing_information: [],
    alternative_explanations: [],
    hypotheses: [{
      rank: 1, title: 'Synthetic cause', root_cause: 'A synthetic configuration issue.', confidence: 0.8,
      rationale: `Retrieved log ${logId} supports this synthetic hypothesis.`, supporting_evidence_ids: [logId],
      recommended_remediation_action: 'SIMULATE_RESTORE_KNOWN_GOOD_CONFIG', relevant_runbook_id: runbookId, risk_level: 'LOW',
    }],
    evidence_citations: [{ log_id: logId, relevance: 'HIGH', correlation_rationale: 'This retrieved synthetic log is relevant.' }],
    recommended_proposal: {
      action_type: 'SIMULATE_RESTORE_KNOWN_GOOD_CONFIG', parameters: { target_version: 'synthetic' }, risk_level: 'LOW',
      expected_effect: 'Restore a synthetic known-good configuration.', rollback_instructions: 'Return to the prior sandbox state.',
      verification_criteria: [{ metric: 'http_500_error_rate_pct', target_condition: '<=', threshold_value: 0.5 }],
    },
  };
}

export async function runGeminiValidationTests(): Promise<TestResultItem[]> {
  const incident = stateStore.getIncident('INC-2026-9024')!;
  const logs = stateStore.getLogsForIncident(incident.id);
  const runbooks = stateStore.getAllRunbooks();
  const good = validPayload(logs[0].id, runbooks[0].id);
  const mock = (value: string): GeminiGenerator => async () => ({ text: value });
  const cases: Array<{ id: string; name: string; generator: GeminiGenerator; expectedReasoner: string; reason?: string }> = [
    { id: 'GEMINI-01', name: 'Valid structured Gemini response', generator: mock(JSON.stringify(good)), expectedReasoner: 'gemini' },
    { id: 'GEMINI-02', name: 'Malformed JSON uses explicit fallback', generator: mock('{broken'), expectedReasoner: 'deterministic', reason: 'malformed_json' },
    { id: 'GEMINI-03', name: 'Schema mismatch and enum rejection', generator: mock(JSON.stringify({ ...good, hypotheses: [{ ...good.hypotheses[0], recommended_remediation_action: 'RUN_SHELL' }] })), expectedReasoner: 'deterministic', reason: 'schema_mismatch' },
    { id: 'GEMINI-04', name: 'Provider authentication errors are classified safely', generator: async () => { throw Object.assign(new Error('redacted mock detail'), { status: 401 }); }, expectedReasoner: 'deterministic', reason: 'authentication' },
    { id: 'GEMINI-05', name: 'Fabricated evidence citation rejected', generator: mock(JSON.stringify(validPayload('NOT-RETRIEVED', runbooks[0].id))), expectedReasoner: 'deterministic', reason: 'invalid_evidence' },
    { id: 'GEMINI-06', name: 'Empty response uses explicit fallback', generator: mock('  '), expectedReasoner: 'deterministic', reason: 'empty_response' },
    { id: 'GEMINI-07', name: 'Nested timeout code is classified without provider details', generator: async () => { throw new TypeError('redacted', { cause: Object.assign(new Error('redacted'), { code: 'ETIMEDOUT' }) }); }, expectedReasoner: 'deterministic', reason: 'timeout' },
    { id: 'GEMINI-08', name: 'Fetch failure is classified as network or TLS', generator: async () => { throw new TypeError('redacted'); }, expectedReasoner: 'deterministic', reason: 'network_or_tls' },
    { id: 'GEMINI-09', name: 'SDK abort deadline is classified as timeout', generator: async () => { throw new DOMException('redacted', 'AbortError'); }, expectedReasoner: 'deterministic', reason: 'timeout' },
  ];
  const results: TestResultItem[] = [];
  for (const test of cases) {
    const started = performance.now();
    let pass = false;
    let actual = 'No result';
    try {
      const result = await runGeminiInvestigation(incident, logs, runbooks, test.generator);
      actual = `${result.reasoner}${result.fallback_reason ? ` (${result.fallback_reason})` : ''}`;
      pass = result.reasoner === test.expectedReasoner && (!test.reason || result.fallback_reason === test.reason);
    } catch (error) {
      actual = error instanceof Error ? error.message : 'Unknown error';
    }
    results.push({
      id: test.id, name: test.name, category: 'Gemini Validation', passed: pass,
      input: { mock: true }, expected: `${test.expectedReasoner}${test.reason ? ` with ${test.reason}` : ''}`,
      actual, evidence: pass ? 'Mocked response was explicitly accepted or rejected as expected.' : 'Mocked response did not follow the expected validation path.',
      duration_ms: Math.round(performance.now() - started),
    });
  }
  return results;
}
