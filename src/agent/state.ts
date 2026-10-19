import crypto from 'crypto';
import type {
  AuditEvent,
  Incident,
  IncidentLog,
  InvestigationRun,
  RemediationAction,
  RemediationApproval,
  RemediationProposal,
  Runbook,
  VerificationResult,
} from './types.ts';

export type PlanHashInput = Pick<
  RemediationProposal,
  | 'id'
  | 'incident_id'
  | 'investigation_id'
  | 'action_type'
  | 'parameters'
  | 'risk_level'
  | 'expected_effect'
  | 'rollback_instructions'
  | 'verification_criteria'
>;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

/** Fingerprint every proposal field that changes what an operator authorizes or executes. */
export function computePlanHash(plan: PlanHashInput): string {
  const canonicalPlan = canonicalize({
    proposal_id: plan.id,
    incident_id: plan.incident_id,
    investigation_id: plan.investigation_id ?? null,
    action_type: plan.action_type,
    parameters: plan.parameters,
    risk_level: plan.risk_level,
    expected_effect: plan.expected_effect,
    rollback_instructions: plan.rollback_instructions,
    verification_criteria: plan.verification_criteria,
  });
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonicalPlan)).digest('hex')}`;
}

// Initial Fixtures
const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 'INC-2026-8841',
    title: 'Production Database Connection Pool Exhaustion & Latency Spike',
    description: 'Primary Postgres client connection pool reached 98% saturation on auth-payment-gateway. Connection acquisition timeout elevated to 14,800ms, causing cascading request degradation and 504 gateway timeouts.',
    severity: 'critical',
    status: 'open',
    environment: 'sandbox',
    service_name: 'auth-payment-gateway',
    metrics: {
      connection_utilization_pct: 98.4,
      connection_acquisition_timeout_count: 342,
      p99_latency_ms: 4820,
      http_error_rate_pct: 14.2,
      health_check_status: 'DEGRADED',
      active_pool_size: 25,
      max_pool_limit: 25,
    },
    created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'INC-2026-9024',
    title: 'API Gateway HTTP 500 Spike Post-Config Deployment',
    description: 'HTTP 500 error rate spiked to 28.6% across edge ingress routes following deployment rev-2026.4.19b. Schema validation errors reported on upstream payload transformer.',
    severity: 'high',
    status: 'open',
    environment: 'sandbox',
    service_name: 'edge-routing-service',
    metrics: {
      http_500_error_rate_pct: 28.6,
      p99_latency_ms: 2350,
      health_check_status: 'FAILING',
      active_config_version: 'rev-2026.4.19b-canary',
      known_good_version: 'rev-2026.4.18-stable',
    },
    created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
];

const INITIAL_LOGS: IncidentLog[] = [
  // Logs for INC-2026-8841
  {
    id: 'LOG-8841-01',
    incident_id: 'INC-2026-8841',
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    severity: 'WARN',
    service_name: 'auth-payment-gateway',
    message: 'Connection pool usage reached 82% threshold (20/25 active connections held by worker pool)',
    metadata: { pool_active: 20, pool_max: 25, queue_depth: 4 },
  },
  {
    id: 'LOG-8841-02',
    incident_id: 'INC-2026-8841',
    timestamp: new Date(Date.now() - 36 * 60 * 1000).toISOString(),
    severity: 'ERROR',
    service_name: 'auth-payment-gateway',
    message: 'Acquisition timeout: client thread checkout waited 5000ms without acquiring connection from pool',
    metadata: { caller: 'TokenVerificationHandler', timeout_ms: 5000, pool_state: 'exhausted' },
  },
  {
    id: 'LOG-8841-03',
    incident_id: 'INC-2026-8841',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    severity: 'FATAL',
    service_name: 'auth-payment-gateway',
    message: 'Unhandled DatabaseConnectionException: timeout waiting for connection pool lease after 15000ms',
    metadata: { error_code: 'PG_POOL_EXHAUSTED', host: 'pg-primary-sandbox.internal:5432' },
  },
  {
    id: 'LOG-8841-04',
    incident_id: 'INC-2026-8841',
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    severity: 'ERROR',
    service_name: 'auth-payment-gateway',
    message: 'Database connection leak suspected: 8 idle-in-transaction connections older than 180s detected',
    metadata: { stale_conn_ids: ['c-9821', 'c-9822', 'c-9827', 'c-9830'], transaction_age_s: 210 },
  },
  {
    id: 'LOG-8841-05',
    incident_id: 'INC-2026-8841',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    severity: 'WARN',
    service_name: 'load-balancer-ingress',
    message: 'Upstream latency threshold breached: p99 response time 4,820ms for /v1/auth/exchange',
    metadata: { endpoint: '/v1/auth/exchange', latency_ms: 4820, target_sla_ms: 250 },
  },
  {
    id: 'LOG-8841-06',
    incident_id: 'INC-2026-8841',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    severity: 'FATAL',
    service_name: 'health-monitor',
    message: 'Synthetic health-check FAILED for auth-payment-gateway: /ready probe returned 503 Service Unavailable',
    metadata: { probe: '/ready', status: 503, detail: 'db ping failure' },
  },

  // Logs for INC-2026-9024
  {
    id: 'LOG-9024-01',
    incident_id: 'INC-2026-9024',
    timestamp: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
    severity: 'INFO',
    service_name: 'deployment-agent',
    message: 'Config map applied: edge-routing-config updated to version rev-2026.4.19b-canary',
    metadata: { author: 'cd-pipeline', release_id: 'rel-8812' },
  },
  {
    id: 'LOG-9024-02',
    incident_id: 'INC-2026-9024',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    severity: 'ERROR',
    service_name: 'edge-routing-service',
    message: 'ConfigValidationError: missing required parameter "upstream_retry_budget_ms" in active configuration',
    metadata: { config_version: 'rev-2026.4.19b-canary', key_missing: 'upstream_retry_budget_ms' },
  },
  {
    id: 'LOG-9024-03',
    incident_id: 'INC-2026-9024',
    timestamp: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
    severity: 'FATAL',
    service_name: 'edge-routing-service',
    message: 'HTTP 500 Internal Server Error returned on 812 requests/min during header transformation pass',
    metadata: { error_type: 'NullReferenceException', pipeline_stage: 'header_transform' },
  },
  {
    id: 'LOG-9024-04',
    incident_id: 'INC-2026-9024',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    severity: 'ERROR',
    service_name: 'health-monitor',
    message: 'Service health check degraded: 3 of 4 ingress pods reporting Unhealthy state',
    metadata: { unhealthy_replicas: 3, total_replicas: 4 },
  },
  {
    id: 'LOG-9024-05',
    incident_id: 'INC-2026-9024',
    timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    severity: 'WARN',
    service_name: 'edge-routing-service',
    message: 'Configuration hash mismatch with canonical baseline: expected sha256:7f4a... observed sha256:3e1c...',
    metadata: { canonical: 'rev-2026.4.18-stable', running: 'rev-2026.4.19b-canary' },
  },
];

const INITIAL_RUNBOOKS: Runbook[] = [
  {
    id: 'RBK-DB-POOL-01',
    title: 'Database Connection Pool Saturation & Starvation',
    description: 'Standard operating procedure for diagnosing and remediating PostgreSQL client pool exhaustion in high-throughput microservices.',
    content: 'When client connections exceed 90% of pool capacity, acquisition timeouts trigger cascading failures. Apply dynamic pool resize and terminate idle connections.',
    tags: ['database', 'connection-pool', 'latency', 'postgres'],
    relevant_severity: ['critical', 'high'],
    troubleshooting_steps: [
      { step: 1, description: 'Verify current pool utilization via metric endpoint /metrics#pool_active' },
      { step: 2, description: 'Inspect pg_stat_activity for idle-in-transaction connections older than 120 seconds' },
      { step: 3, description: 'Apply approved sandbox parameter SIMULATE_INCREASE_CONNECTION_POOL to expand pool ceiling to 50' },
      { step: 4, description: 'Execute SIMULATE_RELEASE_STALE_CONNECTIONS to flush unreleased handles' },
    ],
    approved_remediation_guidance: 'Issue SIMULATE_INCREASE_CONNECTION_POOL with new_limit=50, followed by SIMULATE_RELEASE_STALE_CONNECTIONS with max_idle_seconds=120.',
    rollback_instructions: 'Revert connection pool configuration back to baseline limit (25) if memory threshold exceeds 85%.',
    source_type: 'synthetic_verified',
  },
  {
    id: 'RBK-CONFIG-FAIL-02',
    title: 'API Gateway Bad Configuration Mismatch & HTTP 500 Surge',
    description: 'Resolution guide for application crashes caused by invalid, unparsed, or schema-incompatible configuration deployments.',
    content: 'When canary or rolling config deployment introduces syntax or missing schema keys, application workers throw 500 NullReference exceptions. Rollback immediately to stable tag.',
    tags: ['config', 'http-500', 'deployment', 'canary'],
    relevant_severity: ['critical', 'high'],
    troubleshooting_steps: [
      { step: 1, description: 'Audit recent config change events in deployment-agent logs' },
      { step: 2, description: 'Confirm schema mismatch error messages in edge-routing-service' },
      { step: 3, description: 'Select known-good revision tag rev-2026.4.18-stable' },
      { step: 4, description: 'Submit remediation proposal for human approval and execute rollback in sandbox' },
    ],
    approved_remediation_guidance: 'Execute SIMULATE_RESTORE_KNOWN_GOOD_CONFIG targeting the verified stable tag "rev-2026.4.18-stable".',
    rollback_instructions: 'If stable config rollback fails to re-initialize ingress, execute SIMULATE_RESTART_HEALTHY_SERVICE.',
    source_type: 'synthetic_verified',
  },
  {
    id: 'RBK-SVC-HEALTH-03',
    title: 'Microservice Liveness & Readiness Probe Failure',
    description: 'Triaging recurring probe failures and HTTP 503 unavailability on containerized microservices.',
    content: 'Readiness probes drop pods from service mesh endpoints when dependency connections fail. Confirm backing datastore health before cycling pods.',
    tags: ['health-check', 'probes', 'kubernetes', 'reliability'],
    relevant_severity: ['high', 'medium'],
    troubleshooting_steps: [
      { step: 1, description: 'Check container exit codes and stderr buffer' },
      { step: 2, description: 'Verify external dependencies (DB, Redis, upstream auth)' },
      { step: 3, description: 'Restart service after dependency health is restored' },
    ],
    approved_remediation_guidance: 'Execute SIMULATE_RESTART_HEALTHY_SERVICE after confirming backing datastores are healthy.',
    rollback_instructions: 'Restore previous container image tag if restart fails verification.',
    source_type: 'synthetic_verified',
  },
];

class StateStore {
  private incidents: Map<string, Incident> = new Map();
  private logs: Map<string, IncidentLog> = new Map();
  private runbooks: Map<string, Runbook> = new Map();
  private investigations: Map<string, InvestigationRun> = new Map();
  private proposals: Map<string, RemediationProposal> = new Map();
  private approvals: Map<string, RemediationApproval> = new Map();
  private actions: Map<string, RemediationAction> = new Map();
  private verifications: Map<string, VerificationResult> = new Map();
  private auditEvents: AuditEvent[] = [];

  constructor() {
    this.reset();
  }

  public reset() {
    this.incidents.clear();
    this.logs.clear();
    this.runbooks.clear();
    this.investigations.clear();
    this.proposals.clear();
    this.approvals.clear();
    this.actions.clear();
    this.verifications.clear();
    this.auditEvents = [];

    // Seed incidents
    for (const inc of INITIAL_INCIDENTS) {
      this.incidents.set(inc.id, JSON.parse(JSON.stringify(inc)));
    }

    // Seed logs
    for (const log of INITIAL_LOGS) {
      this.logs.set(log.id, JSON.parse(JSON.stringify(log)));
    }

    // Seed runbooks
    for (const rb of INITIAL_RUNBOOKS) {
      this.runbooks.set(rb.id, JSON.parse(JSON.stringify(rb)));
    }

    // Seed initial observe audit events
    this.recordAudit(
      'INC-2026-8841',
      'OBSERVE',
      'AI_AGENT',
      'TelemetryMonitor',
      'Detected critical database connection pool saturation threshold breach (98.4%)',
      { threshold: 90.0, current: 98.4 }
    );

    this.recordAudit(
      'INC-2026-9024',
      'OBSERVE',
      'AI_AGENT',
      'IngressTrafficMonitor',
      'Detected elevated HTTP 500 error rate (28.6%) post deployment rev-2026.4.19b',
      { threshold: 1.0, current: 28.6 }
    );
  }

  // Incidents
  public getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getIncident(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  public updateIncident(id: string, updates: Partial<Incident>): Incident | undefined {
    const existing = this.incidents.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...updates,
      metrics: { ...existing.metrics, ...(updates.metrics || {}) },
      updated_at: new Date().toISOString(),
    };
    this.incidents.set(id, updated);
    return updated;
  }

  public addIncident(incident: Incident): Incident {
    this.incidents.set(incident.id, incident);
    return incident;
  }

  // Logs
  public getLogsForIncident(incidentId: string): IncidentLog[] {
    return Array.from(this.logs.values())
      .filter((l) => l.incident_id === incidentId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Runbooks
  public getAllRunbooks(): Runbook[] {
    return Array.from(this.runbooks.values());
  }

  public getRunbook(id: string): Runbook | undefined {
    return this.runbooks.get(id);
  }

  // Investigations
  public saveInvestigation(inv: InvestigationRun): InvestigationRun {
    this.investigations.set(inv.id, inv);
    this.updateIncident(inv.incident_id, { status: 'investigating' });
    this.recordAudit(
      inv.incident_id,
      'INVESTIGATE',
      'AI_AGENT',
      inv.model_name,
      `Investigation completed with ${inv.hypotheses.length} ranked root-cause hypotheses`,
      {
        investigation_id: inv.id,
        confidence_score: inv.confidence_score,
        top_root_cause: inv.hypotheses[0]?.root_cause,
      }
    );
    return inv;
  }

  public getInvestigation(id: string): InvestigationRun | undefined {
    return this.investigations.get(id);
  }

  public getInvestigationsForIncident(incidentId: string): InvestigationRun[] {
    return Array.from(this.investigations.values())
      .filter((inv) => inv.incident_id === incidentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Proposals
  public createProposal(proposal: RemediationProposal): RemediationProposal {
    this.proposals.set(proposal.id, proposal);
    this.updateIncident(proposal.incident_id, { status: 'awaiting_approval' });
    this.recordAudit(
      proposal.incident_id,
      'PROPOSE',
      'AI_AGENT',
      'RemediationOrchestrator',
      `Generated reversible remediation plan: ${proposal.action_type}`,
      {
        proposal_id: proposal.id,
        plan_hash: proposal.plan_hash,
        risk_level: proposal.risk_level,
        parameters: proposal.parameters,
      }
    );
    return proposal;
  }

  public getProposal(id: string): RemediationProposal | undefined {
    return this.proposals.get(id);
  }

  public getProposalsForIncident(incidentId: string): RemediationProposal[] {
    return Array.from(this.proposals.values())
      .filter((p) => p.incident_id === incidentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public updateProposalStatus(id: string, status: RemediationProposal['status']): RemediationProposal | undefined {
    const prop = this.proposals.get(id);
    if (!prop) return undefined;
    prop.status = status;
    this.proposals.set(id, prop);
    return prop;
  }

  // Approvals
  public recordApproval(approval: RemediationApproval): RemediationApproval {
    this.approvals.set(approval.id, approval);
    const prop = this.proposals.get(approval.proposal_id);
    if (prop) {
      prop.status = approval.decision === 'approved' ? 'approved' : 'rejected';
      this.proposals.set(prop.id, prop);
      this.updateIncident(prop.incident_id, {
        status: approval.decision === 'approved' ? 'awaiting_approval' : 'open',
      });
      this.recordAudit(
        prop.incident_id,
        approval.decision === 'approved' ? 'APPROVE' : 'REJECT',
        'HUMAN_OPERATOR',
        approval.approver_name,
        `Remediation proposal ${approval.decision.toUpperCase()}: ${prop.action_type}`,
        {
          proposal_id: prop.id,
          plan_hash_confirmed: approval.plan_hash_confirmed,
          comments: approval.comments,
        }
      );
    }
    return approval;
  }

  public getApprovalForProposal(proposalId: string): RemediationApproval | undefined {
    return Array.from(this.approvals.values()).find((a) => a.proposal_id === proposalId);
  }

  // Actions
  public recordAction(action: RemediationAction): RemediationAction {
    this.actions.set(action.id, action);
    this.updateIncident(action.incident_id, { status: 'remediating' });
    this.recordAudit(
      action.incident_id,
      'EXECUTE',
      'SANDBOX_ENGINE',
      'DeterministicSandbox',
      `Executed sandboxed remediation ${action.action_type}`,
      {
        action_id: action.id,
        status: action.execution_status,
      }
    );
    return action;
  }

  public getAction(id: string): RemediationAction | undefined {
    return this.actions.get(id);
  }

  // Verifications
  public recordVerification(result: VerificationResult): VerificationResult {
    this.verifications.set(result.id, result);
    const incStatus = result.status === 'VERIFIED_RECOVERED' ? 'resolved' : 'failed';
    this.updateIncident(result.incident_id, {
      status: incStatus,
      metrics: result.observed_metrics,
    });
    this.recordAudit(
      result.incident_id,
      'VERIFY',
      'SANDBOX_ENGINE',
      'VerificationGatekeeper',
      `Recovery verification completed: ${result.status}`,
      {
        verification_id: result.id,
        status: result.status,
        passed_gates: result.criteria_results.filter((c) => c.passed).length,
        total_gates: result.criteria_results.length,
      }
    );
    return result;
  }

  public getVerificationForIncident(incidentId: string): VerificationResult | undefined {
    return Array.from(this.verifications.values())
      .filter((v) => v.incident_id === incidentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }

  // Audits
  public recordAudit(
    incidentId: string,
    actionStage: AuditEvent['action_stage'],
    actorType: AuditEvent['actor_type'],
    actorName: string,
    summary: string,
    details: Record<string, any>
  ): AuditEvent {
    const event: AuditEvent = {
      id: `AUD-${crypto.randomUUID().toUpperCase()}`,
      incident_id: incidentId,
      action_stage: actionStage,
      actor_type: actorType,
      actor_name: actorName,
      summary,
      details,
      timestamp: new Date().toISOString(),
    };
    this.auditEvents.unshift(event);
    return event;
  }

  public getAuditEventsForIncident(incidentId: string): AuditEvent[] {
    return this.auditEvents.filter((e) => e.incident_id === incidentId);
  }

  public getAllAuditEvents(): AuditEvent[] {
    return this.auditEvents;
  }
}

export const stateStore = new StateStore();
