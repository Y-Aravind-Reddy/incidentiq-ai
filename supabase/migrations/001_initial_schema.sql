-- IncidentIQ AI: Initial Database Schema
-- Enterprise AI Incident Resolution Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sre_engineer',
  team TEXT NOT NULL DEFAULT 'Core Reliability',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY, -- e.g., 'INC-2026-8841'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'awaiting_approval', 'remediating', 'verifying', 'resolved', 'failed')),
  environment TEXT NOT NULL DEFAULT 'sandbox',
  service_name TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Incident Logs Table
CREATE TABLE IF NOT EXISTS incident_logs (
  id TEXT PRIMARY KEY, -- e.g., 'LOG-8841-01'
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG')),
  service_name TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Runbooks Table
CREATE TABLE IF NOT EXISTS runbooks (
  id TEXT PRIMARY KEY, -- e.g., 'RBK-DB-POOL-01'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  relevant_severity TEXT[] NOT NULL DEFAULT '{}',
  troubleshooting_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_remediation_guidance TEXT NOT NULL,
  rollback_instructions TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'synthetic_verified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Investigation Runs Table
CREATE TABLE IF NOT EXISTS investigation_runs (
  id TEXT PRIMARY KEY DEFAULT ('INV-' || uuid_generate_v4()),
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  uncertainty_explanation TEXT NOT NULL,
  missing_information TEXT[] NOT NULL DEFAULT '{}',
  alternative_explanations TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Investigation Hypotheses Table
CREATE TABLE IF NOT EXISTS investigation_hypotheses (
  id TEXT PRIMARY KEY DEFAULT ('HYP-' || uuid_generate_v4()),
  investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  title TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  rationale TEXT NOT NULL,
  supporting_evidence_ids TEXT[] NOT NULL DEFAULT '{}',
  contradicting_evidence TEXT,
  recommended_remediation_action TEXT NOT NULL,
  relevant_runbook_id TEXT REFERENCES runbooks(id),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Investigation Evidence Table
CREATE TABLE IF NOT EXISTS investigation_evidence (
  id TEXT PRIMARY KEY DEFAULT ('EVD-' || uuid_generate_v4()),
  investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
  log_id TEXT NOT NULL REFERENCES incident_logs(id) ON DELETE CASCADE,
  relevance TEXT NOT NULL CHECK (relevance IN ('HIGH', 'MEDIUM', 'LOW', 'CONTRADICTING')),
  correlation_rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Remediation Proposals Table
CREATE TABLE IF NOT EXISTS remediation_proposals (
  id TEXT PRIMARY KEY DEFAULT ('PROP-' || uuid_generate_v4()),
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  investigation_id TEXT REFERENCES investigation_runs(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'SIMULATE_INCREASE_CONNECTION_POOL',
    'SIMULATE_RELEASE_STALE_CONNECTIONS',
    'SIMULATE_RESTORE_KNOWN_GOOD_CONFIG',
    'SIMULATE_RESTART_HEALTHY_SERVICE'
  )),
  plan_hash TEXT NOT NULL, -- SHA-256 fingerprint of immutable parameters
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  expected_effect TEXT NOT NULL,
  rollback_instructions TEXT NOT NULL,
  verification_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Remediation Approvals Table
CREATE TABLE IF NOT EXISTS remediation_approvals (
  id TEXT PRIMARY KEY DEFAULT ('APPR-' || uuid_generate_v4()),
  proposal_id TEXT NOT NULL REFERENCES remediation_proposals(id) ON DELETE CASCADE,
  approver_email TEXT NOT NULL,
  approver_name TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  comments TEXT,
  plan_hash_confirmed TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Remediation Actions (Execution Log) Table
CREATE TABLE IF NOT EXISTS remediation_actions (
  id TEXT PRIMARY KEY DEFAULT ('ACT-' || uuid_generate_v4()),
  proposal_id TEXT NOT NULL REFERENCES remediation_proposals(id) ON DELETE CASCADE,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  executed_by TEXT NOT NULL,
  execution_status TEXT NOT NULL CHECK (execution_status IN ('in_progress', 'completed', 'failed')),
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  execution_logs TEXT[] NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 11. Verification Results Table
CREATE TABLE IF NOT EXISTS verification_results (
  id TEXT PRIMARY KEY DEFAULT ('VERIF-' || uuid_generate_v4()),
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action_id TEXT REFERENCES remediation_actions(id),
  status TEXT NOT NULL CHECK (status IN ('VERIFIED_RECOVERED', 'PARTIALLY_RECOVERED', 'RECOVERY_FAILED')),
  baseline_metrics JSONB NOT NULL,
  observed_metrics JSONB NOT NULL,
  criteria_results JSONB NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY DEFAULT ('AUD-' || uuid_generate_v4()),
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action_stage TEXT NOT NULL CHECK (action_stage IN (
    'OBSERVE', 'INVESTIGATE', 'PROPOSE', 'APPROVE', 'REJECT', 'EXECUTE', 'VERIFY', 'RESET'
  )),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('AI_AGENT', 'HUMAN_OPERATOR', 'SANDBOX_ENGINE')),
  actor_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_incident_logs_incident_id ON incident_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_investigation_hypotheses_inv ON investigation_hypotheses(investigation_id);
CREATE INDEX IF NOT EXISTS idx_proposals_incident_id ON remediation_proposals(incident_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_incident_id ON audit_events(incident_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_incident_id ON verification_results(incident_id);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE runbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated/authorized callers; prevent arbitrary modification
-- Re-runnable, service-role-only policies. The application uses the server-side
-- SUPABASE_SECRET_KEY; browser/anon callers must not read incident or audit data.
DROP POLICY IF EXISTS "Allow read on incidents" ON incidents;
DROP POLICY IF EXISTS "Allow read on incident_logs" ON incident_logs;
DROP POLICY IF EXISTS "Allow read on runbooks" ON runbooks;
DROP POLICY IF EXISTS "Allow read on investigation_runs" ON investigation_runs;
DROP POLICY IF EXISTS "Allow read on remediation_proposals" ON remediation_proposals;
DROP POLICY IF EXISTS "Allow read on audit_events" ON audit_events;
CREATE POLICY "Allow read on incidents" ON incidents FOR SELECT TO service_role USING (true);
CREATE POLICY "Allow read on incident_logs" ON incident_logs FOR SELECT TO service_role USING (true);
CREATE POLICY "Allow read on runbooks" ON runbooks FOR SELECT TO service_role USING (true);
CREATE POLICY "Allow read on investigation_runs" ON investigation_runs FOR SELECT TO service_role USING (true);
CREATE POLICY "Allow read on remediation_proposals" ON remediation_proposals FOR SELECT TO service_role USING (true);
CREATE POLICY "Allow read on audit_events" ON audit_events FOR SELECT TO service_role USING (true);
