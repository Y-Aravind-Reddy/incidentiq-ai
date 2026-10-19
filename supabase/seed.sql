-- IncidentIQ AI: Seed Data Script
-- Populates synthetic SRE fixtures for Scenario A (DB Pool Exhaustion) & Scenario B (HTTP 500 Spike)

-- Safe to re-run: seed only the fixed synthetic demo rows and leave all other data intact.

-- 1. Profiles
INSERT INTO profiles (id, email, full_name, role, team) VALUES
('a0000000-0000-0000-0000-000000000001', 'sre-oncall@incidentiq.internal', 'Elena Rostova', 'Principal SRE', 'Platform Core Reliability'),
('a0000000-0000-0000-0000-000000000002', 'devops-lead@incidentiq.internal', 'Marcus Vance', 'Staff DevOps Engineer', 'Infrastructure Command')
ON CONFLICT (id) DO NOTHING;

-- 2. Incidents
INSERT INTO incidents (id, title, description, severity, status, environment, service_name, metrics, created_at, updated_at) VALUES
(
  'INC-2026-8841',
  'Production Database Connection Pool Exhaustion & Latency Spike',
  'Primary Postgres client connection pool reached 98% saturation on auth-payment-gateway. Connection acquisition timeout elevated to 14,800ms, causing cascading request degradation and 504 gateway timeouts.',
  'critical',
  'open',
  'sandbox',
  'auth-payment-gateway',
  '{
    "connection_utilization_pct": 98.4,
    "connection_acquisition_timeout_count": 342,
    "p99_latency_ms": 4820,
    "http_error_rate_pct": 14.2,
    "health_check_status": "DEGRADED",
    "active_pool_size": 25,
    "max_pool_limit": 25
  }'::jsonb,
  NOW() - INTERVAL '42 minutes',
  NOW() - INTERVAL '5 minutes'
),
(
  'INC-2026-9024',
  'API Gateway HTTP 500 Spike Post-Config Deployment',
  'HTTP 500 error rate spiked to 28.6% across edge ingress routes following deployment rev-2026.4.19b. Schema validation errors reported on upstream payload transformer.',
  'high',
  'open',
  'sandbox',
  'edge-routing-service',
  '{
    "http_500_error_rate_pct": 28.6,
    "p99_latency_ms": 2350,
    "health_check_status": "FAILING",
    "active_config_version": "rev-2026.4.19b-canary",
    "known_good_version": "rev-2026.4.18-stable"
  }'::jsonb,
  NOW() - INTERVAL '18 minutes',
  NOW() - INTERVAL '2 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Incident Logs
-- Logs for INC-2026-8841 (Database Pool Exhaustion)
INSERT INTO incident_logs (id, incident_id, timestamp, severity, service_name, message, metadata) VALUES
('LOG-8841-01', 'INC-2026-8841', NOW() - INTERVAL '40 minutes', 'WARN', 'auth-payment-gateway', 'Connection pool usage reached 82% threshold (20/25 active connections held by worker pool)', '{"pool_active": 20, "pool_max": 25, "queue_depth": 4}'::jsonb),
('LOG-8841-02', 'INC-2026-8841', NOW() - INTERVAL '36 minutes', 'ERROR', 'auth-payment-gateway', 'Acquisition timeout: client thread checkout waited 5000ms without acquiring connection from pool', '{"caller": "TokenVerificationHandler", "timeout_ms": 5000, "pool_state": "exhausted"}'::jsonb),
('LOG-8841-03', 'INC-2026-8841', NOW() - INTERVAL '32 minutes', 'FATAL', 'auth-payment-gateway', 'Unhandled DatabaseConnectionException: timeout waiting for connection pool lease after 15000ms', '{"error_code": "PG_POOL_EXHAUSTED", "host": "pg-primary-sandbox.internal:5432"}'::jsonb),
('LOG-8841-04', 'INC-2026-8841', NOW() - INTERVAL '28 minutes', 'ERROR', 'auth-payment-gateway', 'Database connection leak suspected: 8 idle-in-transaction connections older than 180s detected', '{"stale_conn_ids": ["c-9821", "c-9822", "c-9827", "c-9830"], "transaction_age_s": 210}'::jsonb),
('LOG-8841-05', 'INC-2026-8841', NOW() - INTERVAL '20 minutes', 'WARN', 'load-balancer-ingress', 'Upstream latency threshold breached: p99 response time 4,820ms for /v1/auth/exchange', '{"endpoint": "/v1/auth/exchange", "latency_ms": 4820, "target_sla_ms": 250}'::jsonb),
('LOG-8841-06', 'INC-2026-8841', NOW() - INTERVAL '15 minutes', 'FATAL', 'health-monitor', 'Synthetic health-check FAILED for auth-payment-gateway: /ready probe returned 503 Service Unavailable', '{"probe": "/ready", "status": 503, "detail": "db ping failure"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Logs for INC-2026-9024 (HTTP 500 Spike)
INSERT INTO incident_logs (id, incident_id, timestamp, severity, service_name, message, metadata) VALUES
('LOG-9024-01', 'INC-2026-9024', NOW() - INTERVAL '17 minutes', 'INFO', 'deployment-agent', 'Config map applied: edge-routing-config updated to version rev-2026.4.19b-canary', '{"author": "cd-pipeline", "release_id": "rel-8812"}'::jsonb),
('LOG-9024-02', 'INC-2026-9024', NOW() - INTERVAL '15 minutes', 'ERROR', 'edge-routing-service', 'ConfigValidationError: missing required parameter "upstream_retry_budget_ms" in active configuration', '{"config_version": "rev-2026.4.19b-canary", "key_missing": "upstream_retry_budget_ms"}'::jsonb),
('LOG-9024-03', 'INC-2026-9024', NOW() - INTERVAL '13 minutes', 'FATAL', 'edge-routing-service', 'HTTP 500 Internal Server Error returned on 812 requests/min during header transformation pass', '{"error_type": "NullReferenceException", "pipeline_stage": "header_transform"}'::jsonb),
('LOG-9024-04', 'INC-2026-9024', NOW() - INTERVAL '10 minutes', 'ERROR', 'health-monitor', 'Service health check degraded: 3 of 4 ingress pods reporting Unhealthy state', '{"unhealthy_replicas": 3, "total_replicas": 4}'::jsonb),
('LOG-9024-05', 'INC-2026-9024', NOW() - INTERVAL '6 minutes', 'WARN', 'edge-routing-service', 'Configuration hash mismatch with canonical baseline: expected sha256:7f4a... observed sha256:3e1c...', '{"canonical": "rev-2026.4.18-stable", "running": "rev-2026.4.19b-canary"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 4. Runbooks (Synthetic, verified SRE documentation)
INSERT INTO runbooks (id, title, description, content, tags, relevant_severity, troubleshooting_steps, approved_remediation_guidance, rollback_instructions, source_type) VALUES
(
  'RBK-DB-POOL-01',
  'Database Connection Pool Saturation & Starvation',
  'Standard operating procedure for diagnosing and remediating PostgreSQL / MySQL client pool exhaustion in high-throughput microservices.',
  '# SOP: DB Connection Pool Exhaustion\n\nWhen client connections exceed 90% of pool capacity, acquisition timeouts trigger cascading failures.\n\n### Root Causes\n1. Abrupt traffic surges exceeding provisioned connection capacity.\n2. Leaked or dangling uncommitted transactions in long-running threads.\n3. Slow queries holding lock chains.\n\n### Prescribed Safe Action\n1. Safely increase the active connection pool limit from 25 to 50.\n2. Terminate orphaned and stale connections idle > 120s.\n3. Verify health probe latency drops below 250ms.',
  ARRAY['database', 'connection-pool', 'latency', 'postgres'],
  ARRAY['critical', 'high'],
  '[
    {"step": 1, "description": "Verify current pool utilization via metric endpoint /metrics#pool_active"},
    {"step": 2, "description": "Inspect pg_stat_activity for idle-in-transaction connections older than 120 seconds"},
    {"step": 3, "description": "Apply approved sandbox parameter SIMULATE_INCREASE_CONNECTION_POOL to expand pool ceiling to 50"},
    {"step": 4, "description": "Execute SIMULATE_RELEASE_STALE_CONNECTIONS to flush unreleased handles"}
  ]'::jsonb,
  'Issue SIMULATE_INCREASE_CONNECTION_POOL with new_limit=50, followed by SIMULATE_RELEASE_STALE_CONNECTIONS with max_idle_seconds=120.',
  'Revert connection pool configuration back to baseline limit (25) via config re-apply if memory threshold exceeds 85%.',
  'synthetic_verified'
),
(
  'RBK-CONFIG-FAIL-02',
  'API Gateway Bad Configuration Mismatch & HTTP 500 Surge',
  'Resolution guide for application crashes caused by invalid, unparsed, or schema-incompatible configuration deployments.',
  '# SOP: Configuration Mismatch & 500 Error Surge\n\nWhen canary or rolling config deployment introduces syntax or missing schema keys, application workers throw 500 NullReference exceptions.\n\n### Diagnosis\n- Inspect configuration change logs\n- Compare active config hash with known-good release tag\n\n### Approved Remediation\n- Execute SIMULATE_RESTORE_KNOWN_GOOD_CONFIG with target_version=rev-2026.4.18-stable\n- Gracefully reload service workers to pick up validated configuration.',
  ARRAY['config', 'http-500', 'deployment', 'canary'],
  ARRAY['critical', 'high'],
  '[
    {"step": 1, "description": "Audit recent config change events in deployment-agent logs"},
    {"step": 2, "description": "Confirm schema mismatch error messages in edge-routing-service"},
    {"step": 3, "description": "Select known-good revision tag rev-2026.4.18-stable"},
    {"step": 4, "description": "Submit remediation proposal for human approval and execute rollback in sandbox"}
  ]'::jsonb,
  'Execute SIMULATE_RESTORE_KNOWN_GOOD_CONFIG targeting the verified stable tag "rev-2026.4.18-stable".',
  'If stable config rollback fails to re-initialize ingress, execute SIMULATE_RESTART_HEALTHY_SERVICE to purge worker memory.',
  'synthetic_verified'
),
(
  'RBK-SVC-HEALTH-03',
  'Microservice Liveness & Readiness Probe Failure',
  'Triaging recurring probe failures and HTTP 503 unavailability on containerized microservices.',
  '# SOP: Liveness/Readiness Probe Failures\n\nReadiness probes drop pods from service mesh endpoints when dependency connections fail.\n\n### Remediation\n- Resolve underlying DB or configuration blockage before cycling pods to prevent crashloop.',
  ARRAY['health-check', 'probes', 'kubernetes', 'reliability'],
  ARRAY['high', 'medium'],
  '[
    {"step": 1, "description": "Check container exit codes and stderr buffer"},
    {"step": 2, "description": "Verify external dependencies (DB, Redis, upstream auth)"},
    {"step": 3, "description": "Restart service after dependency health is restored"}
  ]'::jsonb,
  'Execute SIMULATE_RESTART_HEALTHY_SERVICE after confirming backing datastores are healthy.',
  'Restore previous container image tag if restart fails verification.',
  'synthetic_verified'
)
ON CONFLICT (id) DO NOTHING;
