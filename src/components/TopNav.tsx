import React, { useState } from 'react';
import {
  Search,
  RotateCcw,
  Bell,
  Play,
  CheckCircle2,
  Server,
  Zap,
  LogOut,
} from 'lucide-react';
import { Incident } from '../agent/types.ts';

interface TopNavProps {
  currentTab: string;
  incidents: Incident[];
  selectedIncidentId: string;
  onSelectIncident: (id: string) => void;
  pendingApprovalsCount: number;
  onOpenApprovals: () => void;
  onResetSandbox: () => void;
  onRunTests: () => void;
  isResetting: boolean;
  onSignOut: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  incidents,
  selectedIncidentId,
  onSelectIncident,
  pendingApprovalsCount,
  onOpenApprovals,
  onResetSandbox,
  onRunTests,
  isResetting,
  onSignOut,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredIncidents = incidents.filter(
    (inc) =>
      inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.service_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabTitles: Record<string, string> = {
    overview: 'Operational Command Overview',
    incidents: 'Active Incident Management',
    investigations: 'AI Root-Cause Investigation',
    logs: 'Telemetry & Evidence Explorer',
    runbooks: 'SRE Standard Runbook Library',
    approvals: 'Human Approval Center',
    sandbox: 'Sandbox Remediation Engine',
    verification: 'Post-Remediation Verification',
    audit: 'Immutable Audit Trail',
    settings: 'Environment Configuration & Automated Tests',
  };

  return (
    <header className="h-14 bg-[#F4F8FC] border-b border-[#E1EAF3] px-6 flex items-center justify-between z-10 shrink-0">
      {/* Page Title & Breadcrumbs */}
      <div className="flex items-center space-x-3">
        <span className="text-xs font-mono text-[#718096] uppercase tracking-wider">COMMAND /</span>
        <h1 className="text-sm font-semibold text-[#17324D] font-mono tracking-tight">
          {tabTitles[currentTab] || currentTab}
        </h1>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Global Incident Quick Selector */}
        <div className="relative">
          <div className="flex items-center bg-[#FFFFFF] border border-[#E1EAF3] rounded px-2.5 py-1 text-xs font-mono text-[#17324D]">
            <Server className="w-3.5 h-3.5 mr-2 text-[#1E5E9B]" />
            <select
              value={selectedIncidentId}
              onChange={(e) => onSelectIncident(e.target.value)}
              className="bg-transparent text-[#17324D] focus:outline-none cursor-pointer pr-4"
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id} className="bg-[#FFFFFF] text-[#17324D]">
                  {inc.id} — {inc.service_name} ({inc.severity.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Environment Badge */}
        <div className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#D9A441]/10 border border-[#D9A441]/40 text-[#93691F] text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441] animate-pulse mr-1" />
          <span>SANDBOX</span>
        </div>

        {/* Approvals Bell Alert */}
        <button
          onClick={onOpenApprovals}
          className={`relative p-1.5 rounded border border-[#E1EAF3] bg-[#FFFFFF] text-[#4A6176] hover:text-[#17324D] hover:border-[#2677C9] transition-colors ${
            pendingApprovalsCount > 0 ? 'border-[#D9A441]/60 text-[#93691F]' : ''
          }`}
          title="Pending Approvals"
        >
          <Bell className="w-4 h-4" />
          {pendingApprovalsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D9A441] text-[#F4F8FC] text-[10px] font-bold font-mono">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          onClick={onSignOut}
          className="flex items-center space-x-1.5 px-3 py-1 bg-[#FFFFFF] hover:bg-[#EAF4FF] border border-[#E1EAF3] hover:border-[#2677C9] text-[#4A6176] rounded text-xs font-mono transition-colors"
          title="Sign out of IncidentIQ AI"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>

        {/* Run Tests Button */}
        <button
          onClick={onRunTests}
          className="flex items-center space-x-1.5 px-3 py-1 bg-[#FFFFFF] hover:bg-[#EAF4FF] border border-[#E1EAF3] hover:border-[#25856B] text-[#17324D] rounded text-xs font-mono transition-colors"
          title="Run 12 Automated Verification Tests"
        >
          <Play className="w-3.5 h-3.5 text-[#1E6B58]" />
          <span>Run Tests</span>
        </button>

        {/* Reset Sandbox Button */}
        <button
          onClick={onResetSandbox}
          disabled={isResetting}
          className="flex items-center space-x-1.5 px-3 py-1 bg-[#EAF4FF] hover:bg-[#D9ECFF] border border-[#2677C9]/60 hover:border-[#2677C9] text-[#1E5E9B] rounded text-xs font-mono transition-colors disabled:opacity-50"
          title="Reset sandbox incidents, logs, and state to pristine baseline"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting...' : 'Reset Sandbox'}</span>
        </button>
      </div>
    </header>
  );
};
