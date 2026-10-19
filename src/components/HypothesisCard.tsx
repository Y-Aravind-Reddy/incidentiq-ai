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
    LOW: 'text-[#4F6555] bg-[#718777]/10 border-[#718777]/30',
    MEDIUM: 'text-[#8A6030] bg-[#D4A15D]/10 border-[#D4A15D]/30',
    HIGH: 'text-[#985333] bg-[#B86B43]/10 border-[#B86B43]/30',
    CRITICAL: 'text-[#A73832] bg-[#C74F46]/10 border-[#C74F46]/30',
  };

  return (
    <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-4 font-mono transition-all hover:border-[#B86B43]/50">
      {/* Header: Rank + Title + Confidence */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center space-x-3">
          <span className="w-6 h-6 rounded bg-[#EDE4D4] border border-[#D4C1A1] text-[#985333] font-bold text-xs flex items-center justify-center shrink-0">
            #{hypothesis.rank}
          </span>
          <div>
            <h4 className="text-sm font-semibold text-[#332B20]">
              {hypothesis.title}
            </h4>
            <div className="text-xs text-[#756B5D] mt-0.5">
              Root Cause: <span className="text-[#655D51]">{hypothesis.root_cause}</span>
            </div>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="text-right shrink-0">
          <div className="text-xs text-[#756B5D]">CONFIDENCE</div>
          <div className="text-base font-bold text-[#8A6030]">
            {confidencePct}%
          </div>
          <div className="w-20 bg-[#F4EFE5] h-1.5 rounded-full overflow-hidden mt-1 border border-[#D4C1A1]">
            <div
              className="bg-[#D4A15D] h-full"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Rationale */}
      <div className="text-xs text-[#655D51] leading-relaxed mb-3 bg-[#F4EFE5]/50 p-2.5 rounded border border-[#D4C1A1]">
        {hypothesis.rationale}
      </div>

      {/* Supporting Evidence Chips */}
      <div className="mb-3">
        <div className="text-[11px] text-[#756B5D] uppercase font-semibold mb-1.5">
          Verified Evidence Citations:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hypothesis.supporting_evidence_ids.map((id) => (
            <button
              key={id}
              onClick={() => onSelectEvidence(id)}
              className="px-2 py-0.5 rounded text-[11px] bg-[#B86B43]/15 hover:bg-[#B86B43]/25 border border-[#B86B43]/40 text-[#985333] font-mono transition-colors flex items-center space-x-1"
            >
              <span>{id}</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Contradicting Evidence check if any */}
      {hypothesis.contradicting_evidence && (
        <div className="text-xs text-[#756B5D] mb-3 p-2 bg-[#F4EFE5]/30 border-l-2 border-[#756B5D] rounded-r">
          <span className="text-[#655D51] font-semibold">Counter-Evidence Audit: </span>
          {hypothesis.contradicting_evidence}
        </div>
      )}

      {/* Footer: Runbook Reference + Recommended Sandbox Action */}
      <div className="pt-3 border-t border-[#D4C1A1] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          {hypothesis.relevant_runbook_id && onOpenRunbook && (
            <button
              onClick={() => onOpenRunbook(hypothesis.relevant_runbook_id!)}
              className="flex items-center space-x-1.5 text-[#4F6555] hover:underline"
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
          <span className="text-[#756B5D] text-[11px]">Recommended:</span>
          <span className="px-2 py-1 rounded bg-[#EDE4D4] border border-[#B86B43]/50 text-[#985333] text-[11px] font-bold">
            {hypothesis.recommended_remediation_action}
          </span>
        </div>
      </div>
    </div>
  );
};
