import { z } from 'zod';

export const FIRST_ADMIN_EMAIL = 'yaravind2602@gmail.com';

export const ApprovalPayloadSchema = z.object({
  plan_hash_confirmed: z.string(),
  comments: z.string().optional(),
}).strict();

export type AppRole = 'admin' | 'user';

export interface AuthIdentity {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  app_metadata?: Record<string, unknown>;
}

export function isVerifiedFirstAdmin(identity: AuthIdentity): boolean {
  return identity.email?.trim().toLowerCase() === FIRST_ADMIN_EMAIL &&
    Boolean(identity.email_confirmed_at) && identity.app_metadata?.role === 'admin';
}

/** Roles are read only from trusted Supabase app_metadata; all other accounts default to user. */
export function getAppRole(identity: AuthIdentity): AppRole {
  return isVerifiedFirstAdmin(identity) ? 'admin' : 'user';
}

export function canManageAccounts(identity: AuthIdentity): boolean {
  return getAppRole(identity) === 'admin';
}

export function canAssignAppRole(target: AuthIdentity, role: AppRole): boolean {
  if (role === 'user') {
    // Keep the reserved first-admin account from being accidentally locked out.
    return target.email?.trim().toLowerCase() !== FIRST_ADMIN_EMAIL;
  }
  return target.email?.trim().toLowerCase() === FIRST_ADMIN_EMAIL && Boolean(target.email_confirmed_at);
}

export function canProvisionFirstAdmin(
  target: AuthIdentity,
  options: { apply: boolean; suppliedProjectRef?: string; actualProjectRef: string },
): boolean {
  return options.apply &&
    Boolean(options.suppliedProjectRef) &&
    options.suppliedProjectRef === options.actualProjectRef &&
    target.email?.trim().toLowerCase() === FIRST_ADMIN_EMAIL &&
    Boolean(target.email_confirmed_at);
}

export function getAuthenticatedApprovalActor(identity: AuthIdentity): { email: string; name: string } | null {
  if (!identity.email) return null;
  return { email: identity.email, name: identity.email };
}
