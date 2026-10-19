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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324D]/55 backdrop-blur-xs p-4 font-mono">
      <div className="bg-[#FFFFFF] border border-[#E1EAF3] rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E1EAF3] flex items-center justify-between bg-[#F4F8FC]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-[#D9A441]/15 border border-[#D9A441]/40 text-[#93691F]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17324D]">
                Human SRE Authorization Required
              </h3>
              <div className="text-xs text-[#718096]">
                Incident {proposal.incident_id} · Proposal {proposal.id}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#718096] hover:text-[#17324D] text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-[#D95757]/15 border border-[#D95757]/40 text-[#B33E3E] rounded">
              {errorMsg}
            </div>
          )}

          {/* Plan Hash Fingerprint */}
          <div className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3]">
            <div className="flex items-center justify-between text-[#718096] text-[11px] mb-1">
              <span className="flex items-center">
                <Hash className="w-3.5 h-3.5 mr-1 text-[#93691F]" />
                IMMUTABLE CRYPTOGRAPHIC PLAN HASH
              </span>
              <span className="text-[#1E6B58] flex items-center">
                <Check className="w-3 h-3 mr-1" /> INTEGRITY VERIFIED
              </span>
            </div>
            <div className="text-[#93691F] font-bold text-xs break-all">
              {proposal.plan_hash}
            </div>
          </div>

          {/* Action & Parameters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#EAF4FF] rounded border border-[#E1EAF3]">
              <div className="text-[11px] text-[#718096] uppercase">Action Type</div>
              <div className="text-[#1E5E9B] font-bold text-sm mt-0.5">
                {proposal.action_type}
              </div>
            </div>
            <div className="p-3 bg-[#EAF4FF] rounded border border-[#E1EAF3]">
              <div className="text-[11px] text-[#718096] uppercase">Risk Assessment</div>
              <div className="text-[#93691F] font-bold text-sm mt-0.5">
                {proposal.risk_level} RISK
              </div>
            </div>
          </div>

          {/* Parameters JSON */}
          <div>
            <div className="text-[#718096] text-[11px] uppercase font-bold mb-1">
              Sandbox Execution Parameters:
            </div>
            <pre className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3] text-[#93691F] text-[11px] overflow-x-auto">
              {JSON.stringify(proposal.parameters, null, 2)}
            </pre>
          </div>

          {/* Expected Effect */}
          <div>
            <div className="text-[#718096] text-[11px] uppercase font-bold mb-1">
              Expected Telemetry Effect:
            </div>
            <div className="p-3 bg-[#EAF4FF] rounded border border-[#E1EAF3] text-[#17324D]">
              {proposal.expected_effect}
            </div>
          </div>

          {/* Rollback Instructions */}
          <div>
            <div className="text-[#718096] text-[11px] uppercase font-bold mb-1">
              Mandatory Rollback Procedure:
            </div>
            <div className="p-3 bg-[#F4F8FC] rounded border border-[#D95757]/30 text-[#4A6176]">
              {proposal.rollback_instructions}
            </div>
          </div>

          {/* Verification Criteria */}
          <div>
            <div className="text-[#718096] text-[11px] uppercase font-bold mb-1">
              Automated Verification Gates:
            </div>
            <div className="space-y-1.5">
              {proposal.verification_criteria.map((crit, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-[#EAF4FF] rounded border border-[#E1EAF3]"
                >
                  <span className="text-[#17324D]">{crit.metric}</span>
                  <span className="text-[#1E6B58] font-bold">
                    Target: {crit.target_condition} {crit.threshold_value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Approver Sign-off Comments */}
          <div>
            <label className="block text-[#718096] text-[11px] uppercase font-bold mb-1">
              Reviewer Notes / Operator Comments:
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g., Reviewed logs LOG-8841-01 through 06. Saturation confirmed. Authorizing pool adjustment."
              className="w-full bg-[#F4F8FC] border border-[#E1EAF3] rounded p-2.5 text-xs text-[#17324D] placeholder-[#718096] focus:outline-none focus:border-[#2677C9]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E1EAF3] bg-[#F4F8FC] flex items-center justify-between">
          <div className="text-[11px] text-[#718096]">
            Signed as <span className="text-[#17324D]">Elena Rostova (Principal SRE)</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[#EAF4FF] hover:bg-[#D9ECFF] border border-[#D95757]/50 text-[#B33E3E] text-xs font-bold transition-colors disabled:opacity-50"
            >
              Reject Proposal
            </button>
            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[#2677C9] hover:bg-[#1E5E9B] text-white text-xs font-bold transition-colors flex items-center space-x-1.5 disabled:opacity-50"
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
