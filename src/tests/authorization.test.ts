import express from 'express';
import { adminRoleGuard, apiRouter } from '../routes/api.ts';
import {
  ApprovalPayloadSchema,
  canAssignAppRole,
  canManageAccounts,
  canProvisionFirstAdmin,
  getAuthenticatedApprovalActor,
  getAppRole,
  isVerifiedFirstAdmin,
  type AuthIdentity,
} from '../auth/authorization.ts';
import type { TestResultItem } from './agent.test.ts';

const reservedEmail = 'yaravind2602@gmail.com';

function result(id: string, name: string, passed: boolean, actual: string): TestResultItem {
  return {
    id, name, category: 'Authorization', passed,
    input: {}, expected: 'Trusted server-side role policy is enforced', actual,
    evidence: 'Synthetic identities only; no credentials or external accounts used.', duration_ms: 0,
  };
}

export async function runAuthorizationTests(): Promise<TestResultItem[]> {
  const ordinary: AuthIdentity = { id: 'user-1', email: 'ordinary@example.test', email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {} };
  const forgedMetadata: AuthIdentity = { ...ordinary, app_metadata: { role: 'admin' } };
  const forgedSignupMetadata = { ...ordinary, user_metadata: { role: 'admin' } } as AuthIdentity;
  const unverifiedReserved: AuthIdentity = { id: 'user-2', email: reservedEmail, email_confirmed_at: null, app_metadata: { role: 'admin' } };
  const verifiedReserved: AuthIdentity = { id: 'user-3', email: reservedEmail, email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { role: 'admin' } };
  const pendingReserved: AuthIdentity = { ...verifiedReserved, app_metadata: {} };

  const results = [
    result('AUTHZ-01', 'New signup defaults to user without trusted role metadata', getAppRole(ordinary) === 'user', getAppRole(ordinary)),
    result('AUTHZ-02', 'Client-controlled signup metadata cannot grant admin', getAppRole(forgedSignupMetadata) === 'user', getAppRole(forgedSignupMetadata)),
    result('AUTHZ-12', 'Unreserved identity cannot use trusted-role value to gain admin', getAppRole(forgedMetadata) === 'user', getAppRole(forgedMetadata)),
    result('AUTHZ-03', 'Reserved email without verification cannot receive admin', !isVerifiedFirstAdmin(unverifiedReserved) && getAppRole(unverifiedReserved) === 'user', getAppRole(unverifiedReserved)),
    result('AUTHZ-04', 'Only the verified reserved account with trusted admin metadata is admin', getAppRole(verifiedReserved) === 'admin', getAppRole(verifiedReserved)),
    result('AUTHZ-05', 'Unprovisioned reserved account remains a user', getAppRole(pendingReserved) === 'user', getAppRole(pendingReserved)),
    result('AUTHZ-06', 'Ordinary user cannot manage accounts or grant admin', !canManageAccounts(ordinary) && !canAssignAppRole(ordinary, 'admin') && canManageAccounts(verifiedReserved), 'Account management denied to ordinary identity'),
    result('AUTHZ-07', 'Admin assignment is limited to the verified reserved account', canAssignAppRole(verifiedReserved, 'admin') && !canAssignAppRole(ordinary, 'admin') && !canAssignAppRole(unverifiedReserved, 'admin'), 'Only verified reserved account accepted'),
    result('AUTHZ-10', 'Trusted provisioning requires explicit apply, matching project, and verified reserved account',
      canProvisionFirstAdmin(verifiedReserved, { apply: true, suppliedProjectRef: 'confirmed-ref', actualProjectRef: 'confirmed-ref' }) &&
      !canProvisionFirstAdmin(verifiedReserved, { apply: false, suppliedProjectRef: 'confirmed-ref', actualProjectRef: 'confirmed-ref' }) &&
      !canProvisionFirstAdmin(verifiedReserved, { apply: true, suppliedProjectRef: 'other-ref', actualProjectRef: 'confirmed-ref' }) &&
      !canProvisionFirstAdmin(unverifiedReserved, { apply: true, suppliedProjectRef: 'confirmed-ref', actualProjectRef: 'confirmed-ref' }),
      'Only explicit provisioning for the verified reserved account and confirmed project is allowed'),
    result('AUTHZ-11', 'Incident approval actor comes from authenticated identity and rejects client identity fields',
      getAuthenticatedApprovalActor({ ...ordinary, email: 'authenticated@example.test' })?.email === 'authenticated@example.test' &&
      !ApprovalPayloadSchema.safeParse({ plan_hash_confirmed: 'hash', approver_email: 'forged@example.test', approver_user_id: 'forged-id' }).success,
      'Authenticated account email used; client identity fields rejected'),
  ];

  const app = express();
  app.use('/api', apiRouter);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind a TCP port.');
    const [adminResponse, incidentResponse] = await Promise.all([
      fetch(`http://127.0.0.1:${address.port}/api/admin/users`),
      fetch(`http://127.0.0.1:${address.port}/api/incidents`),
    ]);
    results.push(result(
      'AUTHZ-08',
      'Unauthenticated requests to admin and incident APIs remain rejected',
      adminResponse.status === 401 && incidentResponse.status === 401,
      `admin=${adminResponse.status}, incidents=${incidentResponse.status}`,
    ));

    const ordinaryApp = express();
    ordinaryApp.use((_req, res, next) => { res.locals.authUser = ordinary; next(); });
    ordinaryApp.use(adminRoleGuard);
    ordinaryApp.get('/admin/users', (_req, res) => res.sendStatus(200));
    let roleMutationReached = false;
    ordinaryApp.patch('/admin/users/:id/role', (_req, res) => { roleMutationReached = true; return res.sendStatus(200); });
    const ordinaryServer = ordinaryApp.listen(0, '127.0.0.1');
    try {
      await new Promise<void>((resolve, reject) => {
        ordinaryServer.once('listening', resolve);
        ordinaryServer.once('error', reject);
      });
      const ordinaryAddress = ordinaryServer.address();
      if (!ordinaryAddress || typeof ordinaryAddress === 'string') throw new Error('Test server did not bind a TCP port.');
      const [listResponse, roleResponse] = await Promise.all([
        fetch(`http://127.0.0.1:${ordinaryAddress.port}/admin/users`),
        fetch(`http://127.0.0.1:${ordinaryAddress.port}/admin/users/user-1/role`, { method: 'PATCH' }),
      ]);
      results.push(result(
        'AUTHZ-09',
        'Ordinary authenticated user is blocked from account listing and role updates',
        listResponse.status === 403 && roleResponse.status === 403 && !roleMutationReached,
        `list=${listResponse.status}, role_update=${roleResponse.status}, mutation_reached=${roleMutationReached}`,
      ));
    } finally {
      await new Promise<void>((resolve) => ordinaryServer.close(() => resolve()));
    }
  } catch {
    results.push(result('AUTHZ-08', 'Unauthenticated API requests are rejected', false, 'API authorization test request failed'));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  return results;
}
