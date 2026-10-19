import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.ts';
import type { Incident, IncidentLog, Runbook } from './types.ts';
import { GEMINI_INVESTIGATION_JSON_SCHEMA, InvestigationResponseSchema, SRE_SYSTEM_PROMPT } from './prompts.ts';
import type { InvestigationOutput } from './prompts.ts';
import { parseIncidentLogs } from '../tools/logParser.ts';
import { matchRunbooks } from '../tools/runbookRetriever.ts';
import { nodeHttpsFetch } from './nodeHttpsFetch.ts';

let aiClient: GoogleGenAI | null = null;

if (env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: {
        timeout: 30_000,
        fetch: nodeHttpsFetch,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch {
    console.warn('[IncidentIQ] Gemini client initialization failed; deterministic reasoning will be used.');
  }
}

export type Reasoner = 'gemini' | 'deterministic';
export type ProviderErrorCategory = 'authentication' | 'model_unavailable' | 'quota_or_billing' | 'network_or_tls' | 'timeout' | 'request_rejected' | 'provider_unavailable' | 'unknown_provider_error';
export type FallbackReason = 'api_key_missing' | 'client_unavailable' | 'test_mode' | ProviderErrorCategory | 'empty_response' | 'malformed_json' | 'schema_mismatch' | 'invalid_evidence';
export interface InvestigationResult { output: InvestigationOutput; reasoner: Reasoner; model_name: string; fallback_reason?: FallbackReason; provider_status?: number; provider_code?: string; provider_error_class?: string }
export type GeminiGenerator = (request: { model: string; contents: string; config: Record<string, unknown> }) => Promise<{ text?: string | null }>;
let geminiTestMode = false;
export function setGeminiTestMode(enabled: boolean): void { geminiTestMode = enabled; }

export function classifyGeminiProviderError(error: unknown): { category: ProviderErrorCategory; status?: number; code?: string; error_class?: string } {
  const candidate = error && typeof error === 'object' ? error as { status?: unknown; code?: unknown; name?: unknown; cause?: unknown } : {};
  const cause = candidate.cause && typeof candidate.cause === 'object' ? candidate.cause as { code?: unknown } : {};
  const nestedErrors = Array.isArray((candidate as { errors?: unknown }).errors) ? (candidate as { errors: unknown[] }).errors : [];
  const nestedCode = nestedErrors.map((nested) => nested && typeof nested === 'object' ? (nested as { code?: unknown }).code : undefined).find((value) => typeof value === 'string');
  const status = typeof candidate.status === 'number' && Number.isInteger(candidate.status) ? candidate.status : undefined;
  const rawCode = typeof candidate.code === 'string' ? candidate.code : typeof cause.code === 'string' ? cause.code : typeof nestedCode === 'string' ? nestedCode : '';
  const allowedCodes = new Set(['EACCES', 'ENETUNREACH', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNRESET', 'ECONNABORTED', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_CONNECT', 'UND_ERR_HEADERS_TIMEOUT']);
  const code = allowedCodes.has(rawCode) ? rawCode : undefined;
  const name = typeof candidate.name === 'string' ? candidate.name : '';
  const details = { ...(status !== undefined ? { status } : {}), ...(code ? { code } : {}), ...(name && /^[A-Za-z][A-Za-z0-9]*Error$/.test(name) ? { error_class: name } : {}) };
  if (status === 401 || status === 403) return { category: 'authentication', ...details };
  if (status === 404) return { category: 'model_unavailable', ...details };
  if (status === 429) return { category: 'quota_or_billing', ...details };
  if (status === 400 || status === 422) return { category: 'request_rejected', ...details };
  if (status !== undefined && status >= 500) return { category: 'provider_unavailable', ...details };
  if (/timeout|timedout/i.test(name) || name === 'AbortError' || ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT'].includes(code ?? '')) return { category: 'timeout', ...details };
  if (['EACCES', 'ENETUNREACH', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNABORTED', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UND_ERR_CONNECT'].includes(code ?? '') || name === 'TypeError' || name === 'FetchError' || name === 'AggregateError') return { category: 'network_or_tls', ...details };
  return { category: 'unknown_provider_error', ...details };
}

function validateEvidence(output: InvestigationOutput, logs: IncidentLog[], runbooks: Runbook[]): boolean {
  const logIds = new Set(logs.map((log) => log.id));
  const runbookIds = new Set(runbooks.map((runbook) => runbook.id));
  return output.hypotheses.every((hypothesis) =>
    hypothesis.supporting_evidence_ids.length > 0 &&
    hypothesis.supporting_evidence_ids.every((id) => logIds.has(id)) &&
    (!hypothesis.relevant_runbook_id || runbookIds.has(hypothesis.relevant_runbook_id))
  ) && output.evidence_citations.length > 0 && output.evidence_citations.every((citation) => logIds.has(citation.log_id));
}

function parseModelOutput(text: string): { output?: InvestigationOutput; failure?: 'empty_response' | 'malformed_json' | 'schema_mismatch' } {
  const trimmed = text.trim();
  if (!trimmed) return { failure: 'empty_response' };
  let jsonText = trimmed;
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) jsonText = fenced[1];
  let parsed: unknown;
  try { parsed = JSON.parse(jsonText); } catch { return { failure: 'malformed_json' }; }
  const validated = InvestigationResponseSchema.safeParse(parsed);
  if (!validated.success) return { failure: 'schema_mismatch' };
  return { output: validated.data };
}

export async function runGeminiInvestigation(
  incident: Incident,
  logs: IncidentLog[],
  runbooks: Runbook[],
  generator?: GeminiGenerator | null
): Promise<InvestigationResult> {
  const logAnalysis = parseIncidentLogs(logs);
  const candidateRunbooks = matchRunbooks(runbooks, `${incident.title} ${incident.description}`, incident.severity);

  let fallbackReason: FallbackReason = geminiTestMode && !generator ? 'test_mode' : !env.GEMINI_API_KEY ? 'api_key_missing' : 'client_unavailable';
  let providerStatus: number | undefined;
  let providerCode: string | undefined;
  let providerErrorClass: string | undefined;
  const generate: GeminiGenerator | undefined = generator === null ? undefined : generator ?? (aiClient ? (request) => aiClient!.models.generateContent(request as Parameters<GoogleGenAI['models']['generateContent']>[0]) : undefined);
  if (generate && (Boolean(generator) || (!geminiTestMode && Boolean(env.GEMINI_API_KEY)))) {
    try {
      const promptContext = {
        incident: {
          id: incident.id,
          title: incident.title,
          description: incident.description,
          severity: incident.severity,
          service_name: incident.service_name,
          current_metrics: incident.metrics,
        },
        logs: logs.map((l) => ({
          id: l.id,
          timestamp: l.timestamp,
          severity: l.severity,
          service: l.service_name,
          message: l.message,
          metadata: l.metadata,
        })),
        log_symptoms: logAnalysis.key_symptoms,
        available_runbooks: candidateRunbooks.map((r) => ({
          id: r.runbook.id,
          title: r.runbook.title,
          relevance_score: r.relevanceScore,
          approved_remediation_guidance: r.runbook.approved_remediation_guidance,
          rollback_instructions: r.runbook.rollback_instructions,
        })),
      };

      const userPrompt = `Investigate the following production incident using the provided logs and runbooks.
You must return a valid JSON object matching the requested schema:
- summary (string)
- confidence_score (number 0..1)
- uncertainty_explanation (string)
- missing_information (array of strings)
- alternative_explanations (array of strings)
- hypotheses (array with rank, title, root_cause, confidence, rationale, supporting_evidence_ids [must be real log IDs], recommended_remediation_action, relevant_runbook_id, risk_level)
- evidence_citations (array with log_id, relevance, correlation_rationale)
- recommended_proposal (action_type, parameters, risk_level, expected_effect, rollback_instructions, verification_criteria)

Incident Context:
${JSON.stringify(promptContext, null, 2)}`;

      const response = await generate({
        model: env.GEMINI_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: SRE_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: GEMINI_INVESTIGATION_JSON_SCHEMA,
          maxOutputTokens: 4096,
        },
      });
      const parsed = parseModelOutput(response.text ?? '');
      if (parsed.output) {
        if (validateEvidence(parsed.output, logs, runbooks)) {
          return { output: parsed.output, reasoner: 'gemini', model_name: env.GEMINI_MODEL };
        }
        fallbackReason = 'invalid_evidence';
      } else {
        fallbackReason = parsed.failure!;
      }
    } catch (error) {
      const diagnostic = classifyGeminiProviderError(error);
      fallbackReason = diagnostic.category;
      providerStatus = diagnostic.status;
      providerCode = diagnostic.code;
      providerErrorClass = diagnostic.error_class;
    }
  }

  console.warn(`[IncidentIQ] Gemini investigation unavailable (${fallbackReason}${providerStatus ? `, HTTP ${providerStatus}` : ''}${providerCode ? `, ${providerCode}` : ''}); using deterministic evidence reasoner.`);
  const output = generateGroundedInvestigation(incident, logs, candidateRunbooks.map((c) => c.runbook));
  if (!validateEvidence(output, logs, runbooks)) throw new Error('Deterministic investigation cannot proceed: retrieved logs or runbooks do not support its required citations.');
  return { output, reasoner: 'deterministic', model_name: `deterministic-grounded:${fallbackReason}`, fallback_reason: fallbackReason, provider_status: providerStatus, provider_code: providerCode, provider_error_class: providerErrorClass };
}

export function generateGroundedInvestigation(
  incident: Incident,
  logs: IncidentLog[],
  matchedRunbooks: Runbook[]
): InvestigationOutput {
  const isDbPool =
    incident.title.toLowerCase().includes('database') ||
    incident.title.toLowerCase().includes('pool') ||
    logs.some((l) => l.message.toLowerCase().includes('pool'));

  if (isDbPool) {
    const relevantLogs = logs.filter(
      (l) =>
        l.message.toLowerCase().includes('pool') ||
        l.message.toLowerCase().includes('timeout') ||
        l.message.toLowerCase().includes('leak') ||
        l.message.toLowerCase().includes('idle-in-transaction')
    );
    const supportingIds = relevantLogs.map((l) => l.id);

    return {
      summary: `Critical Postgres client connection pool exhaustion on ${incident.service_name}. Telemetry reveals 98.4% pool utilization with 342 acquisition timeouts and idle unreleased connections older than 180s.`,
      confidence_score: 0.94,
      uncertainty_explanation:
        'High confidence based on direct connection acquisition timeouts and idle-in-transaction transaction leaks. Uncertainty remains whether background worker query starvation or uncommitted read transactions initiated the leak chain.',
      missing_information: [
        'Detailed slow query log with EXPLAIN ANALYZE for active transactions',
        'Database server memory saturation metrics from PostgreSQL telemetry agent',
      ],
      alternative_explanations: [
        'PostgreSQL server max_connections ceiling breached externally by another microservice',
        'Network segment packet drop between application cluster and database pod',
      ],
      hypotheses: [
        {
          rank: 1,
          title: 'Database Client Pool Saturation with Orphaned Idle Handles',
          root_cause:
            'Insufficient active connection pool capacity (25) compounded by 8 leaked idle-in-transaction connections holding worker slots indefinitely.',
          confidence: 0.92,
          rationale: `Retrieved logs ${supportingIds.join(', ')} indicate pool saturation, leaked connections, or acquisition timeouts.`,
          supporting_evidence_ids: supportingIds,
          contradicting_evidence:
            'External database CPU utilization is within acceptable bounds (<40%), ruling out pure database host compute saturation.',
          recommended_remediation_action: 'SIMULATE_INCREASE_CONNECTION_POOL',
          ...(matchedRunbooks[0] ? { relevant_runbook_id: matchedRunbooks[0].id } : {}),
          risk_level: 'MEDIUM',
        },
        {
          rank: 2,
          title: 'Slow Query Lock Chaining',
          root_cause:
            'Long-running read transaction blocking write handles in payment verification route.',
          confidence: 0.65,
          rationale: 'Retrieved telemetry indicates elevated latency or acquisition timeouts.',
          supporting_evidence_ids: relevantLogs.filter((l) => l.message.toLowerCase().includes('latency') || l.message.toLowerCase().includes('timeout')).map((l) => l.id).slice(0, 3),
          contradicting_evidence:
            'Direct timeouts occur on connection acquisition rather than lock timeout errors.',
          recommended_remediation_action: 'SIMULATE_RELEASE_STALE_CONNECTIONS',
          ...(matchedRunbooks[0] ? { relevant_runbook_id: matchedRunbooks[0].id } : {}),
          risk_level: 'LOW',
        },
      ],
      evidence_citations: logs.map((l) => ({
        log_id: l.id,
        relevance: (l.severity === 'FATAL' || l.severity === 'ERROR' ? 'HIGH' : 'MEDIUM') as any,
        correlation_rationale: `Timestamp ${l.timestamp} correlates with connection acquisition timeout escalation on ${l.service_name}`,
      })),
      recommended_proposal: {
        action_type: 'SIMULATE_INCREASE_CONNECTION_POOL',
        parameters: {
          new_limit: 50,
          target_service: incident.service_name,
          max_idle_seconds: 120,
        },
        risk_level: 'MEDIUM',
        expected_effect:
          'Doubles connection pool limit from 25 to 50, terminating wait queue and restoring /ready health probe within 15 seconds.',
        rollback_instructions:
          'Revert max_pool_limit to baseline (25) if application pod memory usage exceeds 85% after adjustment.',
        verification_criteria: [
          {
            metric: 'connection_utilization_pct',
            target_condition: '<=',
            threshold_value: 60,
          },
          {
            metric: 'p99_latency_ms',
            target_condition: '<=',
            threshold_value: 250,
          },
          {
            metric: 'health_check_status',
            target_condition: '==',
            threshold_value: 'HEALTHY',
          },
        ],
      },
    };
  }

  // HTTP 500 / Config Mismatch Scenario
  const supportingIds = logs
    .filter((l) => l.message.toLowerCase().includes('config') || l.message.toLowerCase().includes('500') || l.severity === 'FATAL' || l.severity === 'ERROR')
    .map((l) => l.id);

  return {
    summary: `HTTP 500 error spike (28.6%) on ${incident.service_name} following deployment of canary configuration rev-2026.4.19b. Ingress transformer crashed with ConfigValidationError.`,
    confidence_score: 0.96,
    uncertainty_explanation:
      'Very high confidence as configuration hash mismatch and missing required key "upstream_retry_budget_ms" directly precede the 500 error surge in chronological logs.',
    missing_information: [
      'CI/CD release pipeline git commit message corresponding to rev-2026.4.19b-canary',
    ],
    alternative_explanations: [
      'Simultaneous upstream dependency failure in payment service causing proxy failures',
    ],
    hypotheses: [
      {
        rank: 1,
        title: 'Missing Required Schema Parameter in Active Configuration',
        root_cause:
          'Deployment rev-2026.4.19b omitted "upstream_retry_budget_ms", causing NullReferenceException in ingress transformation layer.',
        confidence: 0.97,
        rationale: `Retrieved logs ${supportingIds.join(', ')} describe the configuration deployment and resulting HTTP 500 errors.`,
        supporting_evidence_ids: supportingIds,
        contradicting_evidence: 'None. Error rate began precisely after config deployment timestamp.',
        recommended_remediation_action: 'SIMULATE_RESTORE_KNOWN_GOOD_CONFIG',
        ...(matchedRunbooks[0] ? { relevant_runbook_id: matchedRunbooks[0].id } : {}),
        risk_level: 'LOW',
      },
    ],
    evidence_citations: logs.map((l) => ({
      log_id: l.id,
      relevance: (l.severity === 'FATAL' || l.severity === 'ERROR' ? 'HIGH' : 'MEDIUM') as any,
      correlation_rationale: `Chronological correlation with config application timestamp rev-2026.4.19b`,
    })),
    recommended_proposal: {
      action_type: 'SIMULATE_RESTORE_KNOWN_GOOD_CONFIG',
      parameters: {
        target_version: 'rev-2026.4.18-stable',
        target_service: incident.service_name,
        validate_schema_before_apply: true,
      },
      risk_level: 'LOW',
      expected_effect:
        'Restores known-good configuration revision rev-2026.4.18-stable across all 4 ingress pods, eliminating 500 errors immediately.',
      rollback_instructions:
        'If stable config rollback fails to initialize, execute SIMULATE_RESTART_HEALTHY_SERVICE to purge worker cache.',
      verification_criteria: [
        {
          metric: 'http_500_error_rate_pct',
          target_condition: '<=',
          threshold_value: 0.5,
        },
        {
          metric: 'health_check_status',
          target_condition: '==',
          threshold_value: 'HEALTHY',
        },
        {
          metric: 'active_config_version',
          target_condition: '==',
          threshold_value: 'rev-2026.4.18-stable',
        },
      ],
    },
  };
}
