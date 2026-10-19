import React from 'react';
import { Incident, VerificationResult } from '../agent/types.ts';
import { VerificationPanel } from '../components/VerificationPanel.tsx';
import { ShieldCheck, ArrowRight, Activity, TrendingDown } from 'lucide-react';

interface VerificationViewProps {
  incident: Incident;
  verification?: VerificationResult;
  onReinvestigate: () => void;
}

export const VerificationView: React.FC<VerificationViewProps> = ({
  incident,
  verification,
  onReinvestigate,
}) => {
  return (
    <div className="evidence-pattern space-y-6 font-mono">
      {/* Incident Header */}
      <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-[#25856B]/15 text-[#1E6B58] border border-[#25856B]/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#718096]">
              Incident: <span className="text-[#17324D] font-bold">{incident.id}</span> · Service: <span className="text-[#1E5E9B]">[{incident.service_name}]</span>
            </div>
            <h3 className="text-sm font-semibold text-[#17324D]">
              Deterministic Recovery Verification Gate
            </h3>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-[#718096]">HEALTH STATUS</div>
          <div className={`text-sm font-bold ${incident.metrics.health_check_status === 'HEALTHY' ? 'text-[#1E6B58]' : 'text-[#B33E3E]'}`}>
            {incident.metrics.health_check_status}
          </div>
        </div>
      </div>

      {/* Main Verification Panel */}
      <VerificationPanel
        verification={verification}
        onReinvestigate={onReinvestigate}
      />
    </div>
  );
};
