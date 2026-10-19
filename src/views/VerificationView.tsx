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
      <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-[#718777]/15 text-[#4F6555] border border-[#718777]/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#756B5D]">
              Incident: <span className="text-[#332B20] font-bold">{incident.id}</span> · Service: <span className="text-[#985333]">[{incident.service_name}]</span>
            </div>
            <h3 className="text-sm font-semibold text-[#332B20]">
              Deterministic Recovery Verification Gate
            </h3>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-[#756B5D]">HEALTH STATUS</div>
          <div className={`text-sm font-bold ${incident.metrics.health_check_status === 'HEALTHY' ? 'text-[#4F6555]' : 'text-[#A73832]'}`}>
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
