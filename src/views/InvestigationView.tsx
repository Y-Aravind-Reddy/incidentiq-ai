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
      <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2.5">
              <span className="text-sm font-bold text-[#332B20]">{incident.id}</span>
              <SeverityBadge severity={incident.severity} size="sm" />
              <StatusBadge status={incident.status} />
              <span className="text-xs text-[#985333]">[{incident.service_name}]</span>
            </div>
            <h2 className="text-base font-bold text-[#332B20]">
              {incident.title}
            </h2>
            <p className="text-xs text-[#655D51] leading-relaxed">
              {incident.description}
            </p>
          </div>

          {/* Trigger AI Button */}
          <div className="text-right shrink-0">
            <button
              onClick={() => onTriggerInvestigation(incident.id)}
              disabled={isInvestigating}
              className="px-4 py-2 bg-[#B86B43] hover:bg-[#985333] text-[#332B20] rounded text-xs font-bold transition-all shadow-md flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
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
            <div className="text-[11px] text-[#756B5D] mt-1.5">
              Model: gemini-3.8-flash · Zero hallucinations
            </div>
          </div>
        </div>
      </div>

      {/* Investigation Loading State */}
      {isInvestigating && (
        <div className="p-12 border border-[#D4C1A1] rounded bg-[#FAF6EE] text-center space-y-4">
          <div className="inline-block animate-spin w-10 h-10 border-3 border-[#B86B43] border-t-transparent rounded-full" />
          <h3 className="text-sm font-bold text-[#332B20]">
            Correlating Telemetry, Logs, and Runbooks...
          </h3>
          <p className="text-xs text-[#756B5D] max-w-md mx-auto">
            Gemini is evaluating chronological timestamps, anomaly patterns, connection pool queues, and matching SRE runbooks with verified citations.
          </p>
        </div>
      )}

      {/* Investigation Results */}
      {!isInvestigating && investigation && (
        <div className="space-y-6">
          {/* Executive Summary & Confidence Callout */}
          <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#D4C1A1] pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#985333]" />
                <h3 className="text-sm font-semibold text-[#332B20]">
                  AI Investigation Executive Summary
                </h3>
              </div>
              <div className="text-xs text-[#756B5D]">
                Run ID: <span className="text-[#332B20]">{investigation.id}</span>
              </div>
            </div>

            <div className="p-3 bg-[#F4EFE5] rounded border border-[#D4C1A1] text-xs text-[#332B20] leading-relaxed">
              {investigation.summary}
            </div>

            {/* Uncertainty & Missing Information Callouts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#EDE4D4] rounded border border-[#D4C1A1]">
                <div className="flex items-center space-x-1.5 text-[#8A6030] font-bold text-[11px] uppercase mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Calibrated Uncertainty Assessment:</span>
                </div>
                <div className="text-[#655D51]">
                  {investigation.uncertainty_explanation}
                </div>
              </div>

              <div className="p-3 bg-[#EDE4D4] rounded border border-[#D4C1A1]">
                <div className="flex items-center space-x-1.5 text-[#756B5D] font-bold text-[11px] uppercase mb-1">
                  <FileQuestion className="w-3.5 h-3.5" />
                  <span>Missing Disproving Information:</span>
                </div>
                <ul className="list-disc list-inside text-[#655D51] space-y-1">
                  {investigation.missing_information.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Hypotheses List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#756B5D] px-1">
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
            <div className="p-5 rounded border border-[#B86B43]/60 bg-[#FAF6EE] space-y-4">
              <div className="flex items-center justify-between border-b border-[#D4C1A1] pb-3">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-[#985333]" />
                  <h3 className="text-sm font-semibold text-[#332B20]">
                    Recommended Reversible Remediation Plan
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#D4A15D]/15 text-[#8A6030] border border-[#D4A15D]/40">
                  {proposal.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#F4EFE5] rounded border border-[#D4C1A1]">
                  <div className="text-[10px] text-[#756B5D] uppercase">Action Type</div>
                  <div className="text-[#985333] font-bold mt-0.5">{proposal.action_type}</div>
                </div>
                <div className="p-3 bg-[#F4EFE5] rounded border border-[#D4C1A1]">
                  <div className="text-[10px] text-[#756B5D] uppercase">Plan Hash</div>
                  <div className="text-[#8A6030] font-bold mt-0.5 font-mono truncate">{proposal.plan_hash}</div>
                </div>
                <div className="p-3 bg-[#F4EFE5] rounded border border-[#D4C1A1]">
                  <div className="text-[10px] text-[#756B5D] uppercase">Risk Level</div>
                  <div className="text-[#8A6030] font-bold mt-0.5">{proposal.risk_level}</div>
                </div>
              </div>

              <div className="text-xs text-[#332B20] bg-[#F4EFE5] p-3 rounded border border-[#D4C1A1]">
                <span className="text-[#756B5D] uppercase font-bold">Expected Telemetry Impact: </span>
                {proposal.expected_effect}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-[#756B5D]">
                  Human SRE authorization is mandatory before sandbox execution.
                </div>
                {proposal.status === 'pending' && (
                  <button
                    onClick={() => onOpenApproval(proposal)}
                    className="px-4 py-2 bg-[#B86B43] hover:bg-[#985333] text-[#332B20] font-bold text-xs rounded transition-colors flex items-center space-x-1.5"
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
        <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-12 text-center space-y-3">
          <Cpu className="w-10 h-10 text-[#756B5D] mx-auto opacity-50" />
          <h3 className="text-sm font-semibold text-[#332B20]">
            No AI Investigation Run Yet for {incident.id}
          </h3>
          <p className="text-xs text-[#756B5D] max-w-md mx-auto">
            Click "Start AI Investigation" above to initiate autonomous multi-step reasoning, evidence citation parsing, and safe remediation proposal generation.
          </p>
        </div>
      )}
    </div>
  );
};
