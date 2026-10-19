import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { stateStore } from '../agent/state.ts';
import { persistence } from '../agent/persistence.ts';
import { orchestrator } from '../agent/orchestrator.ts';
import { env } from '../config/env.ts';
import { isSupabaseConfigured, isSupabaseDatabaseReady, getSupabaseDiagnostics } from '../config/supabase.ts';
import { runAutomatedTests } from '../tests/agent.test.ts';

export const apiRouter = Router();

// GET /api/health
apiRouter.get('/health', (_req: Request, res: Response) => {
  const diag = getSupabaseDiagnostics();
  res.json({
    status: 'ok',
    service: 'IncidentIQ AI Agent',
    timestamp: new Date().toISOString(),
    environment: 'sandbox',
    model: env.GEMINI_MODEL,
    has_gemini_key: Boolean(env.GEMINI_API_KEY),
    supabase_connected: isSupabaseDatabaseReady(),
    supabase_diagnostics: diag,
    storage_mode: isSupabaseConfigured() ? 'supabase' : 'in-memory-demo',
  });
});

// GET /api/incidents
apiRouter.get('/incidents', async (_req: Request, res: Response) => {
  try { res.json({ incidents: await persistence.getAllIncidents() }); }
  catch (error: any) { res.status(503).json({ error: error.message || 'Incident storage unavailable' }); }
});

// GET /api/incidents/:id
apiRouter.get('/incidents/:id', async (req: Request, res: Response) => {
  try {
  const incident = await persistence.getIncident(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: `Incident ${req.params.id} not found` });
  }
  const logs = await persistence.getLogsForIncident(req.params.id);
  const investigations = await persistence.getInvestigationsForIncident(req.params.id);
  const proposals = await persistence.getProposalsForIncident(req.params.id);
  const verification = await persistence.getVerificationForIncident(req.params.id);
  const audit = await persistence.getAuditEventsForIncident(req.params.id);

  res.json({
    incident,
    logs,
    investigations,
    proposals,
    verification,
    audit,
  });
  } catch (error: any) { res.status(503).json({ error: error.message || 'Incident storage unavailable' }); }
});

// POST /api/incidents
const CreateIncidentSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(5),
  description: z.string().min(10),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  service_name: z.string().min(2),
  environment: z.string().default('sandbox'),
  metrics: z.record(z.string(), z.any()).default({ health_check_status: 'DEGRADED' }),
});

apiRouter.post('/incidents', async (req: Request, res: Response) => {
  const parsed = CreateIncidentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
  }
  const id = parsed.data.id || `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const newIncident = {
    ...parsed.data,
    id,
    status: 'open' as const,
    created_at: now,
    updated_at: now,
    metrics: { health_check_status: 'DEGRADED' as const, ...parsed.data.metrics },
  };

  try {
  await persistence.addIncident(newIncident);
  await persistence.recordAudit(
    id,
    'OBSERVE',
    'AI_AGENT',
    'IncidentIngress',
    `Manual incident created: ${newIncident.title}`,
    { severity: newIncident.severity, service: newIncident.service_name }
  );

  res.status(201).json({ incident: newIncident });
  } catch (error: any) { res.status(503).json({ error: error.message || 'Incident was not saved' }); }
});

// GET /api/incidents/:id/logs
apiRouter.get('/incidents/:id/logs', async (req: Request, res: Response) => {
  try { res.json({ logs: await persistence.getLogsForIncident(req.params.id) }); }
  catch (error: any) { res.status(503).json({ error: error.message || 'Incident log storage unavailable' }); }
});

// GET /api/runbooks
apiRouter.get('/runbooks', async (_req: Request, res: Response) => {
  try { res.json({ runbooks: await persistence.getAllRunbooks() }); }
  catch (error: any) { res.status(503).json({ error: error.message || 'Runbook storage unavailable' }); }
});

// POST /api/incidents/:id/investigations
apiRouter.post('/incidents/:id/investigations', async (req: Request, res: Response) => {
  try {
    const result = await orchestrator.runInvestigation(req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error('Investigation error:', error);
    res.status(500).json({ error: error.message || 'Investigation failed' });
  }
});

// GET /api/investigations/:id
apiRouter.get('/investigations/:id', async (req: Request, res: Response) => {
  try {
  const investigation = await persistence.getInvestigation(req.params.id);
  if (!investigation) {
    return res.status(404).json({ error: `Investigation ${req.params.id} not found` });
  }
  res.json({ investigation });
  } catch (error: any) { res.status(503).json({ error: error.message || 'Investigation storage unavailable' }); }
});

// GET /api/incidents/:id/proposals
apiRouter.get('/incidents/:id/proposals', async (req: Request, res: Response) => {
  try { res.json({ proposals: await persistence.getProposalsForIncident(req.params.id) }); }
  catch (error: any) { res.status(503).json({ error: error.message || 'Proposal storage unavailable' }); }
});

// POST /api/proposals/:id/approve
const ApprovalSchema = z.object({
  approver_email: z.string().email().default('sre-oncall@incidentiq.internal'),
  approver_name: z.string().default('Elena Rostova (Principal SRE)'),
  plan_hash_confirmed: z.string(),
  comments: z.string().optional(),
});

apiRouter.post('/proposals/:id/approve', async (req: Request, res: Response) => {
  const parsed = ApprovalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
  }

  try {
    const approval = await orchestrator.submitApproval(
      req.params.id,
      'approved',
      parsed.data.approver_email,
      parsed.data.approver_name,
      parsed.data.plan_hash_confirmed,
      parsed.data.comments
    );
    res.json({ approval, proposal: await persistence.getProposal(req.params.id) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/proposals/:id/reject
apiRouter.post('/proposals/:id/reject', async (req: Request, res: Response) => {
  const parsed = ApprovalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
  }

  try {
    const approval = await orchestrator.submitApproval(
      req.params.id,
      'rejected',
      parsed.data.approver_email,
      parsed.data.approver_name,
      parsed.data.plan_hash_confirmed,
      parsed.data.comments
    );
    res.json({ approval, proposal: await persistence.getProposal(req.params.id) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/proposals/:id/execute
const ExecuteSchema = z.object({
  executed_by: z.string().default('SRE Operational Sandbox'),
  forceFailure: z.boolean().optional(),
  forceVerificationFail: z.boolean().optional(),
});

apiRouter.post('/proposals/:id/execute', async (req: Request, res: Response) => {
  const parsed = ExecuteSchema.safeParse(req.body || {});
  try {
    const result = await orchestrator.executeRemediation(
      req.params.id,
      parsed.success ? parsed.data.executed_by : 'SRE Operational Sandbox',
      {
        forceFailure: parsed.success ? parsed.data.forceFailure : false,
        forceVerificationFail: parsed.success ? parsed.data.forceVerificationFail : false,
      }
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/incidents/:id/verification
apiRouter.get('/incidents/:id/verification', async (req: Request, res: Response) => {
  try {
  const verification = await persistence.getVerificationForIncident(req.params.id);
  if (!verification) {
    return res.status(404).json({ error: 'No verification record for this incident yet' });
  }
  res.json({ verification });
  } catch (error: any) { res.status(503).json({ error: error.message || 'Verification storage unavailable' }); }
});

// GET /api/incidents/:id/audit
apiRouter.get('/incidents/:id/audit', async (req: Request, res: Response) => {
  try { res.json({ audit: await persistence.getAuditEventsForIncident(req.params.id) }); }
  catch (error: any) { res.status(503).json({ error: error.message || 'Audit storage unavailable' }); }
});

// GET /api/audit (all audit events across all incidents)
apiRouter.get('/audit', async (_req: Request, res: Response) => {
  try { res.json({ audit: await persistence.getAllAuditEvents() }); }
  catch (error: any) { res.status(503).json({ error: error.message || 'Audit storage unavailable' }); }
});

// POST /api/sandbox/reset
apiRouter.post('/sandbox/reset', (_req: Request, res: Response) => {
  if (isSupabaseConfigured()) {
    return res.status(409).json({ error: 'Sandbox reset is disabled for Supabase persistence to prevent deleting database records. Use a separately verified demo database and seed script to prepare demo data.' });
  }
  stateStore.reset();
  res.json({
    status: 'ok',
    message: 'Sandbox state re-initialized to baseline incidents and logs.',
    incidents: stateStore.getAllIncidents(),
  });
});

// POST /api/tests/run
apiRouter.post('/tests/run', async (_req: Request, res: Response) => {
  try {
    const testReport = await runAutomatedTests();
    res.json(testReport);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
