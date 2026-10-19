import type { IncidentLog } from '../agent/types.ts';

export interface ParsedLogAnalysis {
  total_logs: number;
  fatal_count: number;
  error_count: number;
  warn_count: number;
  info_count: number;
  unique_services: string[];
  primary_suspect_service: string;
  key_symptoms: string[];
  anomalies: Array<{
    log_id: string;
    timestamp: string;
    severity: string;
    summary: string;
    extracted_tokens: Record<string, any>;
  }>;
}

export function parseIncidentLogs(logs: IncidentLog[]): ParsedLogAnalysis {
  let fatal_count = 0;
  let error_count = 0;
  let warn_count = 0;
  let info_count = 0;
  const serviceCounts: Record<string, number> = {};
  const symptoms: string[] = [];

  const anomalies: ParsedLogAnalysis['anomalies'] = [];

  for (const log of logs) {
    if (log.severity === 'FATAL') fatal_count++;
    else if (log.severity === 'ERROR') error_count++;
    else if (log.severity === 'WARN') warn_count++;
    else info_count++;

    serviceCounts[log.service_name] = (serviceCounts[log.service_name] || 0) + 1;

    // Detect key failure signatures
    const msgLower = log.message.toLowerCase();
    if (msgLower.includes('pool') || msgLower.includes('timeout') || msgLower.includes('acquisition')) {
      if (!symptoms.includes('Database connection pool exhaustion')) {
        symptoms.push('Database connection pool exhaustion');
      }
    }
    if (msgLower.includes('stale') || msgLower.includes('leak') || msgLower.includes('idle-in-transaction')) {
      if (!symptoms.includes('Unreleased stale database connections')) {
        symptoms.push('Unreleased stale database connections');
      }
    }
    if (msgLower.includes('500') || msgLower.includes('internal server error')) {
      if (!symptoms.includes('HTTP 500 internal server error spike')) {
        symptoms.push('HTTP 500 internal server error spike');
      }
    }
    if (msgLower.includes('config') || msgLower.includes('mismatch') || msgLower.includes('missing required parameter')) {
      if (!symptoms.includes('Configuration schema mismatch or missing parameters')) {
        symptoms.push('Configuration schema mismatch or missing parameters');
      }
    }

    if (log.severity === 'FATAL' || log.severity === 'ERROR' || log.severity === 'WARN') {
      anomalies.push({
        log_id: log.id,
        timestamp: log.timestamp,
        severity: log.severity,
        summary: log.message,
        extracted_tokens: log.metadata || {},
      });
    }
  }

  // Find service with highest error rate
  let maxCount = -1;
  let primary_suspect_service = 'unknown';
  for (const [svc, count] of Object.entries(serviceCounts)) {
    if (count > maxCount) {
      maxCount = count;
      primary_suspect_service = svc;
    }
  }

  return {
    total_logs: logs.length,
    fatal_count,
    error_count,
    warn_count,
    info_count,
    unique_services: Object.keys(serviceCounts),
    primary_suspect_service,
    key_symptoms: symptoms.length > 0 ? symptoms : ['Unspecified service degradation'],
    anomalies,
  };
}
