import React from 'react';
import { InvestigationHypothesis } from '../agent/types.ts';
import { ShieldAlert, BookOpen, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface HypothesisCardProps {
  hypothesis: InvestigationHypothesis;
  onSelectEvidence: (logId: string) => void;
  onOpenRunbook?: (runbookId: string) => void;
  onRequestRemediation?: (actionType: string) => void;
}

export const HypothesisCard: React.FC<HypothesisCardProps> = ({
  hypothesis,
  onSelectEvidence,
  onOpenRunbook,
  onRequestRemediation,
}) => {
  const confidencePct = Math.round(hypothesis.confidence * 100);
  const riskColors = {
    LOW: 'text-[#1E6B58] bg-[#25856B]/10 border-[#25856B]/30',
    MEDIUM: 'text-[#93691F] bg-[#D9A441]/10 border-[#D9A441]/30',
    HIGH: 'text-[#1E5E9B] bg-[#2677C9]/10 border-[#2677C9]/30',
    CRITICAL: 'text-[#B33E3E] bg-[#D95757]/10 border-[#D95757]/30',
  };

  return (
    <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-4 font-mono transition-all hover:border-[#2677C9]/50">
      {/* Header: Rank + Title + Confidence */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center space-x-3">
          <span className="w-6 h-6 rounded bg-[#EAF4FF] border border-[#E1EAF3] text-[#1E5E9B] font-bold text-xs flex items-center justify-center shrink-0">
            #{hypothesis.rank}
          </span>
          <div>
            <h4 className="text-sm font-semibold text-[#17324D]">
              {hypothesis.title}
            </h4>
            <div className="text-xs text-[#718096] mt-0.5">
              Root Cause: <span className="text-[#4A6176]">{hypothesis.root_cause}</span>
            </div>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="text-right shrink-0">
          <div className="text-xs text-[#718096]">CONFIDENCE</div>
          <div className="text-base font-bold text-[#93691F]">
            {confidencePct}%
          </div>
          <div className="w-20 bg-[#F4F8FC] h-1.5 rounded-full overflow-hidden mt-1 border border-[#E1EAF3]">
            <div
              className="bg-[#D9A441] h-full"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Rationale */}
      <div className="text-xs text-[#4A6176] leading-relaxed mb-3 bg-[#F4F8FC]/50 p-2.5 rounded border border-[#E1EAF3]">
        {hypothesis.rationale}
      </div>

      {/* Supporting Evidence Chips */}
      <div className="mb-3">
        <div className="text-[11px] text-[#718096] uppercase font-semibold mb-1.5">
          Verified Evidence Citations:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hypothesis.supporting_evidence_ids.map((id) => (
            <button
              key={id}
              onClick={() => onSelectEvidence(id)}
              className="px-2 py-0.5 rounded text-[11px] bg-[#2677C9]/15 hover:bg-[#2677C9]/25 border border-[#2677C9]/40 text-[#1E5E9B] font-mono transition-colors flex items-center space-x-1"
            >
              <span>{id}</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Contradicting Evidence check if any */}
      {hypothesis.contradicting_evidence && (
        <div className="text-xs text-[#718096] mb-3 p-2 bg-[#F4F8FC]/30 border-l-2 border-[#718096] rounded-r">
          <span className="text-[#4A6176] font-semibold">Counter-Evidence Audit: </span>
          {hypothesis.contradicting_evidence}
        </div>
      )}

      {/* Footer: Runbook Reference + Recommended Sandbox Action */}
      <div className="pt-3 border-t border-[#E1EAF3] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          {hypothesis.relevant_runbook_id && onOpenRunbook && (
            <button
              onClick={() => onOpenRunbook(hypothesis.relevant_runbook_id!)}
              className="flex items-center space-x-1.5 text-[#1E6B58] hover:underline"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>SOP: {hypothesis.relevant_runbook_id}</span>
            </button>
          )}

          <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${riskColors[hypothesis.risk_level]}`}>
            Risk: {hypothesis.risk_level}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[#718096] text-[11px]">Recommended:</span>
          <span className="px-2 py-1 rounded bg-[#EAF4FF] border border-[#2677C9]/50 text-[#1E5E9B] text-[11px] font-bold">
            {hypothesis.recommended_remediation_action}
          </span>
        </div>
      </div>
    </div>
  );
};
