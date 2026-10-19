import { randomUUID } from 'node:crypto';
import type {
  Incident,
  InvestigationRun,
  RemediationAction,
  RemediationApproval,
  RemediationProposal,
  VerificationResult,
} from './types.ts';
import { computePlanHash } from './state.ts';
import { persistence } from './persistence.ts';
import { runGeminiInvestigation } from './gemini.ts';
import { parseIncidentLogs } from '../tools/logParser.ts';
import { matchRunbooks } from '../tools/runbookRetriever.ts';
import { executeSandboxRemediation } from '../tools/sandboxRemediator.ts';
import { evaluateVerification } from '../tools/verifier.ts';

export class SREOrchestrator {
  /**
   * Tool: get_incident
   */
  public async getIncident(incidentId: string): Promise<Incident | null> {
    const inc = await persistence.getIncident(incidentId);
    return inc || null;
  }

  /**
   * Tool: parse_incident_logs
   */
  public async parseLogs(incidentId: string) {
    const logs = await persistence.getLogsForIncident(incidentId);
    return parseIncidentLogs(logs);
  }

  /**
   * Tool: search_runbooks
   */
  public async searchRunbooks(incidentId: string) {
    const inc = await persistence.getIncident(incidentId);
    if (!inc) return [];
    const allRb = await persistence.getAllRunbooks();
    return matchRunbooks(allRb, `${inc.title} ${inc.description}`, inc.severity);
  }

  /**
   * Step: INVESTIGATE & RANK HYPOTHESES
   */
  public async runInvestigation(incidentId: string): Promise<{
    investigation: InvestigationRun;
    proposal: RemediationProposal;
    reasoner: 'gemini' | 'deterministic';
    fallback_reason?: string;
  }> {
    const incident = await persistence.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident with id ${incidentId} not found`);
    }

    const logs = await persistence.getLogsForIncident(incidentId);
    const runbooks = await persistence.getAllRunbooks();

    // Run AI investigation
    const investigationResult = await runGeminiInvestigation(incident, logs, runbooks);
    const result = investigationResult.output;

    // Save Investigation Run
    const invId = `INV-${randomUUID().toUpperCase()}`;
    const investigation: InvestigationRun = {
      id: invId,
      incident_id: incidentId,
      model_name: investigationResult.model_name,
      summary: result.summary,
      confidence_score: result.confidence_score,
      uncertainty_explanation: result.uncertainty_explanation,
      missing_information: result.missing_information,
      alternative_explanations: result.alternative_explanations,
      hypotheses: result.hypotheses.map((h, idx) => ({
        ...h,
        id: `HYP-${invId}-${idx + 1}`,
        investigation_id: invId,
      })),
      evidence_citations: result.evidence_citations.map((c, idx) => ({
        ...c,
        id: `EVD-${invId}-${idx + 1}`,
        investigation_id: invId,
      })),
      status: 'completed',
      tokens_used: 1240,
      created_at: new Date().toISOString(),
    };

    await persistence.saveInvestigation(investigation);

    // Tool: create_remediation_proposal
    const propId = `PROP-${randomUUID().toUpperCase()}`;
    const proposalPlan = {
      id: propId,
      incident_id: incidentId,
      investigation_id: invId,
      action_type: result.recommended_proposal.action_type,
      parameters: result.recommended_proposal.parameters,
      risk_level: result.recommended_proposal.risk_level,
      expected_effect: result.recommended_proposal.expected_effect,
      rollback_instructions: result.recommended_proposal.rollback_instructions,
      verification_criteria: result.recommended_proposal.verification_criteria,
    };
    const proposal: RemediationProposal = {
      ...proposalPlan,
      plan_hash: computePlanHash(proposalPlan),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    await persistence.createProposal(proposal);

    return { investigation, proposal, reasoner: investigationResult.reasoner, fallback_reason: investigationResult.fallback_reason };
  }

  /**
   * Step: HUMAN APPROVAL
   */
  public async submitApproval(
    proposalId: string,
    decision: 'approved' | 'rejected',
    approverEmail: string,
    approverName: string,
    confirmedPlanHash: string,
    comments?: string
  ): Promise<RemediationApproval> {
    const proposal = await persistence.getProposal(proposalId);
    if (!proposal) {
      throw new Error(`Proposal with id ${proposalId} not found`);
    }

    if (proposal.status !== 'pending') {
      throw new Error(`Proposal ${proposalId} is already in ${proposal.status} status`);
    }

    // Bind the approval to the complete current proposal, not only its stored fingerprint.
    const currentPlanHash = computePlanHash(proposal);
    if (!proposal.plan_hash || proposal.plan_hash !== currentPlanHash || confirmedPlanHash !== currentPlanHash) {
      await persistence.recordAudit(
        proposal.incident_id,
        'REJECT',
        'HUMAN_OPERATOR',
        approverName,
        'SECURITY VIOLATION: Approval rejected because remediation plan integrity verification failed.',
        { proposal_id: proposalId, reason: 'plan_integrity_check_failed' }
      );
      throw new Error('Plan hash integrity check failed. The proposed remediation plan has changed or its approval fingerprint is invalid.');
    }

    const approval: RemediationApproval = {
      id: `APPR-${randomUUID().toUpperCase()}`,
      proposal_id: proposalId,
      approver_email: approverEmail,
      approver_name: approverName,
      decision,
      comments: comments || (decision === 'approved' ? 'Approved by SRE on-call after evidence review' : 'Rejected by operator'),
      plan_hash_confirmed: confirmedPlanHash,
      created_at: new Date().toISOString(),
    };

    return persistence.recordApproval(approval);
  }

  /**
   * Step: EXECUTE SANDBOX ACTION
   */
  public async executeRemediation(
    proposalId: string,
    executedBy: string,
    options?: { forceFailure?: boolean; forceVerificationFail?: boolean }
  ): Promise<{ action: RemediationAction; verification: VerificationResult }> {
    const proposal = await persistence.getProposal(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'approved') {
      throw new Error(`Execution blocked: Proposal ${proposalId} is not approved (current status: ${proposal.status})`);
    }

    const incident = await persistence.getIncident(proposal.incident_id);
    if (!incident) {
      throw new Error(`Incident ${proposal.incident_id} not found`);
    }

    // Re-verify authorization and plan hash
    const approval = await persistence.getApprovalForProposal(proposalId);
    if (!approval || approval.decision !== 'approved' || approval.proposal_id !== proposal.id) {
      throw new Error(`Execution blocked: No valid approval record found for proposal ${proposalId}`);
    }

    const currentPlanHash = computePlanHash(proposal);
    if (
      !proposal.plan_hash ||
      proposal.plan_hash !== currentPlanHash ||
      approval.plan_hash_confirmed !== currentPlanHash
    ) {
      await persistence.recordAudit(
        proposal.incident_id,
        'REJECT',
        'HUMAN_OPERATOR',
        approval.approver_name,
        'SECURITY VIOLATION: Sandbox execution blocked because remediation plan integrity verification failed.',
        { proposal_id: proposalId, reason: 'plan_integrity_check_failed' }
      );
      throw new Error('Execution blocked: remediation plan integrity verification failed. Reinvestigate and obtain approval for the current plan.');
    }

    // Execute Sandbox Action
    const simResult = executeSandboxRemediation(proposal, incident.metrics, {
      forceFailure: options?.forceFailure,
    });

    const actionId = `ACT-${randomUUID().toUpperCase()}`;
    const action: RemediationAction = {
      id: actionId,
      proposal_id: proposalId,
      incident_id: proposal.incident_id,
      action_type: proposal.action_type,
      executed_by: executedBy,
      execution_status: simResult.success ? 'completed' : 'failed',
      before_state: simResult.before_state,
      after_state: simResult.after_state,
      execution_logs: simResult.execution_logs,
      started_at: new Date(Date.now() - 3000).toISOString(),
      completed_at: new Date().toISOString(),
    };

    await persistence.recordAction(action);
    await persistence.updateProposalStatus(proposalId, 'executed');

    // Step: VERIFY RECOVERY
    const verification = evaluateVerification(
      proposal.incident_id,
      action.id,
      simResult.before_state,
      simResult.after_state,
      proposal.verification_criteria,
      { forceFail: options?.forceVerificationFail || !simResult.success }
    );

    await persistence.recordVerification(verification);

    return { action, verification };
  }
}

export const orchestrator = new SREOrchestrator();
