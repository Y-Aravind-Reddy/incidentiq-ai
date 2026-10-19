import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function checkSupabase() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });
  const { env, getSupabaseConfigurationError } = await import('../src/config/env.ts');
  const url = env.SUPABASE_URL.trim();
  const key = env.SUPABASE_SECRET_KEY.trim();
  const configurationError = getSupabaseConfigurationError(url, key);

  if (configurationError) {
    console.error(`[Supabase check] ${configurationError}`);
    console.error('[Supabase check] Set these values in the project-root .env file. No request was sent.');
    process.exitCode = 1;
    return;
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('[Supabase check] Testing configured HTTPS endpoint.');
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    console.log(`[Supabase check] REST endpoint: HTTP ${response.status}`);
    await response.body?.cancel();
    if (!response.ok) process.exitCode = 1;
  } catch {
    console.error('[Supabase check] REST endpoint request failed. Verify network access and the project URL.');
    process.exitCode = 1;
    return;
  }

  const tables = [
    'profiles', 'incidents', 'incident_logs', 'runbooks',
    'investigation_runs', 'investigation_hypotheses', 'investigation_evidence',
    'remediation_proposals', 'remediation_approvals', 'remediation_actions',
    'verification_results', 'audit_events',
  ];

  for (const table of tables) {
    try {
      const { error } = await client.from(table).select('id').limit(1);
      if (error) {
        const isMissing = error.code === '42P01' || error.code === 'PGRST205';
        const status = isMissing ? 'missing' : 'inaccessible';
        console.error(`[Supabase check] ${table}: ${status} (code ${error.code || 'unknown'}). Check the migration and access policies.`);
        process.exitCode = 1;
      } else {
        console.log(`[Supabase check] ${table}: accessible`);
      }
    } catch {
      console.error(`[Supabase check] ${table}: inaccessible (request failed). Check connectivity and access policies.`);
      process.exitCode = 1;
    }
  }
}

checkSupabase().catch(() => {
  console.error('[Supabase check] Unexpected failure. Check the server-side configuration and database setup.');
  process.exitCode = 1;
});
