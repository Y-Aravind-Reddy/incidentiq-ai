# IncidentIQ AI live Supabase workflow verification

This is a manual, write-enabled integration procedure. The regular automated suite is isolated in memory and does not verify Supabase persistence. Do not run migrations, seeds, sandbox reset, or SQL writes as part of this check.

## Preflight

1. Start the existing server from the project root with `npm.cmd run dev`.
2. Run `node --experimental-strip-types scripts/inspect_supabase_persistence.ts`. Continue only if all 12 tables are accessible and the expected incident, runbook, and profile fixtures match the intended project.
3. Check `GET /api/health`. Continue only when `storage_mode` is `supabase` and `supabase_connected` is `true`. Also confirm `GET /api/incidents` returns both seeded incidents and each has `environment: sandbox`.
4. If any preflight check fails, stop. Do not issue workflow POST requests. Never paste or print `.env` values.
5. Record the read-only table counts and use a unique marker such as `HACKATHON-E2E-<UTC timestamp>` in the human approval comments. Do not rerun a stage if its response is ambiguous; inspect Supabase first because stage writes are sequential and may be partial.

## Run each seeded scenario

Perform these steps first for `INC-2026-8841` and then separately for `INC-2026-9024`:

1. In the UI, select the incident and inspect its seeded logs. Confirm its environment is sandbox and that the relevant runbook is available.
2. Trigger investigation once. Record the returned reasoner (`gemini` or `deterministic`) and any fallback reason. Confirm the investigation citations correspond to the displayed log IDs and that the proposal uses an allowlisted sandbox action. For scenario 2, the expected action is `SIMULATE_RESTORE_KNOWN_GOOD_CONFIG`.
3. Before approving, review the evidence, action, parameters, risk, rollback instructions, verification criteria, and displayed plan hash. A human operator must perform this approval. Include the unique marker in the approval comments. Do not approve automatically.
4. Execute only through the app's sandbox execution flow. Confirm the action is recorded as sandbox execution and wait for independent verification. Treat any status other than `VERIFIED_RECOVERED` as a failure.
5. After each stage, run the read-only SQL below for that incident and confirm row links before proceeding. If a stage fails, stop at that stage and inspect for partial writes; do not reset or delete records.

## Read-only SQL checks

Run in the Supabase SQL Editor against the confirmed project. Replace the incident literal with one of the two seeded incident IDs. These queries return counts and link status, not incident content.

```sql
select 'incident' as record_type, count(*) as row_count
from incidents where id = 'INC-2026-8841'
union all
select 'incident_logs', count(*)
from incident_logs where incident_id = 'INC-2026-8841'
union all
select 'investigation_runs', count(*)
from investigation_runs where incident_id = 'INC-2026-8841'
union all
select 'hypotheses', count(*)
from investigation_hypotheses h
join investigation_runs i on i.id = h.investigation_id
where i.incident_id = 'INC-2026-8841'
union all
select 'evidence', count(*)
from investigation_evidence e
join investigation_runs i on i.id = e.investigation_id
join incident_logs l on l.id = e.log_id and l.incident_id = i.incident_id
where i.incident_id = 'INC-2026-8841'
union all
select 'proposals', count(*)
from remediation_proposals p
join investigation_runs i on i.id = p.investigation_id and i.incident_id = p.incident_id
where p.incident_id = 'INC-2026-8841'
union all
select 'approvals', count(*)
from remediation_approvals a
join remediation_proposals p on p.id = a.proposal_id
where p.incident_id = 'INC-2026-8841'
union all
select 'actions', count(*)
from remediation_actions a
join remediation_proposals p on p.id = a.proposal_id and p.incident_id = a.incident_id
where a.incident_id = 'INC-2026-8841'
union all
select 'verification_results', count(*)
from verification_results v
join remediation_actions a on a.id = v.action_id and a.incident_id = v.incident_id
where v.incident_id = 'INC-2026-8841'
union all
select 'audit_events', count(*)
from audit_events where incident_id = 'INC-2026-8841'
order by record_type;
```

Confirm evidence rows reference logs belonging to the same incident, proposals reference an investigation for that incident, approvals reference those proposals, actions reference both the proposal and same incident, and verification rows reference the corresponding action. The joins in the query enforce those relationships in the reported counts. Compare the counts after every stage with the preflight snapshot; do not infer a successful write solely from an HTTP success response.

## Completion

After each scenario, rerun `node --experimental-strip-types scripts/inspect_supabase_persistence.ts` and save the counts. The script is read-only. Do not clean up these workflow records: the existing schema has cascading foreign keys, and this procedure intentionally avoids destructive operations.
