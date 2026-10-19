import React from 'react';
import { AuditEvent } from '../agent/types.ts';
import { AuditTimeline } from '../components/AuditTimeline.tsx';
import { History, Shield, Download } from 'lucide-react';

interface AuditViewProps {
  auditEvents: AuditEvent[];
}

export const AuditView: React.FC<AuditViewProps> = ({ auditEvents }) => {
  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `incidentiq-audit-ledger-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4 font-mono">
      <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-[#2677C9]/15 text-[#1E5E9B] border border-[#2677C9]/40">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#17324D]">
              Compliance & Operational Audit Trail
            </h3>
            <p className="text-xs text-[#718096]">
              Continuous, immutable chronological log of every observation, AI inference, proposal, human approval, sandbox execution, and verification result.
            </p>
          </div>
        </div>

        <button
          onClick={exportJson}
          className="px-3 py-1.5 rounded bg-[#EAF4FF] hover:bg-[#D9ECFF] border border-[#E1EAF3] text-[#17324D] text-xs font-bold transition-colors flex items-center space-x-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Ledger (JSON)</span>
        </button>
      </div>

      <AuditTimeline events={auditEvents} />
    </div>
  );
};
