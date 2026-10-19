import React, { useState } from 'react';
import { RemediationProposal, Incident } from '../agent/types.ts';
import { ShieldCheck, XCircle, AlertTriangle, Hash, Check, Key } from 'lucide-react';

interface ApprovalModalProps {
  proposal: RemediationProposal;
  incident?: Incident;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (proposalId: string, confirmedPlanHash: string, comments: string) => Promise<void>;
  onReject: (proposalId: string, confirmedPlanHash: string, comments: string) => Promise<void>;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  proposal,
  incident,
  isOpen,
  onClose,
  onApprove,
  onReject,
}) => {
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onApprove(proposal.id, proposal.plan_hash, comments);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Approval failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onReject(proposal.id, proposal.plan_hash, comments);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Rejection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#332B20]/55 backdrop-blur-xs p-4 font-mono">
      <div className="bg-[#FAF6EE] border border-[#D4C1A1] rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#D4C1A1] flex items-center justify-between bg-[#F4EFE5]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-[#D4A15D]/15 border border-[#D4A15D]/40 text-[#8A6030]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#332B20]">
                Human SRE Authorization Required
              </h3>
              <div className="text-xs text-[#756B5D]">
                Incident {proposal.incident_id} · Proposal {proposal.id}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#756B5D] hover:text-[#332B20] text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-[#C74F46]/15 border border-[#C74F46]/40 text-[#A73832] rounded">
              {errorMsg}
            </div>
          )}

          {/* Plan Hash Fingerprint */}
          <div className="p-3 bg-[#F4EFE5] rounded border border-[#D4C1A1]">
            <div className="flex items-center justify-between text-[#756B5D] text-[11px] mb-1">
              <span className="flex items-center">
                <Hash className="w-3.5 h-3.5 mr-1 text-[#8A6030]" />
                IMMUTABLE CRYPTOGRAPHIC PLAN HASH
              </span>
              <span className="text-[#4F6555] flex items-center">
                <Check className="w-3 h-3 mr-1" /> INTEGRITY VERIFIED
              </span>
            </div>
            <div className="text-[#8A6030] font-bold text-xs break-all">
              {proposal.plan_hash}
            </div>
          </div>

          {/* Action & Parameters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#EDE4D4] rounded border border-[#D4C1A1]">
              <div className="text-[11px] text-[#756B5D] uppercase">Action Type</div>
              <div className="text-[#985333] font-bold text-sm mt-0.5">
                {proposal.action_type}
              </div>
            </div>
            <div className="p-3 bg-[#EDE4D4] rounded border border-[#D4C1A1]">
              <div className="text-[11px] text-[#756B5D] uppercase">Risk Assessment</div>
              <div className="text-[#8A6030] font-bold text-sm mt-0.5">
                {proposal.risk_level} RISK
              </div>
            </div>
          </div>

          {/* Parameters JSON */}
          <div>
            <div className="text-[#756B5D] text-[11px] uppercase font-bold mb-1">
              Sandbox Execution Parameters:
            </div>
            <pre className="p-3 bg-[#F4EFE5] rounded border border-[#D4C1A1] text-[#8A6030] text-[11px] overflow-x-auto">
              {JSON.stringify(proposal.parameters, null, 2)}
            </pre>
          </div>

          {/* Expected Effect */}
          <div>
            <div className="text-[#756B5D] text-[11px] uppercase font-bold mb-1">
              Expected Telemetry Effect:
            </div>
            <div className="p-3 bg-[#EDE4D4] rounded border border-[#D4C1A1] text-[#332B20]">
              {proposal.expected_effect}
            </div>
          </div>

          {/* Rollback Instructions */}
          <div>
            <div className="text-[#756B5D] text-[11px] uppercase font-bold mb-1">
              Mandatory Rollback Procedure:
            </div>
            <div className="p-3 bg-[#F4EFE5] rounded border border-[#C74F46]/30 text-[#655D51]">
              {proposal.rollback_instructions}
            </div>
          </div>

          {/* Verification Criteria */}
          <div>
            <div className="text-[#756B5D] text-[11px] uppercase font-bold mb-1">
              Automated Verification Gates:
            </div>
            <div className="space-y-1.5">
              {proposal.verification_criteria.map((crit, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-[#EDE4D4] rounded border border-[#D4C1A1]"
                >
                  <span className="text-[#332B20]">{crit.metric}</span>
                  <span className="text-[#4F6555] font-bold">
                    Target: {crit.target_condition} {crit.threshold_value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Approver Sign-off Comments */}
          <div>
            <label className="block text-[#756B5D] text-[11px] uppercase font-bold mb-1">
              Reviewer Notes / Operator Comments:
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g., Reviewed logs LOG-8841-01 through 06. Saturation confirmed. Authorizing pool adjustment."
              className="w-full bg-[#F4EFE5] border border-[#D4C1A1] rounded p-2.5 text-xs text-[#332B20] placeholder-[#756B5D] focus:outline-none focus:border-[#B86B43]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#D4C1A1] bg-[#F4EFE5] flex items-center justify-between">
          <div className="text-[11px] text-[#756B5D]">
            Signed as <span className="text-[#332B20]">Elena Rostova (Principal SRE)</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[#EDE4D4] hover:bg-[#E4D8C4] border border-[#C74F46]/50 text-[#A73832] text-xs font-bold transition-colors disabled:opacity-50"
            >
              Reject Proposal
            </button>
            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[#B86B43] hover:bg-[#985333] text-[#332B20] text-xs font-bold transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Signing...' : 'Approve & Authorize'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
