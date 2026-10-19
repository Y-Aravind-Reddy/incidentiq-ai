import React from 'react';
import { Severity, IncidentStatus } from '../agent/types.ts';

export const SeverityBadge: React.FC<{ severity: Severity; size?: 'sm' | 'md' }> = ({
  severity,
  size = 'md',
}) => {
  const configs: Record<Severity, { bg: string; text: string; border: string; label: string }> = {
    critical: {
      bg: 'bg-[#C74F46]/15',
      text: 'text-[#A73832]',
      border: 'border-[#C74F46]/40',
      label: 'CRITICAL',
    },
    high: {
      bg: 'bg-[#B86B43]/15',
      text: 'text-[#985333]',
      border: 'border-[#B86B43]/40',
      label: 'HIGH',
    },
    medium: {
      bg: 'bg-[#D4A15D]/15',
      text: 'text-[#8A6030]',
      border: 'border-[#D4A15D]/40',
      label: 'MEDIUM',
    },
    low: {
      bg: 'bg-[#718777]/15',
      text: 'text-[#4F6555]',
      border: 'border-[#718777]/40',
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
      bg: 'bg-[#756B5D]/15',
      text: 'text-[#655D51]',
      border: 'border-[#D4C1A1]',
      label: 'OPEN',
    },
    investigating: {
      bg: 'bg-[#B86B43]/15',
      text: 'text-[#985333]',
      border: 'border-[#B86B43]/50',
      label: 'INVESTIGATING',
    },
    awaiting_approval: {
      bg: 'bg-[#D4A15D]/20',
      text: 'text-[#8A6030]',
      border: 'border-[#D4A15D]/60',
      label: 'AWAITING APPROVAL',
    },
    remediating: {
      bg: 'bg-[#B86B43]/20',
      text: 'text-[#985333]',
      border: 'border-[#B86B43]/60',
      label: 'REMEDIATING',
    },
    verifying: {
      bg: 'bg-[#D4A15D]/15',
      text: 'text-[#8A6030]',
      border: 'border-[#D4A15D]/50',
      label: 'VERIFYING',
    },
    resolved: {
      bg: 'bg-[#718777]/20',
      text: 'text-[#4F6555]',
      border: 'border-[#718777]/50',
      label: 'RESOLVED',
    },
    failed: {
      bg: 'bg-[#C74F46]/20',
      text: 'text-[#A73832]',
      border: 'border-[#C74F46]/50',
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
