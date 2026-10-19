import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Resolve from this module so CLI/server startup works from any working directory.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const projectEnvPath = path.join(projectRoot, '.env');
dotenv.config({ path: projectEnvPath, quiet: true });

function cleanEnvironmentValue(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed || /^(?:MY_|YOUR_)/i.test(trimmed) || trimmed === 'undefined' || trimmed === 'null') {
    return '';
  }
  return trimmed;
}

export function isValidSupabaseUrl(candidate?: string): boolean {
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === 'https:' &&
      hostname.endsWith('.supabase.co') &&
      hostname !== '.supabase.co' &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password;
  } catch {
    return false;
  }
}

export function getSupabaseConfigurationError(url?: string, secretKey?: string): string | null {
  if (!url) return 'SUPABASE_URL is missing.';
  if (!isValidSupabaseUrl(url)) return 'SUPABASE_URL must be a complete HTTPS URL, for example https://PROJECT_ID.supabase.co.';
  if (!secretKey) return 'SUPABASE_SECRET_KEY is missing.';
  return null;
}

function normalizeGeminiModel(raw?: string): string {
  if (!raw) return 'gemini-3.5-flash';
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  if (
    trimmed === 'gemini-2.5-flash' ||
    trimmed === 'gemini-1.5-flash' ||
    trimmed === 'gemini-pro' ||
    trimmed.includes('2.0') ||
    trimmed.includes('1.5')
  ) {
    return 'gemini-3.5-flash';
  }
  return trimmed;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash'),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_SECRET_KEY: z.string().optional().default(''),
  FRONTEND_ORIGIN: z.string().optional().default('*'),
});

const parsed = envSchema.safeParse({
  ...process.env,
  SUPABASE_URL: cleanEnvironmentValue(process.env.SUPABASE_URL),
  SUPABASE_SECRET_KEY: cleanEnvironmentValue(process.env.SUPABASE_SECRET_KEY),
  GEMINI_MODEL: normalizeGeminiModel(process.env.GEMINI_MODEL),
});

if (!parsed.success) {
  console.error('Environment validation error:', parsed.error.format());
}

export const env = parsed.success ? parsed.data : {
  NODE_ENV: 'development' as const,
  PORT: 3000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: normalizeGeminiModel(process.env.GEMINI_MODEL),
  SUPABASE_URL: cleanEnvironmentValue(process.env.SUPABASE_URL),
  SUPABASE_SECRET_KEY: cleanEnvironmentValue(process.env.SUPABASE_SECRET_KEY),
  FRONTEND_ORIGIN: '*',
};
