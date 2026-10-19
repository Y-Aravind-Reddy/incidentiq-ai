export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 
  | 'open'
  | 'investigating'
  | 'awaiting_approval'
  | 'remediating'
  | 'verifying'
  | 'resolved'
  | 'failed';

export type LogSeverity = 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export interface IncidentLog {
  id: string; // e.g., 'LOG-8841-01'
  incident_id: string;
  timestamp: string;
  severity: LogSeverity;
  service_name: string;
  message: string;
  metadata: Record<string, any>;
  created_at?: string;
}

export interface IncidentMetrics {
  connection_utilization_pct?: number;
  connection_acquisition_timeout_count?: number;
  p99_latency_ms?: number;
  http_error_rate_pct?: number;
  http_500_error_rate_pct?: number;
  health_check_status: 'HEALTHY' | 'DEGRADED' | 'FAILING';
  active_pool_size?: number;
  max_pool_limit?: number;
  active_config_version?: string;
  known_good_version?: string;
  [key: string]: any;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  environment: string;
  service_name: string;
  metrics: IncidentMetrics;
  created_at: string;
  updated_at: string;
}

export interface RunbookStep {
  step: number;
  description: string;
}

export interface Runbook {
  id: string; // e.g., 'RBK-DB-POOL-01'
  title: string;
  description: string;
  content: string;
  tags: string[];
  relevant_severity: Severity[];
  troubleshooting_steps: RunbookStep[];
  approved_remediation_guidance: string;
  rollback_instructions: string;
  source_type: 'synthetic_verified' | 'vendor_doc';
  created_at?: string;
  updated_at?: string;
}

export interface InvestigationEvidence {
  id: string;
  investigation_id: string;
  log_id: string;
  relevance: 'HIGH' | 'MEDIUM' | 'LOW' | 'CONTRADICTING';
  correlation_rationale: string;
}

export interface InvestigationHypothesis {
  id: string;
  investigation_id: string;
  rank: number;
  title: string;
  root_cause: string;
  confidence: number; // 0 to 1
  rationale: string;
  supporting_evidence_ids: string[]; // actual log IDs e.g. ["LOG-8841-02", "LOG-8841-04"]
  contradicting_evidence?: string;
  recommended_remediation_action: SandboxActionType;
  relevant_runbook_id?: string; // actual runbook ID e.g. "RBK-DB-POOL-01"
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface InvestigationRun {
  id: string;
  incident_id: string;
  model_name: string;
  summary: string;
  confidence_score: number;
  uncertainty_explanation: string;
  missing_information: string[];
  alternative_explanations: string[];
  hypotheses: InvestigationHypothesis[];
  evidence_citations: InvestigationEvidence[];
  status: 'running' | 'completed' | 'failed';
  tokens_used?: number;
  created_at: string;
}

export type SandboxActionType =
  | 'SIMULATE_INCREASE_CONNECTION_POOL'
  | 'SIMULATE_RELEASE_STALE_CONNECTIONS'
  | 'SIMULATE_RESTORE_KNOWN_GOOD_CONFIG'
  | 'SIMULATE_RESTART_HEALTHY_SERVICE';

export interface VerificationCriterion {
  metric: string;
  target_condition: string;
  threshold_value: number | string;
  observed_value?: number | string;
  passed?: boolean;
}

export interface RemediationProposal {
  id: string;
  incident_id: string;
  investigation_id?: string;
  action_type: SandboxActionType;
  plan_hash: string; // SHA-256 hash of proposal identity and all safety-relevant plan fields
  parameters: Record<string, any>;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  expected_effect: string;
  rollback_instructions: string;
  verification_criteria: VerificationCriterion[];
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'cancelled';
  created_at: string;
}

export interface RemediationApproval {
  id: string;
  proposal_id: string;
  approver_email: string;
  approver_name: string;
  decision: 'approved' | 'rejected';
  comments?: string;
  plan_hash_confirmed: string;
  created_at: string;
}

export interface RemediationAction {
  id: string;
  proposal_id: string;
  incident_id: string;
  action_type: SandboxActionType;
  executed_by: string;
  execution_status: 'in_progress' | 'completed' | 'failed';
  before_state: IncidentMetrics;
  after_state: IncidentMetrics;
  execution_logs: string[];
  started_at: string;
  completed_at?: string;
}

export type VerificationStatus =
  | 'VERIFIED_RECOVERED'
  | 'PARTIALLY_RECOVERED'
  | 'RECOVERY_FAILED';

export interface VerificationResult {
  id: string;
  incident_id: string;
  action_id?: string;
  status: VerificationStatus;
  baseline_metrics: IncidentMetrics;
  observed_metrics: IncidentMetrics;
  criteria_results: VerificationCriterion[];
  explanation: string;
  created_at: string;
}

export type AuditStage =
  | 'OBSERVE'
  | 'INVESTIGATE'
  | 'PROPOSE'
  | 'APPROVE'
  | 'REJECT'
  | 'EXECUTE'
  | 'VERIFY'
  | 'RESET';

export type AuditActor = 'AI_AGENT' | 'HUMAN_OPERATOR' | 'SANDBOX_ENGINE';

export interface AuditEvent {
  id: string;
  incident_id: string;
  action_stage: AuditStage;
  actor_type: AuditActor;
  actor_name: string;
  summary: string;
  details: Record<string, any>;
  timestamp: string;
}
