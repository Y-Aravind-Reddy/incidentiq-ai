import { createClient } from '@supabase/supabase-js';
import { env, getSupabaseConfigurationError } from '../src/config/env.ts';
import { canProvisionFirstAdmin, FIRST_ADMIN_EMAIL } from '../src/auth/authorization.ts';

const apply = process.argv.includes('--apply');
const projectRefArg = process.argv.find((argument) => argument.startsWith('--project-ref='))?.slice('--project-ref='.length);
const configError = getSupabaseConfigurationError(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

function safeTransportCategory(error: unknown): string {
  const pending = [error];
  const seen = new Set<unknown>();
  const codes = new Set<string>();
  const names = new Set<string>();
  for (let depth = 0; pending.length && depth < 12; depth += 1) {
    const current = pending.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);
    const item = current as { code?: unknown; name?: unknown; cause?: unknown; errors?: unknown };
    if (typeof item.code === 'string' && /^[A-Z0-9_]{2,40}$/.test(item.code)) codes.add(item.code);
    if (typeof item.name === 'string' && /^[A-Za-z][A-Za-z0-9]*Error$/.test(item.name)) names.add(item.name);
    if (item.cause) pending.push(item.cause);
    if (Array.isArray(item.errors)) pending.push(...item.errors);
  }
  const allCodes = [...codes];
  if (allCodes.some((code) => /^(ENOTFOUND|EAI_AGAIN|EAI_FAIL|ENODATA)$/.test(code))) return `DNS resolution failure (${allCodes.find((code) => /^(ENOTFOUND|EAI_AGAIN|EAI_FAIL|ENODATA)$/.test(code))})`;
  if (allCodes.some((code) => /^(CERT_|ERR_TLS_|UNABLE_TO_VERIFY|DEPTH_ZERO_SELF_SIGNED|SELF_SIGNED_CERT)/.test(code))) return `TLS certificate/handshake failure (${allCodes.find((code) => /^(CERT_|ERR_TLS_|UNABLE_TO_VERIFY|DEPTH_ZERO_SELF_SIGNED|SELF_SIGNED_CERT)/.test(code))})`;
  if (allCodes.some((code) => /^(ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|ERR_SOCKET_TIMEOUT)$/.test(code)) || names.has('AbortError')) return `request timeout${allCodes.length ? ` (${allCodes[0]})` : ''}`;
  if (allCodes.some((code) => /^(ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|UND_ERR_CONNECT|UND_ERR_SOCKET)$/.test(code))) return `connection failure (${allCodes.find((code) => /^(ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|UND_ERR_CONNECT|UND_ERR_SOCKET)$/.test(code))})`;
  if (names.has('TypeError')) return 'network/transport failure (fetch failed; underlying cause unavailable)';
  return 'network/transport failure (underlying cause unavailable)';
}

function safeFailureCategory(error: unknown, transportCategory?: string): string {
  const candidate = error && typeof error === 'object'
    ? error as { status?: unknown; name?: unknown; code?: unknown; cause?: unknown }
    : {};
  if (typeof candidate.status === 'number') {
    if (candidate.status <= 0) return transportCategory ?? safeTransportCategory(error);
    if (candidate.status === 401 || candidate.status === 403) return `authentication/authorization, HTTP ${candidate.status}`;
    if (candidate.status === 429) return 'rate limited, HTTP 429';
    if (candidate.status >= 500) return `Supabase Auth unavailable, HTTP ${candidate.status}`;
    return `Supabase Auth request rejected, HTTP ${candidate.status}`;
  }
  if (candidate.name === 'TypeError') return 'network or TLS failure';
  if (typeof candidate.code === 'string' && /^[A-Z0-9_]{2,32}$/.test(candidate.code)) return `network/runtime error ${candidate.code}`;
  return 'unknown provider error';
}

if (configError) {
  console.error(`Supabase configuration is incomplete: ${configError} No request was sent.`);
  process.exitCode = 1;
} else {
  const projectUrl = new URL(env.SUPABASE_URL);
  const projectRef = projectUrl.hostname.split('.')[0];
  if (!projectRefArg || projectRefArg !== projectRef) {
    console.error('Check stopped. Supply the confirmed project reference with --project-ref=<ref>; it must match the configured Supabase URL. No request was sent.');
    process.exitCode = 1;
  } else {
    let lastTransportCategory: string | undefined;
    const diagnosticFetch: typeof fetch = async (input, init) => {
      try {
        return await globalThis.fetch(input, init);
      } catch (error) {
        lastTransportCategory = safeTransportCategory(error);
        throw error;
      }
    };
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: diagnosticFetch },
    });

    async function findReservedAccount() {
      for (let page = 1; page <= 10000; page += 1) {
        const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
        if (error) throw new Error(`Supabase Auth account lookup failed (${safeFailureCategory(error, lastTransportCategory)}).`);
        const match = data.users.find((user) => user.email?.trim().toLowerCase() === FIRST_ADMIN_EMAIL);
        if (match) return match;
        if (data.users.length < 100) return null;
      }
      throw new Error('Supabase Auth account lookup exceeded the safe page limit.');
    }

    try {
      const account = await findReservedAccount();
      console.log(`Reserved account exists in Supabase Auth: ${account ? 'yes' : 'no'}`);
      console.log(`Reserved account email verified: ${account?.email_confirmed_at ? 'yes' : 'no'}`);
      console.log(`Reserved account currently has admin role: ${account?.app_metadata?.role === 'admin' ? 'yes' : 'no'}`);

      if (!account) {
        console.log('No account was created. Sign up using the reserved address, confirm the verification email, then run this check again.');
      } else if (!account.email_confirmed_at) {
        console.log('No role was changed. Confirm the account email first, then run this check again.');
        if (apply) process.exitCode = 1;
      } else if (apply && account.app_metadata?.role !== 'admin' && canProvisionFirstAdmin(account, {
        apply,
        suppliedProjectRef: projectRefArg,
        actualProjectRef: projectRef,
      })) {
        const { data, error } = await client.auth.admin.updateUserById(account.id, {
          app_metadata: { ...account.app_metadata, role: 'admin' },
        });
        if (error || !data.user || data.user.app_metadata.role !== 'admin') {
          throw new Error('Supabase did not confirm the reserved admin role update.');
        }
        console.log('Reserved administrator role assigned and verified. No password or account credentials were changed.');
      } else if (apply) {
        console.log('No change needed; the verified reserved account already has the admin role.');
      } else {
        console.log('Read-only check complete. Add --apply and the confirmed project reference only after reviewing the target account and project.');
      }
    } catch (error) {
      console.error(error instanceof Error && error.message.startsWith('Supabase Auth account lookup failed')
        ? error.message
        : 'Supabase Auth provisioning check failed.');
      process.exitCode = 1;
    }
  }
}
