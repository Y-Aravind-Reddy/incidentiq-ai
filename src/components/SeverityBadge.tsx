import React from 'react';
import { Severity, IncidentStatus } from '../agent/types.ts';

export const SeverityBadge: React.FC<{ severity: Severity; size?: 'sm' | 'md' }> = ({
  severity,
  size = 'md',
}) => {
  const configs: Record<Severity, { bg: string; text: string; border: string; label: string }> = {
    critical: {
      bg: 'bg-[#D95757]/15',
      text: 'text-[#B33E3E]',
      border: 'border-[#D95757]/40',
      label: 'CRITICAL',
    },
    high: {
      bg: 'bg-[#C77535]/15',
      text: 'text-[#9A5427]',
      border: 'border-[#C77535]/40',
      label: 'HIGH',
    },
    medium: {
      bg: 'bg-[#D9A441]/15',
      text: 'text-[#93691F]',
      border: 'border-[#D9A441]/40',
      label: 'MEDIUM',
    },
    low: {
      bg: 'bg-[#718096]/15',
      text: 'text-[#53677C]',
      border: 'border-[#718096]/40',
      label: 'LOW',
    },
  };

  const c = configs[severity] || configs.medium;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold tracking-wide border rounded ${c.bg} ${c.text} ${c.border} ${padding}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse bg-current" />
      {c.label}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: IncidentStatus }> = ({ status }) => {
  const configs: Record<IncidentStatus, { bg: string; text: string; border: string; label: string }> = {
    open: {
      bg: 'bg-[#718096]/15',
      text: 'text-[#4A6176]',
      border: 'border-[#E1EAF3]',
      label: 'OPEN',
    },
    investigating: {
      bg: 'bg-[#2677C9]/15',
      text: 'text-[#1E5E9B]',
      border: 'border-[#2677C9]/50',
      label: 'INVESTIGATING',
    },
    awaiting_approval: {
      bg: 'bg-[#D9A441]/20',
      text: 'text-[#93691F]',
      border: 'border-[#D9A441]/60',
      label: 'AWAITING APPROVAL',
    },
    remediating: {
      bg: 'bg-[#2677C9]/20',
      text: 'text-[#1E5E9B]',
      border: 'border-[#2677C9]/60',
      label: 'REMEDIATING',
    },
    verifying: {
      bg: 'bg-[#D9A441]/15',
      text: 'text-[#93691F]',
      border: 'border-[#D9A441]/50',
      label: 'VERIFYING',
    },
    resolved: {
      bg: 'bg-[#25856B]/20',
      text: 'text-[#1E6B58]',
      border: 'border-[#25856B]/50',
      label: 'RESOLVED',
    },
    failed: {
      bg: 'bg-[#D95757]/20',
      text: 'text-[#B33E3E]',
      border: 'border-[#D95757]/50',
      label: 'FAILED',
    },
  };

  const c = configs[status] || configs.open;

  return (
    <span
      className={`inline-flex items-center font-mono text-xs px-2.5 py-0.5 border rounded-sm font-medium tracking-wide ${c.bg} ${c.text} ${c.border}`}
    >
      {c.label}
    </span>
  );
};
