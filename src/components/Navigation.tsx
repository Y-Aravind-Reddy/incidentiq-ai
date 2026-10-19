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
      badgeColor: 'bg-[#C74F46]/20 text-[#A73832] border-[#C74F46]/40',
    },
    { id: 'investigations', label: 'AI Investigations', icon: <Cpu className="w-4 h-4" /> },
    { id: 'logs', label: 'Logs & Evidence', icon: <Terminal className="w-4 h-4" /> },
    { id: 'runbooks', label: 'Runbook Library', icon: <BookOpen className="w-4 h-4" /> },
    {
      id: 'approvals',
      label: 'Approval Center',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeColor: 'bg-[#D4A15D]/20 text-[#8A6030] border-[#D4A15D]/50 animate-pulse',
    },
    { id: 'sandbox', label: 'Sandbox Execution', icon: <PlayCircle className="w-4 h-4" /> },
    { id: 'verification', label: 'Recovery Verification', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings & Tests', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="sidebar-pattern relative w-64 bg-[#F4EFE5] border-r border-[#D4C1A1] flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#D4C1A1] flex items-center space-x-3">
        <div className="relative w-9 h-9 rounded bg-[#FAF6EE] border border-[#B86B43]/60 flex items-center justify-center text-[#985333] shadow-sm">
          <Flame className="w-5 h-5 fill-current" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B86B43] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D4A15D]"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-sm tracking-wider text-[#332B20] uppercase font-mono">
              IncidentIQ
            </span>
            <span className="text-[10px] font-mono px-1 py-0.2 bg-[#B86B43]/20 border border-[#B86B43]/50 text-[#985333] rounded font-bold">
              AI
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#756B5D] tracking-tight">
            Enterprise Incident Agent
          </div>
        </div>
      </div>

      {/* Operational Signal State */}
      <div className="px-4 py-2.5 border-b border-[#D4C1A1] bg-[#FAF6EE]/40 flex items-center justify-between text-xs font-mono">
        <span className="flex items-center text-[#756B5D]">
          <Radio className="w-3.5 h-3.5 mr-1.5 text-[#4F6555] animate-pulse" />
          AUTONOMOUS SRE
        </span>
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#718777]/15 text-[#4F6555] border border-[#718777]/30">
          HEALTHY
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
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono rounded transition-colors ${
                isActive
                  ? 'bg-[#EDE4D4] text-[#332B20] border-l-2 border-[#B86B43] font-medium shadow-inner'
                  : 'text-[#655D51] hover:bg-[#FAF6EE] hover:text-[#332B20]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className={isActive ? 'text-[#985333]' : 'text-[#756B5D]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 border rounded ${item.badgeColor || 'bg-[#E4D8C4] text-[#655D51]'}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* SRE On-Call Footer */}
      <div className="p-3 border-t border-[#D4C1A1] bg-[#FAF6EE]/60">
        <div className="text-[11px] font-mono text-[#756B5D] mb-1">PRIMARY ON-CALL</div>
        <div className="text-xs font-medium text-[#332B20] truncate">Elena Rostova</div>
        <div className="text-[10px] font-mono text-[#756B5D] truncate">sre-oncall@incidentiq.internal</div>
      </div>
    </aside>
  );
};
