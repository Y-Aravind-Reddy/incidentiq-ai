import type { IncidentMetrics, RemediationProposal, SandboxActionType } from '../agent/types.ts';

export interface SandboxExecutionResult {
  success: boolean;
  action_type: SandboxActionType;
  before_state: IncidentMetrics;
  after_state: IncidentMetrics;
  execution_logs: string[];
  errorMessage?: string;
}

export function executeSandboxRemediation(
  proposal: RemediationProposal,
  currentMetrics: IncidentMetrics,
  options?: { forceFailure?: boolean }
): SandboxExecutionResult {
  const execution_logs: string[] = [];
  const before_state: IncidentMetrics = JSON.parse(JSON.stringify(currentMetrics));
  const after_state: IncidentMetrics = JSON.parse(JSON.stringify(currentMetrics));

  execution_logs.push(`[SANDBOX:INIT] Initializing sandboxed execution engine for proposal ${proposal.id}`);
  execution_logs.push(`[SANDBOX:AUTH] Preconditions verified. Plan hash validation: PASSED`);
  execution_logs.push(`[SANDBOX:ACTION] Action Type: ${proposal.action_type}`);

  if (options?.forceFailure) {
    execution_logs.push(`[SANDBOX:WARN] Simulating realistic transient subsystem failure mode`);
    execution_logs.push(`[SANDBOX:ERROR] Operation failed precondition check: Target subsystem busy / lock acquisition failed`);
    return {
      success: false,
      action_type: proposal.action_type,
      before_state,
      after_state,
      execution_logs,
      errorMessage: 'Subsystem rejected adjustment due to high concurrent lock contention.',
    };
  }

  switch (proposal.action_type) {
    case 'SIMULATE_INCREASE_CONNECTION_POOL': {
      const newLimit = proposal.parameters?.new_limit || 50;
      execution_logs.push(`[SANDBOX:PARAM] Re-configuring pool max_limit: ${currentMetrics.max_pool_limit || 25} -> ${newLimit}`);
      execution_logs.push(`[SANDBOX:EXEC] Dynamic connection pool resized to ${newLimit} connections`);
      execution_logs.push(`[SANDBOX:EXEC] Re-balancing active connection queue`);

      // Update state
      after_state.max_pool_limit = newLimit;
      after_state.active_pool_size = Math.min(newLimit, currentMetrics.active_pool_size || 25);
      // Realistic simulation: utilization drops significantly
      after_state.connection_utilization_pct = 42.0;
      after_state.connection_acquisition_timeout_count = 0;
      after_state.p99_latency_ms = 180;
      after_state.http_error_rate_pct = 0.05;
      after_state.health_check_status = 'HEALTHY';
      break;
    }

    case 'SIMULATE_RELEASE_STALE_CONNECTIONS': {
      const maxIdleSeconds = proposal.parameters?.max_idle_seconds || 120;
      execution_logs.push(`[SANDBOX:PARAM] Scanning pg_stat_activity for idle-in-transaction > ${maxIdleSeconds}s`);
      execution_logs.push(`[SANDBOX:EXEC] Terminated 8 orphaned stale connections`);
      execution_logs.push(`[SANDBOX:EXEC] Garbage collection completed on connection manager pool`);

      after_state.connection_utilization_pct = 48.5;
      after_state.connection_acquisition_timeout_count = 0;
      after_state.p99_latency_ms = 195;
      after_state.health_check_status = 'HEALTHY';
      break;
    }

    case 'SIMULATE_RESTORE_KNOWN_GOOD_CONFIG': {
      const targetVersion = proposal.parameters?.target_version || 'rev-2026.4.18-stable';
      execution_logs.push(`[SANDBOX:PARAM] Deploying config revision: ${targetVersion}`);
      execution_logs.push(`[SANDBOX:EXEC] Validating JSON schema against schema registry v2: PASSED`);
      execution_logs.push(`[SANDBOX:EXEC] Rolling update: applied configuration to 4 ingress replicas`);
      execution_logs.push(`[SANDBOX:EXEC] Ingress route table successfully compiled and re-loaded`);

      after_state.active_config_version = targetVersion;
      after_state.http_500_error_rate_pct = 0.02;
      after_state.p99_latency_ms = 145;
      after_state.health_check_status = 'HEALTHY';
      break;
    }

    case 'SIMULATE_RESTART_HEALTHY_SERVICE': {
      execution_logs.push(`[SANDBOX:PARAM] Executing zero-downtime rolling restart`);
      execution_logs.push(`[SANDBOX:EXEC] Draining connections on container pods`);
      execution_logs.push(`[SANDBOX:EXEC] 4/4 pods restarted and passed readiness probes`);

      after_state.health_check_status = 'HEALTHY';
      if (after_state.http_500_error_rate_pct !== undefined) {
        after_state.http_500_error_rate_pct = 0.1;
      }
      after_state.p99_latency_ms = 160;
      break;
    }

    default: {
      execution_logs.push(`[SANDBOX:REJECT] Unauthorized or unknown action type: ${(proposal as any).action_type}`);
      return {
        success: false,
        action_type: proposal.action_type,
        before_state,
        after_state,
        execution_logs,
        errorMessage: `Unrecognized action type: ${(proposal as any).action_type}`,
      };
    }
  }

  execution_logs.push(`[SANDBOX:COMPLETE] Remediation execution completed successfully. State captured.`);
  return {
    success: true,
    action_type: proposal.action_type,
    before_state,
    after_state,
    execution_logs,
  };
}
