import React from 'react';
import { VerificationResult } from '../agent/types.ts';
import { ShieldCheck, AlertCircle, XCircle, CheckCircle2, TrendingDown, ArrowUpRight } from 'lucide-react';

interface VerificationPanelProps {
  verification?: VerificationResult;
  onReinvestigate?: () => void;
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({
  verification,
  onReinvestigate,
}) => {
  if (!verification) {
    return (
      <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-8 text-center font-mono">
        <ShieldCheck className="w-10 h-10 text-[#718096] mx-auto mb-3 opacity-60" />
        <h4 className="text-sm font-semibold text-[#17324D]">
          Awaiting Remediation Execution
        </h4>
        <p className="text-xs text-[#718096] mt-1 max-w-md mx-auto">
          Execute an approved sandbox remediation action to trigger automated telemetry verification and measure recovery against pre-defined SLA criteria.
        </p>
      </div>
    );
  }

  const isRecovered = verification.status === 'VERIFIED_RECOVERED';
  const isPartial = verification.status === 'PARTIALLY_RECOVERED';
  const isFailed = verification.status === 'RECOVERY_FAILED';

  const statusStyles = {
    VERIFIED_RECOVERED: {
      bg: 'bg-[#25856B]/15',
      border: 'border-[#25856B]/50',
      text: 'text-[#1E6B58]',
      icon: <CheckCircle2 className="w-6 h-6 text-[#1E6B58]" />,
      label: 'VERIFIED RECOVERED',
    },
    PARTIALLY_RECOVERED: {
      bg: 'bg-[#D9A441]/15',
      border: 'border-[#D9A441]/50',
      text: 'text-[#93691F]',
      icon: <AlertCircle className="w-6 h-6 text-[#93691F]" />,
      label: 'PARTIALLY RECOVERED',
    },
    RECOVERY_FAILED: {
      bg: 'bg-[#D95757]/15',
      border: 'border-[#D95757]/50',
      text: 'text-[#B33E3E]',
      icon: <XCircle className="w-6 h-6 text-[#B33E3E]" />,
      label: 'RECOVERY FAILED',
    },
  }[verification.status];

  return (
    <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-5 font-mono space-y-4">
      {/* Banner */}
      <div className={`p-4 rounded border flex items-center justify-between ${statusStyles.bg} ${statusStyles.border}`}>
        <div className="flex items-center space-x-3">
          {statusStyles.icon}
          <div>
            <div className={`text-sm font-bold tracking-wide ${statusStyles.text}`}>
              {statusStyles.label}
            </div>
            <div className="text-xs text-[#4A6176] mt-0.5">
              Verified at {new Date(verification.created_at).toLocaleTimeString()} · Record ID: {verification.id}
            </div>
          </div>
        </div>

        {isFailed && onReinvestigate && (
          <button
            onClick={onReinvestigate}
            className="px-3 py-1.5 rounded bg-[#D95757]/20 hover:bg-[#D95757]/30 border border-[#D95757]/50 text-[#B33E3E] text-xs font-bold transition-colors"
          >
            Trigger New Investigation
          </button>
        )}
      </div>

      {/* Explanation */}
      <div className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3] text-xs text-[#17324D] leading-relaxed">
        <span className="text-[#718096] uppercase font-bold">Gatekeeper Evaluation: </span>
        {verification.explanation}
      </div>

      {/* Criteria Breakdown Grid */}
      <div>
        <div className="text-xs uppercase font-bold text-[#718096] mb-2">
          Telemetry Gate Results ({verification.criteria_results.filter(c => c.passed).length}/{verification.criteria_results.length} PASSED):
        </div>

        <div className="space-y-2">
          {verification.criteria_results.map((c, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border flex items-center justify-between text-xs ${
                c.passed
                  ? 'bg-[#F4F8FC] border-[#25856B]/40'
                  : 'bg-[#F4F8FC] border-[#D95757]/40'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {c.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-[#1E6B58] shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#B33E3E] shrink-0" />
                )}
                <div>
                  <div className="text-[#17324D] font-semibold">{c.metric}</div>
                  <div className="text-[11px] text-[#718096]">
                    Required: {c.target_condition} {c.threshold_value}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`font-bold ${c.passed ? 'text-[#1E6B58]' : 'text-[#B33E3E]'}`}>
                  Observed: {c.observed_value}
                </div>
                <div className="text-[10px] uppercase font-semibold text-[#718096]">
                  {c.passed ? 'GATE MET' : 'GATE VIOLATED'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
