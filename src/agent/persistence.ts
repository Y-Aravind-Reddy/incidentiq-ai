import crypto from 'node:crypto';
import { supabase, isSupabaseConfigured } from '../config/supabase.ts';
import { stateStore } from './state.ts';
import type {
  AuditEvent, Incident, IncidentLog, InvestigationEvidence, InvestigationHypothesis,
  InvestigationRun, RemediationAction, RemediationApproval, RemediationProposal,
  Runbook, VerificationResult,
} from './types.ts';

/** Server-side repository. In unconfigured local/demo mode it uses the visible in-memory demo store.
 * Once credentials are present, database errors are thrown and are never hidden by memory fallback.
 */
let forceInMemoryForTests = false;

/** Keep the demo test suite isolated from configured databases. */
export function setPersistenceTestMode(enabled: boolean) {
  forceInMemoryForTests = enabled;
}

function db() {
  if (forceInMemoryForTests || !isSupabaseConfigured() || !supabase) return null;
  return supabase;
}
function fail(operation: string, error: { message?: string; code?: string } | null) {
  if (error) throw new Error(`Supabase ${operation} failed${error.code ? ` (${error.code})` : ''}: ${error.message || 'database request failed'}`);
}
async function rows<T>(table: string, query: PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const result = await query;
  fail(`read ${table}`, result.error);
  return result.data || [];
}
async function insert(table: string, value: unknown) {
  const client = db(); if (!client) return;
  const { error } = await client.from(table).insert(value as never);
  fail(`write ${table}`, error);
}
async function update(table: string, id: string, value: unknown) {
  const client = db(); if (!client) return;
  const { error } = await client.from(table).update(value as never).eq('id', id);
  fail(`update ${table}`, error);
}

export const persistence = {
  getAllIncidents: async (): Promise<Incident[]> => {
    const client = db(); if (!client) return stateStore.getAllIncidents();
    return rows<Incident>('incidents', client.from('incidents').select('*').order('created_at', { ascending: false }));
  },
  getIncident: async (id: string): Promise<Incident | undefined> => {
    const client = db(); if (!client) return stateStore.getIncident(id);
    const found = await rows<Incident>('incidents', client.from('incidents').select('*').eq('id', id).limit(1)); return found[0];
  },
  addIncident: async (incident: Incident) => {
    const client = db(); if (!client) return stateStore.addIncident(incident);
    await insert('incidents', incident); return incident;
  },
  updateIncident: async (id: string, changes: Partial<Incident>) => {
    const client = db(); if (!client) return stateStore.updateIncident(id, changes);
    const current = await persistence.getIncident(id); if (!current) return undefined;
    const updated = { ...current, ...changes, metrics: { ...current.metrics, ...(changes.metrics || {}) }, updated_at: new Date().toISOString() };
    await update('incidents', id, updated); return updated;
  },
  getLogsForIncident: async (id: string): Promise<IncidentLog[]> => {
    const client = db(); if (!client) return stateStore.getLogsForIncident(id);
    return rows<IncidentLog>('incident_logs', client.from('incident_logs').select('*').eq('incident_id', id).order('timestamp'));
  },
  getAllRunbooks: async (): Promise<Runbook[]> => {
    const client = db(); if (!client) return stateStore.getAllRunbooks();
    return rows<Runbook>('runbooks', client.from('runbooks').select('*').order('id'));
  },
  getInvestigation: async (id: string): Promise<InvestigationRun | undefined> => {
    const client = db(); if (!client) return stateStore.getInvestigation(id);
    const bases = await rows<any>('investigation_runs', client.from('investigation_runs').select('*').eq('id', id).limit(1));
    if (!bases[0]) return undefined;
    const hypotheses = await rows<InvestigationHypothesis>('investigation_hypotheses', client.from('investigation_hypotheses').select('*').eq('investigation_id', id).order('rank'));
    const evidence = await rows<InvestigationEvidence>('investigation_evidence', client.from('investigation_evidence').select('*').eq('investigation_id', id).order('created_at'));
    return { ...bases[0], hypotheses, evidence_citations: evidence } as InvestigationRun;
  },
  getInvestigationsForIncident: async (id: string): Promise<InvestigationRun[]> => {
    const client = db(); if (!client) return stateStore.getInvestigationsForIncident(id);
    const base = await rows<any>('investigation_runs', client.from('investigation_runs').select('*').eq('incident_id', id).order('created_at', { ascending: false }));
    return Promise.all(base.map(async (item) => (await persistence.getInvestigation(item.id))!));
  },
  saveInvestigation: async (item: InvestigationRun) => {
    const client = db(); if (!client) return stateStore.saveInvestigation(item);
    const { hypotheses, evidence_citations, ...base } = item;
    await insert('investigation_runs', base);
    if (hypotheses.length) await insert('investigation_hypotheses', hypotheses);
    if (evidence_citations.length) await insert('investigation_evidence', evidence_citations);
    await persistence.updateIncident(item.incident_id, { status: 'investigating' });
    await persistence.recordAudit(item.incident_id, 'INVESTIGATE', 'AI_AGENT', item.model_name,
      `Investigation completed with ${hypotheses.length} ranked root-cause hypotheses`, { investigation_id: item.id, confidence_score: item.confidence_score, top_root_cause: hypotheses[0]?.root_cause });
    return item;
  },
  getProposal: async (id: string): Promise<RemediationProposal | undefined> => {
    const client = db(); if (!client) return stateStore.getProposal(id);
    const found = await rows<RemediationProposal>('remediation_proposals', client.from('remediation_proposals').select('*').eq('id', id).limit(1)); return found[0];
  },
  getProposalsForIncident: async (id: string): Promise<RemediationProposal[]> => {
    const client = db(); if (!client) return stateStore.getProposalsForIncident(id);
    return rows<RemediationProposal>('remediation_proposals', client.from('remediation_proposals').select('*').eq('incident_id', id).order('created_at', { ascending: false }));
  },
  createProposal: async (item: RemediationProposal) => {
    const client = db(); if (!client) return stateStore.createProposal(item);
    await insert('remediation_proposals', item);
    await persistence.updateIncident(item.incident_id, { status: 'awaiting_approval' });
    await persistence.recordAudit(item.incident_id, 'PROPOSE', 'AI_AGENT', 'RemediationOrchestrator', `Generated reversible remediation plan: ${item.action_type}`, { proposal_id: item.id, plan_hash: item.plan_hash, risk_level: item.risk_level, parameters: item.parameters });
    return item;
  },
  getApprovalForProposal: async (id: string): Promise<RemediationApproval | undefined> => {
    const client = db(); if (!client) return stateStore.getApprovalForProposal(id);
    const found = await rows<RemediationApproval>('remediation_approvals', client.from('remediation_approvals').select('*').eq('proposal_id', id).order('created_at', { ascending: false }).limit(1)); return found[0];
  },
  recordApproval: async (item: RemediationApproval) => {
    const client = db(); if (!client) return stateStore.recordApproval(item);
    const proposal = await persistence.getProposal(item.proposal_id); if (!proposal) throw new Error(`Proposal ${item.proposal_id} not found`);
    await insert('remediation_approvals', item);
    await update('remediation_proposals', proposal.id, { status: item.decision });
    await persistence.updateIncident(proposal.incident_id, { status: item.decision === 'approved' ? 'awaiting_approval' : 'open' });
    await persistence.recordAudit(proposal.incident_id, item.decision === 'approved' ? 'APPROVE' : 'REJECT', 'HUMAN_OPERATOR', item.approver_name, `Remediation proposal ${item.decision.toUpperCase()}: ${proposal.action_type}`, { proposal_id: proposal.id, plan_hash_confirmed: item.plan_hash_confirmed, comments: item.comments });
    return item;
  },
  updateProposalStatus: async (id: string, status: RemediationProposal['status']) => {
    const client = db(); if (!client) return stateStore.updateProposalStatus(id, status);
    const proposal = await persistence.getProposal(id); if (!proposal) return undefined;
    await update('remediation_proposals', id, { status }); return { ...proposal, status };
  },
  recordAction: async (item: RemediationAction) => {
    const client = db(); if (!client) return stateStore.recordAction(item);
    const { started_at, completed_at, ...base } = item;
    await insert('remediation_actions', { ...base, started_at, completed_at: completed_at || null });
    await persistence.updateIncident(item.incident_id, { status: 'remediating' });
    await persistence.recordAudit(item.incident_id, 'EXECUTE', 'SANDBOX_ENGINE', 'DeterministicSandbox', `Executed sandboxed remediation ${item.action_type}`, { action_id: item.id, status: item.execution_status });
    return item;
  },
  recordVerification: async (item: VerificationResult) => {
    const client = db(); if (!client) return stateStore.recordVerification(item);
    await insert('verification_results', item);
    await persistence.updateIncident(item.incident_id, { status: item.status === 'VERIFIED_RECOVERED' ? 'resolved' : 'failed', metrics: item.observed_metrics });
    await persistence.recordAudit(item.incident_id, 'VERIFY', 'SANDBOX_ENGINE', 'VerificationGatekeeper', `Recovery verification completed: ${item.status}`, { verification_id: item.id, status: item.status, passed_gates: item.criteria_results.filter(c => c.passed).length, total_gates: item.criteria_results.length });
    return item;
  },
  getVerificationForIncident: async (id: string): Promise<VerificationResult | undefined> => {
    const client = db(); if (!client) return stateStore.getVerificationForIncident(id);
    const found = await rows<VerificationResult>('verification_results', client.from('verification_results').select('*').eq('incident_id', id).order('created_at', { ascending: false }).limit(1)); return found[0];
  },
  recordAudit: async (incidentId: string, actionStage: AuditEvent['action_stage'], actorType: AuditEvent['actor_type'], actorName: string, summary: string, details: Record<string, any>) => {
    const event: AuditEvent = { id: `AUD-${crypto.randomUUID().toUpperCase()}`, incident_id: incidentId, action_stage: actionStage, actor_type: actorType, actor_name: actorName, summary, details, timestamp: new Date().toISOString() };
    const client = db(); if (!client) return stateStore.recordAudit(incidentId, actionStage, actorType, actorName, summary, details);
    await insert('audit_events', event); return event;
  },
  getAuditEventsForIncident: async (id: string): Promise<AuditEvent[]> => {
    const client = db(); if (!client) return stateStore.getAuditEventsForIncident(id);
    return rows<AuditEvent>('audit_events', client.from('audit_events').select('*').eq('incident_id', id).order('timestamp', { ascending: false }));
  },
  getAllAuditEvents: async (): Promise<AuditEvent[]> => {
    const client = db(); if (!client) return stateStore.getAllAuditEvents();
    return rows<AuditEvent>('audit_events', client.from('audit_events').select('*').order('timestamp', { ascending: false }));
  },
};
