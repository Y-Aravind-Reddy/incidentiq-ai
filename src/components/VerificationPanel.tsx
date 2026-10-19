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
      <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-8 text-center font-mono">
        <ShieldCheck className="w-10 h-10 text-[#756B5D] mx-auto mb-3 opacity-60" />
        <h4 className="text-sm font-semibold text-[#332B20]">
          Awaiting Remediation Execution
        </h4>
        <p className="text-xs text-[#756B5D] mt-1 max-w-md mx-auto">
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
      bg: 'bg-[#718777]/15',
      border: 'border-[#718777]/50',
      text: 'text-[#4F6555]',
      icon: <CheckCircle2 className="w-6 h-6 text-[#4F6555]" />,
      label: 'VERIFIED RECOVERED',
    },
    PARTIALLY_RECOVERED: {
      bg: 'bg-[#D4A15D]/15',
      border: 'border-[#D4A15D]/50',
      text: 'text-[#8A6030]',
      icon: <AlertCircle className="w-6 h-6 text-[#8A6030]" />,
      label: 'PARTIALLY RECOVERED',
    },
    RECOVERY_FAILED: {
      bg: 'bg-[#C74F46]/15',
      border: 'border-[#C74F46]/50',
      text: 'text-[#A73832]',
      icon: <XCircle className="w-6 h-6 text-[#A73832]" />,
      label: 'RECOVERY FAILED',
    },
  }[verification.status];

  return (
    <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-5 font-mono space-y-4">
      {/* Banner */}
      <div className={`p-4 rounded border flex items-center justify-between ${statusStyles.bg} ${statusStyles.border}`}>
        <div className="flex items-center space-x-3">
          {statusStyles.icon}
          <div>
            <div className={`text-sm font-bold tracking-wide ${statusStyles.text}`}>
              {statusStyles.label}
            </div>
            <div className="text-xs text-[#655D51] mt-0.5">
              Verified at {new Date(verification.created_at).toLocaleTimeString()} · Record ID: {verification.id}
            </div>
          </div>
        </div>

        {isFailed && onReinvestigate && (
          <button
            onClick={onReinvestigate}
            className="px-3 py-1.5 rounded bg-[#C74F46]/20 hover:bg-[#C74F46]/30 border border-[#C74F46]/50 text-[#A73832] text-xs font-bold transition-colors"
          >
            Trigger New Investigation
          </button>
        )}
      </div>

      {/* Explanation */}
      <div className="p-3 bg-[#F4EFE5] rounded border border-[#D4C1A1] text-xs text-[#332B20] leading-relaxed">
        <span className="text-[#756B5D] uppercase font-bold">Gatekeeper Evaluation: </span>
        {verification.explanation}
      </div>

      {/* Criteria Breakdown Grid */}
      <div>
        <div className="text-xs uppercase font-bold text-[#756B5D] mb-2">
          Telemetry Gate Results ({verification.criteria_results.filter(c => c.passed).length}/{verification.criteria_results.length} PASSED):
        </div>

        <div className="space-y-2">
          {verification.criteria_results.map((c, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border flex items-center justify-between text-xs ${
                c.passed
                  ? 'bg-[#F4EFE5] border-[#718777]/40'
                  : 'bg-[#F4EFE5] border-[#C74F46]/40'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {c.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-[#4F6555] shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#A73832] shrink-0" />
                )}
                <div>
                  <div className="text-[#332B20] font-semibold">{c.metric}</div>
                  <div className="text-[11px] text-[#756B5D]">
                    Required: {c.target_condition} {c.threshold_value}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`font-bold ${c.passed ? 'text-[#4F6555]' : 'text-[#A73832]'}`}>
                  Observed: {c.observed_value}
                </div>
                <div className="text-[10px] uppercase font-semibold text-[#756B5D]">
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
