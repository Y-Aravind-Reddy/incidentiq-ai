import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateStore } from '../src/agent/state.ts';
import { runGeminiInvestigation } from '../src/agent/gemini.ts';

export async function testInvestigation(): Promise<boolean> {
  const incident = stateStore.getIncident('INC-2026-8841')!;
  const logs = stateStore.getLogsForIncident('INC-2026-8841');
  const runbooks = stateStore.getAllRunbooks();

  console.log('Testing investigation with Gemini API...');
  const start = Date.now();
  try {
    const result = await runGeminiInvestigation(incident, logs, runbooks);
    console.log(`Investigation completed in ${Date.now() - start}ms:`);
    console.log('Reasoner:', result.reasoner);
    console.log('Model:', result.model_name);
    console.log('Fallback reason:', result.fallback_reason ?? 'none');
    console.log('Provider HTTP status:', result.provider_status ?? 'unavailable');
    console.log('Provider error class:', result.provider_error_class ?? 'unavailable');
    console.log('Sanitized provider code:', result.provider_code ?? 'unavailable');

    // Verify all cited log IDs exist
    const logIds = new Set(logs.map(l => l.id));
    const allCitationsValid = result.output.hypotheses.every(h =>
      h.supporting_evidence_ids.every(id => logIds.has(id))
    ) && result.output.evidence_citations.every(citation => logIds.has(citation.log_id));
    console.log('All evidence citations valid and exist in logs?:', allCitationsValid);

    // Verify runbook exists
    const rbIds = new Set(runbooks.map(r => r.id));
    const runbookValid = result.output.hypotheses.every(h => !h.relevant_runbook_id || rbIds.has(h.relevant_runbook_id));
    console.log('Runbook reference valid and exists in library?:', runbookValid);
    return result.reasoner === 'gemini' && allCitationsValid && runbookValid;
  } catch (err: any) {
    console.error('Investigation validation failed:', err instanceof Error ? err.name : 'UnknownError');
    return false;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  testInvestigation().then((passed) => { if (!passed) process.exitCode = 1; });
}
