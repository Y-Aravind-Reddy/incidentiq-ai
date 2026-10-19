import React, { useState } from 'react';
import { AuditEvent, AuditStage, AuditActor } from '../agent/types.ts';
import { ChevronDown, ChevronRight, Shield, User, Bot, Server } from 'lucide-react';

interface AuditTimelineProps {
  events: AuditEvent[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stageBadges: Record<AuditStage, { bg: string; text: string; border: string }> = {
    OBSERVE: { bg: 'bg-[#756B5D]/15', text: 'text-[#655D51]', border: 'border-[#D4C1A1]' },
    INVESTIGATE: { bg: 'bg-[#B86B43]/15', text: 'text-[#985333]', border: 'border-[#B86B43]/40' },
    PROPOSE: { bg: 'bg-[#B86B43]/20', text: 'text-[#8A6030]', border: 'border-[#B86B43]/50' },
    APPROVE: { bg: 'bg-[#718777]/15', text: 'text-[#4F6555]', border: 'border-[#718777]/40' },
    REJECT: { bg: 'bg-[#C74F46]/15', text: 'text-[#A73832]', border: 'border-[#C74F46]/40' },
    EXECUTE: { bg: 'bg-[#D4A15D]/15', text: 'text-[#8A6030]', border: 'border-[#D4A15D]/40' },
    VERIFY: { bg: 'bg-[#718777]/20', text: 'text-[#4F6555]', border: 'border-[#718777]/50' },
    RESET: { bg: 'bg-[#E4D8C4]', text: 'text-[#756B5D]', border: 'border-[#D4C1A1]' },
  };

  const actorIcons: Record<AuditActor, React.ReactNode> = {
    AI_AGENT: <Bot className="w-3.5 h-3.5 text-[#985333]" />,
    HUMAN_OPERATOR: <User className="w-3.5 h-3.5 text-[#4F6555]" />,
    SANDBOX_ENGINE: <Server className="w-3.5 h-3.5 text-[#8A6030]" />,
  };

  return (
    <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] font-mono divide-y divide-[#D4C1A1]">
      <div className="p-3 bg-[#F4EFE5] flex items-center justify-between text-xs text-[#756B5D]">
        <span>IMMUTABLE SYSTEM AUDIT LEDGER</span>
        <span>{events.length} TOTAL AUDIT EVENTS RECORDED</span>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center text-[#756B5D] text-xs">
          No audit events recorded yet.
        </div>
      ) : (
        events.map((ev) => {
          const badge = stageBadges[ev.action_stage] || stageBadges.OBSERVE;
          const isExpanded = expandedId === ev.id;

          return (
            <div
              key={ev.id}
              className="p-3 hover:bg-[#EDE4D4] transition-colors cursor-pointer text-xs"
              onClick={() => setExpandedId(isExpanded ? null : ev.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <button className="text-[#756B5D]">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <span
                    className={`px-2 py-0.5 rounded border text-[10px] font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    {ev.action_stage}
                  </span>

                  <span className="flex items-center space-x-1 text-[#756B5D] text-[11px]">
                    {actorIcons[ev.actor_type]}
                    <span>{ev.actor_name}</span>
                  </span>

                  <span className="text-[#756B5D]">·</span>

                  <span className="text-[#332B20] font-medium">{ev.summary}</span>
                </div>

                <div className="flex items-center space-x-2 shrink-0 text-[#756B5D] text-[11px]">
                  <span className="px-1.5 py-0.5 bg-[#F4EFE5] rounded border border-[#D4C1A1]">
                    {ev.incident_id}
                  </span>
                  <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {isExpanded && ev.details && Object.keys(ev.details).length > 0 && (
                <div className="mt-2.5 ml-6 p-2.5 rounded bg-[#F4EFE5] border border-[#D4C1A1] text-[11px]">
                  <div className="text-[10px] text-[#756B5D] uppercase font-bold mb-1">
                    Audit Event Payload & State Verification:
                  </div>
                  <pre className="text-[#8A6030] overflow-x-auto">
                    {JSON.stringify(ev.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
