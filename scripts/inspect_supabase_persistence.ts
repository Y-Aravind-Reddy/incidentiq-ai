import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });
const { env, getSupabaseConfigurationError } = await import('../src/config/env.ts');
const url = env.SUPABASE_URL.trim();
const key = env.SUPABASE_SECRET_KEY.trim();
const configurationError = getSupabaseConfigurationError(url, key);

if (configurationError) {
  console.error(`[Supabase inspection] ${configurationError} No request was sent.`);
  process.exitCode = 1;
} else {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8_000) }) },
  });
  const projectFingerprint = createHash('sha256').update(new URL(url).origin).digest('hex').slice(0, 12);
  console.log(`[Supabase inspection] Project fingerprint: ${projectFingerprint}`);
  const tables = [
    'profiles', 'incidents', 'incident_logs', 'runbooks', 'investigation_runs',
    'investigation_hypotheses', 'investigation_evidence', 'remediation_proposals',
    'remediation_approvals', 'remediation_actions', 'verification_results', 'audit_events',
  ];
  const counts = await Promise.all(tables.map(async (table) => {
    try {
      const { count, error } = await client.from(table).select('id', { count: 'exact', head: true });
      if (error) {
        console.error(`[Supabase inspection] ${table}: inaccessible (${error.code || 'request error'})`);
        process.exitCode = 1;
        return { table, count: null };
      }
      console.log(`[Supabase inspection] ${table}: ${count ?? 0} rows`);
      return { table, count: count ?? 0 };
    } catch {
      console.error(`[Supabase inspection] ${table}: inaccessible (network or request failure)`);
      process.exitCode = 1;
      return { table, count: null };
    }
  }));

  const incidentIds = ['INC-2026-8841', 'INC-2026-9024'];
  const runbookIds = ['RBK-DB-POOL-01', 'RBK-CONFIG-FAIL-02', 'RBK-SVC-HEALTH-03'];
  const profileIds = [
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
  ];
  const [incidents, runbooks, profiles] = await Promise.all([
    client.from('incidents').select('id').in('id', incidentIds),
    client.from('runbooks').select('id').in('id', runbookIds),
    client.from('profiles').select('id').in('id', profileIds),
  ]);
  for (const result of [incidents, runbooks, profiles]) {
    if (result.error) {
      console.error(`[Supabase inspection] Fixture identity check failed (${result.error.code || 'request error'}).`);
      process.exitCode = 1;
    }
  }
  const fixtureQueriesSucceeded = !incidents.error && !runbooks.error && !profiles.error;
  const fixtureMatch = fixtureQueriesSucceeded &&
    (incidents.data?.length ?? 0) === 2 && (runbooks.data?.length ?? 0) === 3 && (profiles.data?.length ?? 0) === 2;
  if (fixtureQueriesSucceeded) {
    console.log(`[Supabase inspection] Expected synthetic hackathon fixtures: ${fixtureMatch ? 'matched' : 'not fully matched'} (incidents ${incidents.data?.length ?? 0}/2, runbooks ${runbooks.data?.length ?? 0}/3, profiles ${profiles.data?.length ?? 0}/2)`);
  } else {
    console.log('[Supabase inspection] Expected synthetic hackathon fixtures: unverified (read requests failed).');
  }

  if (fixtureMatch) {
  const incidentIdList = (incidents.data ?? []).map((row) => row.id);
  const linkedCounts = async (table: string, column: string, values: string[]) => {
    if (!values.length) return 0;
    const { count, error } = await client.from(table).select('id', { count: 'exact', head: true }).in(column, values);
    if (error) {
      console.error(`[Supabase inspection] Relationship check ${table}.${column}: inaccessible (${error.code || 'request error'})`);
      process.exitCode = 1;
      return 0;
    }
    return count ?? 0;
  };
  const logsCount = await linkedCounts('incident_logs', 'incident_id', incidentIdList);
  const investigationCount = await linkedCounts('investigation_runs', 'incident_id', incidentIdList);
  const { data: investigations } = await client.from('investigation_runs').select('id').in('incident_id', incidentIdList);
  const investigationIds = (investigations ?? []).map((row) => row.id);
  const hypothesisCount = await linkedCounts('investigation_hypotheses', 'investigation_id', investigationIds);
  const evidenceCount = await linkedCounts('investigation_evidence', 'investigation_id', investigationIds);
  const proposalCount = await linkedCounts('remediation_proposals', 'incident_id', incidentIdList);
  const { data: proposals } = await client.from('remediation_proposals').select('id').in('incident_id', incidentIdList);
  const proposalIds = (proposals ?? []).map((row) => row.id);
  const approvalCount = await linkedCounts('remediation_approvals', 'proposal_id', proposalIds);
  const actionCount = await linkedCounts('remediation_actions', 'proposal_id', proposalIds);
  const { data: actions } = await client.from('remediation_actions').select('id').in('proposal_id', proposalIds);
  const actionIds = (actions ?? []).map((row) => row.id);
  const verificationCount = await linkedCounts('verification_results', 'action_id', actionIds);
  const auditCount = await linkedCounts('audit_events', 'incident_id', incidentIdList);
  console.log('[Supabase inspection] Rows linked to the two seeded incidents:');
  console.log(`  incident_logs=${logsCount}, investigation_runs=${investigationCount}, hypotheses=${hypothesisCount}, evidence=${evidenceCount}`);
  console.log(`  proposals=${proposalCount}, approvals=${approvalCount}, actions=${actionCount}, verifications=${verificationCount}, audit_events=${auditCount}`);
  } else {
    console.warn('[Supabase inspection] Do not run workflow writes until the intended hackathon project is confirmed.');
  }
}
