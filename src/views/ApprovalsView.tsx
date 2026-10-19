import React from 'react';
import { RemediationProposal, Incident } from '../agent/types.ts';
import { CheckSquare, ShieldCheck, Hash, ArrowRight, AlertTriangle, Key } from 'lucide-react';

interface ApprovalsViewProps {
  proposals: RemediationProposal[];
  incidents: Incident[];
  onOpenApproval: (proposal: RemediationProposal) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  proposals,
  incidents,
  onOpenApproval,
}) => {
  const incidentMap = new Map(incidents.map((i) => [i.id, i]));
  const pending = proposals.filter((p) => p.status === 'pending');
  const history = proposals.filter((p) => p.status !== 'pending');

  return (
    <div className="evidence-pattern space-y-6 font-mono">
      {/* Overview Banner */}
      <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-[#D9A441]/15 text-[#93691F] border border-[#D9A441]/40">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#17324D]">
              Human SRE Approval Center
            </h3>
            <p className="text-xs text-[#718096]">
              Every automated remediation action is bound by an immutable cryptographic plan hash requiring explicit operator authorization.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-[#718096]">PENDING QUEUE</span>
          <div className="text-xl font-bold text-[#93691F]">
            {pending.length}
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      <div className="space-y-3">
        <div className="text-xs uppercase font-bold text-[#718096] px-1">
          Pending Authorizations ({pending.length})
        </div>

        {pending.length === 0 ? (
          <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-8 text-center text-[#718096] text-xs">
            No remediation proposals currently require authorization.
          </div>
        ) : (
          pending.map((prop) => {
            const inc = incidentMap.get(prop.incident_id);
            return (
              <div
                key={prop.id}
                className="border border-[#D9A441]/50 rounded bg-[#FFFFFF] p-5 space-y-4 hover:border-[#2677C9] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-xs text-[#718096] mb-1">
                      <span className="text-[#17324D] font-bold">{prop.incident_id}</span>
                      <span>·</span>
                      <span className="text-[#1E5E9B]">[{inc?.service_name}]</span>
                      <span>·</span>
                      <span className="text-[#718096]">{prop.id}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#17324D]">
                      {prop.action_type}
                    </h4>
                  </div>

                  <span className="px-2.5 py-0.5 rounded border bg-[#D9A441]/15 border-[#D9A441]/40 text-[#93691F] text-xs font-bold">
                    {prop.risk_level} RISK
                  </span>
                </div>

                {/* Plan Hash Callout */}
                <div className="p-2.5 bg-[#F4F8FC] rounded border border-[#E1EAF3] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-[#718096]">
                    <Hash className="w-3.5 h-3.5 text-[#93691F]" />
                    <span>Plan Hash:</span>
                    <span className="text-[#93691F] font-bold">{prop.plan_hash}</span>
                  </div>
                  <span className="text-[10px] text-[#1E6B58]">TAMPER PROTECTED</span>
                </div>

                <div className="text-xs text-[#4A6176] bg-[#F4F8FC]/50 p-3 rounded border border-[#E1EAF3]">
                  <span className="text-[#718096] uppercase font-bold">Expected Effect: </span>
                  {prop.expected_effect}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E1EAF3]">
                  <div className="text-[11px] text-[#718096]">
                    Preconditions verified by backend security gate
                  </div>
                  <button
                    onClick={() => onOpenApproval(prop)}
                    className="px-4 py-2 bg-[#2677C9] hover:bg-[#1E5E9B] text-white font-bold text-xs rounded transition-colors flex items-center space-x-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Review Plan & Sign Approval</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* History of Past Approvals */}
      {history.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="text-xs uppercase font-bold text-[#718096] px-1">
            Historical Decisions ({history.length})
          </div>

          <div className="border border-[#E1EAF3] rounded divide-y divide-[#E1EAF3] bg-[#FFFFFF] text-xs">
            {history.map((prop) => (
              <div key={prop.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-[11px] text-[#718096] mb-0.5">
                    <span className="text-[#17324D] font-bold">{prop.incident_id}</span>
                    <span>·</span>
                    <span>{prop.id}</span>
                  </div>
                  <div className="text-xs font-semibold text-[#17324D]">
                    {prop.action_type}
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                      prop.status === 'executed'
                        ? 'bg-[#25856B]/15 text-[#1E6B58] border-[#25856B]/40'
                        : prop.status === 'approved'
                        ? 'bg-[#25856B]/10 text-[#1E6B58] border-[#25856B]/30'
                        : 'bg-[#D95757]/15 text-[#B33E3E] border-[#D95757]/40'
                    }`}
                  >
                    {prop.status.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-[#718096]">
                    {new Date(prop.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
