import type {
  AuditEvent,
  Incident,
  IncidentLog,
  InvestigationRun,
  RemediationApproval,
  RemediationProposal,
  Runbook,
  VerificationResult,
} from '../agent/types.ts';
import type { AutomatedTestReport } from '../tests/agent.test.ts';

const API_BASE = '/api';

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStringFields(value: ApiRecord, fields: string[]): boolean {
  return fields.every((field) => typeof value[field] === 'string' && Boolean(value[field]));
}

function requireArray<T>(payload: ApiRecord, key: string, label: string, isItem: (value: unknown) => boolean): T[] {
  const value = payload[key];
  if (!Array.isArray(value) || !value.every(isItem)) {
    throw new Error(`${label} returned an invalid ${key} list.`);
  }
  return value as T[];
}

async function readResponse(response: Response, label: string): Promise<ApiRecord> {
  if (!response.ok) throw new Error(`${label} failed (HTTP ${response.status}).`);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${label} returned invalid response data.`);
  }
  if (!isRecord(payload)) throw new Error(`${label} returned invalid response data.`);
  return payload;
}

const isIncident = (value: unknown): value is Incident => isRecord(value) &&
  hasStringFields(value, ['id', 'title', 'description', 'severity', 'status', 'service_name']) && isRecord(value.metrics);
const isRunbook = (value: unknown): value is Runbook => isRecord(value) &&
  hasStringFields(value, ['id', 'title', 'description', 'content']) && Array.isArray(value.tags) && Array.isArray(value.relevant_severity);
const isAuditEvent = (value: unknown): value is AuditEvent => isRecord(value) &&
  hasStringFields(value, ['id', 'incident_id', 'action_stage', 'actor_type', 'timestamp']);
const isInvestigation = (value: unknown): value is InvestigationRun => isRecord(value) &&
  hasStringFields(value, ['id', 'incident_id', 'model_name', 'summary']) &&
  typeof value.confidence_score === 'number' && Array.isArray(value.hypotheses) && Array.isArray(value.evidence_citations);
const isProposal = (value: unknown): value is RemediationProposal => isRecord(value) &&
  hasStringFields(value, ['id', 'incident_id', 'action_type', 'plan_hash', 'status', 'expected_effect', 'rollback_instructions']) &&
  isRecord(value.parameters) && Array.isArray(value.verification_criteria);
const isVerification = (value: unknown): value is VerificationResult => isRecord(value) &&
  hasStringFields(value, ['id', 'incident_id', 'status', 'explanation']) && Array.isArray(value.criteria_results);

export async function fetchHealth(): Promise<{
  status: string;
  service: string;
  environment: string;
  model: string;
  has_gemini_key: boolean;
  supabase_connected: boolean;
  storage_mode: 'supabase' | 'in-memory-demo';
  supabase_diagnostics?: { diagnostic?: string; database_ready?: boolean };
}> {
  const data = await readResponse(await fetch(`${API_BASE}/health`), 'Health check');
  if (!hasStringFields(data, ['status', 'service', 'environment', 'model']) ||
      typeof data.supabase_connected !== 'boolean' || typeof data.has_gemini_key !== 'boolean' ||
      (data.storage_mode !== 'supabase' && data.storage_mode !== 'in-memory-demo')) {
    throw new Error('Health check returned invalid response data.');
  }
  return data as {
    status: string; service: string; environment: string; model: string;
    has_gemini_key: boolean; supabase_connected: boolean;
    storage_mode: 'supabase' | 'in-memory-demo';
    supabase_diagnostics?: { diagnostic?: string; database_ready?: boolean };
  };
}

export async function fetchIncidents(): Promise<Incident[]> {
  const data = await readResponse(await fetch(`${API_BASE}/incidents`), 'Incident list');
  return requireArray<Incident>(data, 'incidents', 'Incident list', isIncident);
}

export async function fetchIncidentDetails(id: string): Promise<{
  incident: Incident;
  logs: IncidentLog[];
  investigations: InvestigationRun[];
  proposals: RemediationProposal[];
  verification?: VerificationResult;
  audit: AuditEvent[];
}> {
  const data = await readResponse(await fetch(`${API_BASE}/incidents/${encodeURIComponent(id)}`), 'Incident details');
  if (!isIncident(data.incident)) throw new Error('Incident details returned invalid incident data.');
  const logs = requireArray<IncidentLog>(data, 'logs', 'Incident details', (item) => isRecord(item) && hasStringFields(item, ['id', 'incident_id', 'timestamp', 'severity', 'service_name', 'message']));
  const investigations = requireArray<InvestigationRun>(data, 'investigations', 'Incident details', isInvestigation);
  const proposals = requireArray<RemediationProposal>(data, 'proposals', 'Incident details', isProposal);
  const audit = requireArray<AuditEvent>(data, 'audit', 'Incident details', isAuditEvent);
  if (data.verification !== undefined && data.verification !== null && !isVerification(data.verification)) {
    throw new Error('Incident details returned invalid verification data.');
  }
  return {
    incident: data.incident,
    logs,
    investigations,
    proposals,
    verification: data.verification == null ? undefined : data.verification as VerificationResult,
    audit,
  };
}

export async function createIncident(data: {
  title: string;
  description: string;
  severity: string;
  service_name: string;
}): Promise<Incident> {
  const responseData = await readResponse(await fetch(`${API_BASE}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }), 'Incident creation');
  if (!isIncident(responseData.incident)) throw new Error('Incident creation returned no valid incident record.');
  return responseData.incident;
}

export async function fetchRunbooks(): Promise<Runbook[]> {
  const data = await readResponse(await fetch(`${API_BASE}/runbooks`), 'Runbook list');
  return requireArray<Runbook>(data, 'runbooks', 'Runbook list', isRunbook);
}

export async function runInvestigation(incidentId: string): Promise<{
  investigation: InvestigationRun;
  proposal: RemediationProposal;
}> {
  const data = await readResponse(await fetch(`${API_BASE}/incidents/${encodeURIComponent(incidentId)}/investigations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }), 'Incident investigation');
  if (!isInvestigation(data.investigation) || !isProposal(data.proposal)) {
    throw new Error('Incident investigation returned invalid result data.');
  }
  return data as unknown as Awaited<ReturnType<typeof runInvestigation>>;
}

export async function approveProposal(
  proposalId: string,
  confirmedPlanHash: string,
  comments?: string
): Promise<{ approval: RemediationApproval; proposal: RemediationProposal }> {
  const data = await readResponse(await fetch(`${API_BASE}/proposals/${encodeURIComponent(proposalId)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      approver_email: 'sre-oncall@incidentiq.internal',
      approver_name: 'Elena Rostova (Principal SRE)',
      plan_hash_confirmed: confirmedPlanHash,
      comments,
    }),
  }), 'Proposal approval');
  if (!isRecord(data.approval) || !hasStringFields(data.approval, ['id', 'proposal_id', 'decision', 'plan_hash_confirmed']) ||
      !isProposal(data.proposal)) {
    throw new Error('Proposal approval returned invalid response data.');
  }
  return data as unknown as Awaited<ReturnType<typeof approveProposal>>;
}

export async function rejectProposal(
  proposalId: string,
  confirmedPlanHash: string,
  comments?: string
): Promise<{ approval: RemediationApproval; proposal: RemediationProposal }> {
  const data = await readResponse(await fetch(`${API_BASE}/proposals/${encodeURIComponent(proposalId)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      approver_email: 'sre-oncall@incidentiq.internal',
      approver_name: 'Elena Rostova (Principal SRE)',
      plan_hash_confirmed: confirmedPlanHash,
      comments,
    }),
  }), 'Proposal rejection');
  if (!isRecord(data.approval) || !hasStringFields(data.approval, ['id', 'proposal_id', 'decision', 'plan_hash_confirmed']) ||
      !isProposal(data.proposal)) {
    throw new Error('Proposal rejection returned invalid response data.');
  }
  return data as unknown as Awaited<ReturnType<typeof rejectProposal>>;
}

export async function executeProposal(
  proposalId: string,
  options?: { forceFailure?: boolean; forceVerificationFail?: boolean }
): Promise<{ action: any; verification: VerificationResult }> {
  const data = await readResponse(await fetch(`${API_BASE}/proposals/${encodeURIComponent(proposalId)}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      executed_by: 'SRE IncidentIQ Sandbox Runtime',
      forceFailure: options?.forceFailure || false,
      forceVerificationFail: options?.forceVerificationFail || false,
    }),
  }), 'Sandbox execution');
  if (!isRecord(data.action) || !hasStringFields(data.action, ['id', 'proposal_id', 'incident_id', 'action_type', 'execution_status']) ||
      !Array.isArray(data.action.execution_logs) || !isVerification(data.verification)) {
    throw new Error('Sandbox execution returned invalid response data.');
  }
  return data as unknown as Awaited<ReturnType<typeof executeProposal>>;
}

export async function fetchAllAudit(): Promise<AuditEvent[]> {
  const data = await readResponse(await fetch(`${API_BASE}/audit`), 'Audit history');
  return requireArray<AuditEvent>(data, 'audit', 'Audit history', isAuditEvent);
}

export async function resetSandbox(): Promise<{ message: string; incidents: Incident[] }> {
  const data = await readResponse(await fetch(`${API_BASE}/sandbox/reset`, {
    method: 'POST',
  }), 'Sandbox reset');
  if (typeof data.message !== 'string') throw new Error('Sandbox reset returned invalid response data.');
  return { message: data.message, incidents: requireArray<Incident>(data, 'incidents', 'Sandbox reset', isIncident) };
}

export async function triggerAutomatedTests(): Promise<AutomatedTestReport> {
  const data = await readResponse(await fetch(`${API_BASE}/tests/run`, {
    method: 'POST',
  }), 'Automated test suite');
  if (typeof data.suite_status !== 'string' || !Array.isArray(data.results)) {
    throw new Error('Automated test suite returned invalid response data.');
  }
  return data as unknown as AutomatedTestReport;
}
