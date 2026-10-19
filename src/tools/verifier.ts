import { randomUUID } from 'node:crypto';
import type { IncidentMetrics, VerificationCriterion, VerificationResult, VerificationStatus } from '../agent/types.ts';

export function evaluateVerification(
  incidentId: string,
  actionId: string,
  baseline: IncidentMetrics,
  observed: IncidentMetrics,
  criteria: VerificationCriterion[],
  options?: { forceFail?: boolean }
): VerificationResult {
  let passedCount = 0;
  const criteria_results: VerificationCriterion[] = [];
  const failureReasons: string[] = [];

  for (const crit of criteria) {
    let passed = false;
    let observedVal: number | string = 'N/A';

    if (crit.metric.includes('connection_utilization') || crit.metric.includes('pool')) {
      observedVal = observed.connection_utilization_pct ?? 100;
      const targetThreshold = typeof crit.threshold_value === 'number' ? crit.threshold_value : parseFloat(crit.threshold_value as string);
      passed = (observedVal as number) <= targetThreshold;
      if (!passed) failureReasons.push(`Connection utilization (${observedVal}%) exceeds target threshold (${targetThreshold}%)`);
    } else if (crit.metric.includes('latency') || crit.metric.includes('p99')) {
      observedVal = observed.p99_latency_ms ?? 9999;
      const targetThreshold = typeof crit.threshold_value === 'number' ? crit.threshold_value : parseFloat(crit.threshold_value as string);
      passed = (observedVal as number) <= targetThreshold;
      if (!passed) failureReasons.push(`P99 latency (${observedVal}ms) is higher than target limit (${targetThreshold}ms)`);
    } else if (crit.metric.includes('error_rate') || crit.metric.includes('500')) {
      observedVal = observed.http_500_error_rate_pct ?? observed.http_error_rate_pct ?? 100;
      const targetThreshold = typeof crit.threshold_value === 'number' ? crit.threshold_value : parseFloat(crit.threshold_value as string);
      passed = (observedVal as number) <= targetThreshold;
      if (!passed) failureReasons.push(`Error rate (${observedVal}%) exceeds maximum allowable threshold (${targetThreshold}%)`);
    } else if (crit.metric.includes('health') || crit.metric.includes('probe')) {
      observedVal = observed.health_check_status ?? 'FAILING';
      passed = observedVal === 'HEALTHY' || observedVal === crit.threshold_value;
      if (!passed) failureReasons.push(`Health check status is "${observedVal}", expected "HEALTHY"`);
    } else if (crit.metric.includes('config') || crit.metric.includes('version')) {
      observedVal = observed.active_config_version ?? 'unknown';
      passed = observedVal === crit.threshold_value;
      if (!passed) failureReasons.push(`Active configuration version "${observedVal}" does not match target "${crit.threshold_value}"`);
    } else {
      // Default numeric or equality check
      observedVal = (observed as any)[crit.metric] ?? 'N/A';
      passed = String(observedVal) === String(crit.threshold_value);
      if (!passed) failureReasons.push(`Metric "${crit.metric}" observed value "${observedVal}" does not meet target "${crit.threshold_value}"`);
    }

    if (options?.forceFail) {
      passed = false;
      failureReasons.push(`Simulated test scenario: forced recovery failure`);
    }

    if (passed) passedCount++;

    criteria_results.push({
      ...crit,
      observed_value: observedVal,
      passed,
    });
  }

  let status: VerificationStatus = 'RECOVERY_FAILED';
  if (passedCount === criteria_results.length && criteria_results.length > 0) {
    status = 'VERIFIED_RECOVERED';
  } else if (passedCount > 0) {
    status = 'PARTIALLY_RECOVERED';
  }

  const explanation = status === 'VERIFIED_RECOVERED'
    ? `All ${criteria_results.length} telemetry verification gates passed. Service health confirmed nominal and recovered.`
    : status === 'PARTIALLY_RECOVERED'
    ? `${passedCount} of ${criteria_results.length} verification criteria passed. Residual anomalies remain: ${failureReasons.join('; ')}`
    : `Verification failed. Preconditions for recovery not met: ${failureReasons.join('; ')}`;

  return {
    id: `VERIF-${randomUUID().toUpperCase()}`,
    incident_id: incidentId,
    action_id: actionId,
    status,
    baseline_metrics: baseline,
    observed_metrics: observed,
    criteria_results,
    explanation,
    created_at: new Date().toISOString(),
  };
}
