import React from 'react';
import {
  Activity,
  AlertTriangle,
  Cpu,
  FileText,
  BookOpen,
  CheckSquare,
  PlayCircle,
  ShieldCheck,
  History,
  Settings,
  Flame,
  Radio,
  Terminal,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'incidents'
  | 'investigations'
  | 'logs'
  | 'runbooks'
  | 'approvals'
  | 'sandbox'
  | 'verification'
  | 'audit'
  | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingApprovalsCount: number;
  activeIncidentCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
  activeIncidentCount,
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }> = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    {
      id: 'incidents',
      label: 'Incidents',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: activeIncidentCount > 0 ? activeIncidentCount : undefined,
      badgeColor: 'bg-[#D95757]/20 text-[#B33E3E] border-[#D95757]/40',
    },
    { id: 'investigations', label: 'AI Investigations', icon: <Cpu className="w-4 h-4" /> },
    { id: 'logs', label: 'Logs & Evidence', icon: <Terminal className="w-4 h-4" /> },
    { id: 'runbooks', label: 'Runbook Library', icon: <BookOpen className="w-4 h-4" /> },
    {
      id: 'approvals',
      label: 'Approval Center',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeColor: 'bg-[#D9A441]/20 text-[#93691F] border-[#D9A441]/50 animate-pulse',
    },
    { id: 'sandbox', label: 'Sandbox Execution', icon: <PlayCircle className="w-4 h-4" /> },
    { id: 'verification', label: 'Recovery Verification', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings & Tests', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="sidebar-pattern relative w-64 bg-[#FFFFFF] border-r border-[#E1EAF3] flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#E1EAF3] flex items-center space-x-3">
        <div className="relative w-9 h-9 rounded bg-[#FFFFFF] border border-[#2677C9]/60 flex items-center justify-center text-[#1E5E9B] shadow-sm">
          <Flame className="w-5 h-5 fill-current" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2677C9] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D9A441]"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-sm tracking-wider text-[#17324D] uppercase font-mono">
              IncidentIQ
            </span>
            <span className="text-[10px] font-mono px-1 py-0.2 bg-[#2677C9]/20 border border-[#2677C9]/50 text-[#1E5E9B] rounded font-bold">
              AI
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#718096] tracking-tight">
            Enterprise Incident Resolution
          </div>
        </div>
      </div>

      {/* Operational Signal State */}
      <div className="px-4 py-2.5 border-b border-[#E1EAF3] bg-[#FFFFFF]/40 flex items-center justify-between text-xs font-mono">
        <span className="flex items-center text-[#718096]">
          <Radio className="w-3.5 h-3.5 mr-1.5 text-[#1E6B58] animate-pulse" />
          HUMAN-GATED SRE
        </span>
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#25856B]/15 text-[#1E6B58] border border-[#25856B]/30">
          SANDBOX
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              aria-label={item.label}
              title={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono rounded transition-colors ${
                isActive
                  ? 'bg-[#EAF4FF] text-[#17324D] border-l-2 border-[#2677C9] font-medium shadow-inner'
                  : 'text-[#4A6176] hover:bg-[#FFFFFF] hover:text-[#17324D]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className={isActive ? 'text-[#1E5E9B]' : 'text-[#718096]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 border rounded ${item.badgeColor || 'bg-[#D9ECFF] text-[#4A6176]'}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* SRE On-Call Footer */}
      <div className="p-3 border-t border-[#E1EAF3] bg-[#FFFFFF]/60">
        <div className="text-[11px] font-mono text-[#718096] mb-1">PRIMARY ON-CALL</div>
        <div className="text-xs font-medium text-[#17324D] truncate">Elena Rostova</div>
        <div className="text-[10px] font-mono text-[#718096] truncate">sre-oncall@incidentiq.internal</div>
      </div>
    </aside>
  );
};
