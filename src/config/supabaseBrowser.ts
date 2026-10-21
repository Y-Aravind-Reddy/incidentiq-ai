import { createClient } from '@supabase/supabase-js';

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

function isProjectUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname.endsWith('.supabase.co') &&
      url.hostname !== '.supabase.co' &&
      url.pathname === '/' &&
      !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const supabaseBrowserConfigError = !projectUrl
  ? 'Supabase sign-in is not configured. Add the public Supabase project URL and publishable key to the client environment.'
  : !isProjectUrl(projectUrl)
    ? 'Supabase sign-in is unavailable because the public project URL is invalid.'
    : !publishableKey || /^(?:your_|my_|undefined|null)/i.test(publishableKey)
      ? 'Supabase sign-in is not configured. Add the public Supabase publishable key to the client environment.'
      : null;

// This browser client intentionally accepts only VITE_ public values. Server secrets
// remain isolated in src/config/supabase.ts and are never imported by the frontend.
export const supabaseBrowser = supabaseBrowserConfigError
  ? null
  : createClient(projectUrl, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
