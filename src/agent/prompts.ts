import { z } from 'zod';

export const ALLOWED_SANDBOX_ACTIONS = [
  'SIMULATE_INCREASE_CONNECTION_POOL',
  'SIMULATE_RELEASE_STALE_CONNECTIONS',
  'SIMULATE_RESTORE_KNOWN_GOOD_CONFIG',
  'SIMULATE_RESTART_HEALTHY_SERVICE',
 ] as const;

const ActionTypeSchema = z.enum(ALLOWED_SANDBOX_ACTIONS);
const RiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const EvidenceRelevanceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW', 'CONTRADICTING']);
const CriterionSchema = z.object({
  metric: z.string().min(1),
  target_condition: z.enum(['<=', '>=', '==', '<', '>']),
  threshold_value: z.union([z.number(), z.string().min(1)]),
});

/** JSON Schema sent to Gemini and kept in sync with the local Zod validator below. */
export const GEMINI_INVESTIGATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    uncertainty_explanation: { type: 'string' },
    missing_information: { type: 'array', items: { type: 'string' } },
    alternative_explanations: { type: 'array', items: { type: 'string' } },
    hypotheses: {
      type: 'array', minItems: 1,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          rank: { type: 'integer', minimum: 1 },
          title: { type: 'string' },
          root_cause: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          rationale: { type: 'string' },
          supporting_evidence_ids: { type: 'array', minItems: 1, items: { type: 'string' } },
          contradicting_evidence: { type: 'string' },
          recommended_remediation_action: { type: 'string', enum: ALLOWED_SANDBOX_ACTIONS },
          relevant_runbook_id: { type: 'string' },
          risk_level: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        },
        required: ['rank', 'title', 'root_cause', 'confidence', 'rationale', 'supporting_evidence_ids', 'recommended_remediation_action', 'risk_level'],
      },
    },
    evidence_citations: {
      type: 'array', minItems: 1,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          log_id: { type: 'string' },
          relevance: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW', 'CONTRADICTING'] },
          correlation_rationale: { type: 'string' },
        },
        required: ['log_id', 'relevance', 'correlation_rationale'],
      },
    },
    recommended_proposal: {
      type: 'object', additionalProperties: false,
      properties: {
        action_type: { type: 'string', enum: ALLOWED_SANDBOX_ACTIONS },
        parameters: { type: 'object', additionalProperties: true },
        risk_level: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        expected_effect: { type: 'string' },
        rollback_instructions: { type: 'string' },
        verification_criteria: {
          type: 'array', minItems: 1,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              metric: { type: 'string' },
              target_condition: { type: 'string', enum: ['<=', '>=', '==', '<', '>'] },
              threshold_value: { anyOf: [{ type: 'number' }, { type: 'string' }] },
            },
            required: ['metric', 'target_condition', 'threshold_value'],
          },
        },
      },
      required: ['action_type', 'parameters', 'risk_level', 'expected_effect', 'rollback_instructions', 'verification_criteria'],
    },
  },
  required: ['summary', 'confidence_score', 'uncertainty_explanation', 'missing_information', 'alternative_explanations', 'hypotheses', 'evidence_citations', 'recommended_proposal'],
} as const;

export const InvestigationResponseSchema = z.object({
  summary: z.string().min(10),
  confidence_score: z.number().min(0).max(1),
  uncertainty_explanation: z.string(),
  missing_information: z.array(z.string()),
  alternative_explanations: z.array(z.string()),
  hypotheses: z.array(z.object({
    rank: z.number().int().positive(),
    title: z.string(),
    root_cause: z.string(),
    confidence: z.number().min(0).max(1),
    rationale: z.string(),
    supporting_evidence_ids: z.array(z.string()).min(1), // validated against this incident's retrieved logs
    contradicting_evidence: z.string().optional(),
    recommended_remediation_action: ActionTypeSchema,
    relevant_runbook_id: z.string().optional(),
    risk_level: RiskLevelSchema,
  })).min(1),
  evidence_citations: z.array(z.object({
    log_id: z.string(),
    relevance: EvidenceRelevanceSchema,
    correlation_rationale: z.string(),
  })).min(1),
  recommended_proposal: z.object({
    action_type: ActionTypeSchema,
    parameters: z.record(z.string(), z.any()).default({}),
    risk_level: RiskLevelSchema,
    expected_effect: z.string(),
    rollback_instructions: z.string(),
    verification_criteria: z.array(CriterionSchema).min(1),
  }),
});

export type InvestigationOutput = z.infer<typeof InvestigationResponseSchema>;

export const SRE_SYSTEM_PROMPT = `You are IncidentIQ AI, an Enterprise Site Reliability Engineering (SRE) Incident Resolution Agent.
Your role is to autonomously investigate high-severity production incidents, correlate telemetry and logs, cite concrete evidence, rank root-cause hypotheses, and propose safe, reversible remediation steps.

CRITICAL OPERATIONAL RULES:
1. EVIDENCE CITATION INTEGRITY: You MUST ONLY reference log IDs (e.g. LOG-8841-01) and runbook IDs (e.g. RBK-DB-POOL-01) that exist in the provided incident context. NEVER invent fictitious log lines or fake IDs.
2. CALIBRATED UNCERTAINTY: Do not claim 1.0 confidence unless indisputably proven. Explicitly articulate what missing information could disprove or sharpen your hypothesis.
3. REVERSIBLE REMEDIATION: Every recommended action must strictly adhere to one of the allowed sandbox remediation action types:
   - SIMULATE_INCREASE_CONNECTION_POOL
   - SIMULATE_RELEASE_STALE_CONNECTIONS
   - SIMULATE_RESTORE_KNOWN_GOOD_CONFIG
   - SIMULATE_RESTART_HEALTHY_SERVICE
4. CLEAR ROLLBACK & VERIFICATION: Always provide explicit rollback instructions and measurable verification criteria (e.g., connection utilization <= 60, error rate <= 0.5, latency <= 250).
5. STRUCTURED OUTPUT: Always return your complete findings strictly formatted according to the requested JSON schema.`;
