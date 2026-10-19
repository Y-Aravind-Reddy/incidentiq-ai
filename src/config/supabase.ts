import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, getSupabaseConfigurationError } from './env.ts';

let supabaseClient: SupabaseClient | null = null;
let databaseReady = false;
let diagnosticMessage = '';

const cleanUrl = env.SUPABASE_URL.trim();
const cleanKey = env.SUPABASE_SECRET_KEY.trim();
const configurationError = getSupabaseConfigurationError(cleanUrl, cleanKey);

if (!configurationError) {
  try {
    supabaseClient = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    console.info('[IncidentIQ] Supabase server client configured. Database access is required for application persistence; errors will not fall back to memory.');
  } catch {
    console.error('[IncidentIQ] Supabase client creation failed. Check the server-side URL and key configuration.');
  }
} else {
  console.warn(`[IncidentIQ] WARNING: ${configurationError} Application data is currently held in memory and will not persist to Supabase.`);
}

export async function verifySupabaseDatabase(): Promise<{
  configured: boolean;
  connected: boolean;
  url: string;
  tables_found: string[];
  tables_missing: string[];
  diagnostic: string;
}> {
  if (!supabaseClient || !cleanUrl) {
    return {
      configured: false,
      connected: false,
      url: cleanUrl || '<not configured>',
      tables_found: [],
      tables_missing: [],
      diagnostic: `${configurationError || 'Supabase is not configured.'} Demo state is in memory and will not survive a server restart.`,
    };
  }

  const expectedTables = [
    'profiles', 'incidents', 'incident_logs', 'runbooks',
    'investigation_runs', 'investigation_hypotheses', 'investigation_evidence',
    'remediation_proposals', 'remediation_approvals', 'remediation_actions',
    'verification_results', 'audit_events',
  ];
  const tables_found: string[] = [];
  const tables_missing: string[] = [];

  try {
    for (const tableName of expectedTables) {
      const { error } = await supabaseClient.from(tableName).select('id').limit(1);
      if (!error) tables_found.push(tableName);
      else tables_missing.push(tableName);
    }

    if (tables_found.length === expectedTables.length) {
      databaseReady = true;
      diagnosticMessage = 'All 12 Supabase tables are accessible.';
    } else if (tables_found.length > 0) {
      databaseReady = false;
      diagnosticMessage = `Partial schema: ${tables_found.length}/12 tables accessible. Check the migration and access policies.`;
    } else {
      databaseReady = false;
      diagnosticMessage = 'Supabase responded, but expected tables are unavailable. Run supabase/migrations/001_initial_schema.sql and verify access policies.';
    }
  } catch {
    databaseReady = false;
    diagnosticMessage = 'Connection check failed. Verify network access and the Supabase URL/key configuration.';
  }

  return { configured: true, connected: databaseReady, url: cleanUrl, tables_found, tables_missing, diagnostic: diagnosticMessage };
}

if (supabaseClient) {
  verifySupabaseDatabase().then((result) => {
    if (!result.connected) console.warn('[IncidentIQ] Supabase schema check:', result.diagnostic);
  }).catch(() => {
    console.warn('[IncidentIQ] Supabase schema check failed. Verify database setup and access policies.');
  });
}

export const supabase = supabaseClient;
export const isSupabaseConfigured = (): boolean => Boolean(supabaseClient);
export const isSupabaseDatabaseReady = (): boolean => databaseReady;
export const getSupabaseDiagnostics = () => ({
  configured: Boolean(supabaseClient),
  database_ready: databaseReady,
  url: cleanUrl,
    diagnostic: diagnosticMessage || (supabaseClient ? 'Schema check in progress.' : 'Supabase is not configured; demo state is in memory and will not survive a server restart.'),
});
