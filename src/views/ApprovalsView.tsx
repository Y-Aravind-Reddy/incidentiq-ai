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
      <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-[#D4A15D]/15 text-[#8A6030] border border-[#D4A15D]/40">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#332B20]">
              Human SRE Approval Center
            </h3>
            <p className="text-xs text-[#756B5D]">
              Every automated remediation action is bound by an immutable cryptographic plan hash requiring explicit operator authorization.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-[#756B5D]">PENDING QUEUE</span>
          <div className="text-xl font-bold text-[#8A6030]">
            {pending.length}
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      <div className="space-y-3">
        <div className="text-xs uppercase font-bold text-[#756B5D] px-1">
          Pending Authorizations ({pending.length})
        </div>

        {pending.length === 0 ? (
          <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-8 text-center text-[#756B5D] text-xs">
            No remediation proposals currently require authorization.
          </div>
        ) : (
          pending.map((prop) => {
            const inc = incidentMap.get(prop.incident_id);
            return (
              <div
                key={prop.id}
                className="border border-[#D4A15D]/50 rounded bg-[#FAF6EE] p-5 space-y-4 hover:border-[#B86B43] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-xs text-[#756B5D] mb-1">
                      <span className="text-[#332B20] font-bold">{prop.incident_id}</span>
                      <span>·</span>
                      <span className="text-[#985333]">[{inc?.service_name}]</span>
                      <span>·</span>
                      <span className="text-[#756B5D]">{prop.id}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#332B20]">
                      {prop.action_type}
                    </h4>
                  </div>

                  <span className="px-2.5 py-0.5 rounded border bg-[#D4A15D]/15 border-[#D4A15D]/40 text-[#8A6030] text-xs font-bold">
                    {prop.risk_level} RISK
                  </span>
                </div>

                {/* Plan Hash Callout */}
                <div className="p-2.5 bg-[#F4EFE5] rounded border border-[#D4C1A1] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-[#756B5D]">
                    <Hash className="w-3.5 h-3.5 text-[#8A6030]" />
                    <span>Plan Hash:</span>
                    <span className="text-[#8A6030] font-bold">{prop.plan_hash}</span>
                  </div>
                  <span className="text-[10px] text-[#4F6555]">TAMPER PROTECTED</span>
                </div>

                <div className="text-xs text-[#655D51] bg-[#F4EFE5]/50 p-3 rounded border border-[#D4C1A1]">
                  <span className="text-[#756B5D] uppercase font-bold">Expected Effect: </span>
                  {prop.expected_effect}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#D4C1A1]">
                  <div className="text-[11px] text-[#756B5D]">
                    Preconditions verified by backend security gate
                  </div>
                  <button
                    onClick={() => onOpenApproval(prop)}
                    className="px-4 py-2 bg-[#B86B43] hover:bg-[#985333] text-[#332B20] font-bold text-xs rounded transition-colors flex items-center space-x-1.5"
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
          <div className="text-xs uppercase font-bold text-[#756B5D] px-1">
            Historical Decisions ({history.length})
          </div>

          <div className="border border-[#D4C1A1] rounded divide-y divide-[#D4C1A1] bg-[#FAF6EE] text-xs">
            {history.map((prop) => (
              <div key={prop.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-[11px] text-[#756B5D] mb-0.5">
                    <span className="text-[#332B20] font-bold">{prop.incident_id}</span>
                    <span>·</span>
                    <span>{prop.id}</span>
                  </div>
                  <div className="text-xs font-semibold text-[#332B20]">
                    {prop.action_type}
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                      prop.status === 'executed'
                        ? 'bg-[#718777]/15 text-[#4F6555] border-[#718777]/40'
                        : prop.status === 'approved'
                        ? 'bg-[#718777]/10 text-[#4F6555] border-[#718777]/30'
                        : 'bg-[#C74F46]/15 text-[#A73832] border-[#C74F46]/40'
                    }`}
                  >
                    {prop.status.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-[#756B5D]">
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
