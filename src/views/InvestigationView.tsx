import React from 'react';
import { Incident, InvestigationRun, RemediationProposal } from '../agent/types.ts';
import { HypothesisCard } from '../components/HypothesisCard.tsx';
import { SeverityBadge, StatusBadge } from '../components/SeverityBadge.tsx';
import {
  Cpu,
  ShieldCheck,
  AlertTriangle,
  FileQuestion,
  Layers,
  ArrowRight,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

interface InvestigationViewProps {
  incident: Incident;
  investigation?: InvestigationRun;
  proposal?: RemediationProposal;
  isInvestigating: boolean;
  onTriggerInvestigation: (id: string) => void;
  onSelectEvidence: (logId: string) => void;
  onOpenRunbook: (runbookId: string) => void;
  onOpenApproval: (proposal: RemediationProposal) => void;
}

export const InvestigationView: React.FC<InvestigationViewProps> = ({
  incident,
  investigation,
  proposal,
  isInvestigating,
  onTriggerInvestigation,
  onSelectEvidence,
  onOpenRunbook,
  onOpenApproval,
}) => {
  return (
    <div className="evidence-pattern space-y-6 font-mono">
      {/* Incident Header & Action Banner */}
      <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2.5">
              <span className="text-sm font-bold text-[#17324D]">{incident.id}</span>
              <SeverityBadge severity={incident.severity} size="sm" />
              <StatusBadge status={incident.status} />
              <span className="text-xs text-[#1E5E9B]">[{incident.service_name}]</span>
            </div>
            <h2 className="text-base font-bold text-[#17324D]">
              {incident.title}
            </h2>
            <p className="text-xs text-[#4A6176] leading-relaxed">
              {incident.description}
            </p>
          </div>

          {/* Trigger AI Button */}
          <div className="text-right shrink-0">
            <button
              onClick={() => onTriggerInvestigation(incident.id)}
              disabled={isInvestigating}
              className="px-4 py-2 bg-[#2677C9] hover:bg-[#1E5E9B] text-white rounded text-xs font-bold transition-all shadow-md flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <Cpu className={`w-4 h-4 ${isInvestigating ? 'animate-spin' : ''}`} />
              <span>
                {isInvestigating
                  ? 'Gemini Investigating Evidence...'
                  : investigation
                  ? 'Re-Run AI Investigation'
                  : 'Start AI Investigation'}
              </span>
            </button>
            <div className="text-[11px] text-[#718096] mt-1.5">
              Model: gemini-3.8-flash · Zero hallucinations
            </div>
          </div>
        </div>
      </div>

      {/* Investigation Loading State */}
      {isInvestigating && (
        <div className="p-12 border border-[#E1EAF3] rounded bg-[#FFFFFF] text-center space-y-4">
          <div className="inline-block animate-spin w-10 h-10 border-3 border-[#2677C9] border-t-transparent rounded-full" />
          <h3 className="text-sm font-bold text-[#17324D]">
            Correlating Telemetry, Logs, and Runbooks...
          </h3>
          <p className="text-xs text-[#718096] max-w-md mx-auto">
            Gemini is evaluating chronological timestamps, anomaly patterns, connection pool queues, and matching SRE runbooks with verified citations.
          </p>
        </div>
      )}

      {/* Investigation Results */}
      {!isInvestigating && investigation && (
        <div className="space-y-6">
          {/* Executive Summary & Confidence Callout */}
          <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1EAF3] pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#1E5E9B]" />
                <h3 className="text-sm font-semibold text-[#17324D]">
                  AI Investigation Executive Summary
                </h3>
              </div>
              <div className="text-xs text-[#718096]">
                Run ID: <span className="text-[#17324D]">{investigation.id}</span>
              </div>
            </div>

            <div className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3] text-xs text-[#17324D] leading-relaxed">
              {investigation.summary}
            </div>

            {/* Uncertainty & Missing Information Callouts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#EAF4FF] rounded border border-[#E1EAF3]">
                <div className="flex items-center space-x-1.5 text-[#93691F] font-bold text-[11px] uppercase mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Calibrated Uncertainty Assessment:</span>
                </div>
                <div className="text-[#4A6176]">
                  {investigation.uncertainty_explanation}
                </div>
              </div>

              <div className="p-3 bg-[#EAF4FF] rounded border border-[#E1EAF3]">
                <div className="flex items-center space-x-1.5 text-[#718096] font-bold text-[11px] uppercase mb-1">
                  <FileQuestion className="w-3.5 h-3.5" />
                  <span>Missing Disproving Information:</span>
                </div>
                <ul className="list-disc list-inside text-[#4A6176] space-y-1">
                  {investigation.missing_information.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Hypotheses List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#718096] px-1">
              <span className="uppercase font-bold">
                Ranked Root-Cause Hypotheses ({investigation.hypotheses.length})
              </span>
              <span>Sorted by evidence conviction score</span>
            </div>

            {investigation.hypotheses.map((hyp) => (
              <HypothesisCard
                key={hyp.id}
                hypothesis={hyp}
                onSelectEvidence={onSelectEvidence}
                onOpenRunbook={onOpenRunbook}
              />
            ))}
          </div>

          {/* Recommended Proposal Card */}
          {proposal && (
            <div className="p-5 rounded border border-[#2677C9]/60 bg-[#FFFFFF] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E1EAF3] pb-3">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-[#1E5E9B]" />
                  <h3 className="text-sm font-semibold text-[#17324D]">
                    Recommended Reversible Remediation Plan
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#D9A441]/15 text-[#93691F] border border-[#D9A441]/40">
                  {proposal.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3]">
                  <div className="text-[10px] text-[#718096] uppercase">Action Type</div>
                  <div className="text-[#1E5E9B] font-bold mt-0.5">{proposal.action_type}</div>
                </div>
                <div className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3]">
                  <div className="text-[10px] text-[#718096] uppercase">Plan Hash</div>
                  <div className="text-[#93691F] font-bold mt-0.5 font-mono truncate">{proposal.plan_hash}</div>
                </div>
                <div className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3]">
                  <div className="text-[10px] text-[#718096] uppercase">Risk Level</div>
                  <div className="text-[#93691F] font-bold mt-0.5">{proposal.risk_level}</div>
                </div>
              </div>

              <div className="text-xs text-[#17324D] bg-[#F4F8FC] p-3 rounded border border-[#E1EAF3]">
                <span className="text-[#718096] uppercase font-bold">Expected Telemetry Impact: </span>
                {proposal.expected_effect}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-[#718096]">
                  Human SRE authorization is mandatory before sandbox execution.
                </div>
                {proposal.status === 'pending' && (
                  <button
                    onClick={() => onOpenApproval(proposal)}
                    className="px-4 py-2 bg-[#2677C9] hover:bg-[#1E5E9B] text-white font-bold text-xs rounded transition-colors flex items-center space-x-1.5"
                  >
                    <span>Authorize in Approval Center</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State when no investigation run yet */}
      {!isInvestigating && !investigation && (
        <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-12 text-center space-y-3">
          <Cpu className="w-10 h-10 text-[#718096] mx-auto opacity-50" />
          <h3 className="text-sm font-semibold text-[#17324D]">
            No AI Investigation Run Yet for {incident.id}
          </h3>
          <p className="text-xs text-[#718096] max-w-md mx-auto">
            Click "Start AI Investigation" above to initiate autonomous multi-step reasoning, evidence citation parsing, and safe remediation proposal generation.
          </p>
        </div>
      )}
    </div>
  );
};
