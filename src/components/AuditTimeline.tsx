import React, { useState } from 'react';
import { AuditEvent, AuditStage, AuditActor } from '../agent/types.ts';
import { ChevronDown, ChevronRight, Shield, User, Bot, Server } from 'lucide-react';

interface AuditTimelineProps {
  events: AuditEvent[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stageBadges: Record<AuditStage, { bg: string; text: string; border: string }> = {
    OBSERVE: { bg: 'bg-[#718096]/15', text: 'text-[#4A6176]', border: 'border-[#E1EAF3]' },
    INVESTIGATE: { bg: 'bg-[#2677C9]/15', text: 'text-[#1E5E9B]', border: 'border-[#2677C9]/40' },
    PROPOSE: { bg: 'bg-[#2677C9]/20', text: 'text-[#93691F]', border: 'border-[#2677C9]/50' },
    APPROVE: { bg: 'bg-[#25856B]/15', text: 'text-[#1E6B58]', border: 'border-[#25856B]/40' },
    REJECT: { bg: 'bg-[#D95757]/15', text: 'text-[#B33E3E]', border: 'border-[#D95757]/40' },
    EXECUTE: { bg: 'bg-[#D9A441]/15', text: 'text-[#93691F]', border: 'border-[#D9A441]/40' },
    VERIFY: { bg: 'bg-[#25856B]/20', text: 'text-[#1E6B58]', border: 'border-[#25856B]/50' },
    RESET: { bg: 'bg-[#D9ECFF]', text: 'text-[#718096]', border: 'border-[#E1EAF3]' },
  };

  const actorIcons: Record<AuditActor, React.ReactNode> = {
    AI_AGENT: <Bot className="w-3.5 h-3.5 text-[#1E5E9B]" />,
    HUMAN_OPERATOR: <User className="w-3.5 h-3.5 text-[#1E6B58]" />,
    SANDBOX_ENGINE: <Server className="w-3.5 h-3.5 text-[#93691F]" />,
  };

  return (
    <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] font-mono divide-y divide-[#E1EAF3]">
      <div className="p-3 bg-[#F4F8FC] flex items-center justify-between text-xs text-[#718096]">
        <span>IMMUTABLE SYSTEM AUDIT LEDGER</span>
        <span>{events.length} TOTAL AUDIT EVENTS RECORDED</span>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center text-[#718096] text-xs">
          No audit events recorded yet.
        </div>
      ) : (
        events.map((ev) => {
          const badge = stageBadges[ev.action_stage] || stageBadges.OBSERVE;
          const isExpanded = expandedId === ev.id;

          return (
            <div
              key={ev.id}
              className="p-3 hover:bg-[#EAF4FF] transition-colors cursor-pointer text-xs"
              onClick={() => setExpandedId(isExpanded ? null : ev.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <button className="text-[#718096]">
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

                  <span className="flex items-center space-x-1 text-[#718096] text-[11px]">
                    {actorIcons[ev.actor_type]}
                    <span>{ev.actor_name}</span>
                  </span>

                  <span className="text-[#718096]">·</span>

                  <span className="text-[#17324D] font-medium">{ev.summary}</span>
                </div>

                <div className="flex items-center space-x-2 shrink-0 text-[#718096] text-[11px]">
                  <span className="px-1.5 py-0.5 bg-[#F4F8FC] rounded border border-[#E1EAF3]">
                    {ev.incident_id}
                  </span>
                  <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {isExpanded && ev.details && Object.keys(ev.details).length > 0 && (
                <div className="mt-2.5 ml-6 p-2.5 rounded bg-[#F4F8FC] border border-[#E1EAF3] text-[11px]">
                  <div className="text-[10px] text-[#718096] uppercase font-bold mb-1">
                    Audit Event Payload & State Verification:
                  </div>
                  <pre className="text-[#93691F] overflow-x-auto">
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
