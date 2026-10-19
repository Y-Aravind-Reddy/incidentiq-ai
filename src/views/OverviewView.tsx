import React from 'react';
import { Incident, RemediationProposal, InvestigationRun, VerificationResult, AuditEvent } from '../agent/types.ts';
import { MetricCard } from '../components/MetricCard.tsx';
import { SeverityBadge, StatusBadge } from '../components/SeverityBadge.tsx';
import {
  AlertTriangle,
  Cpu,
  CheckSquare,
  ShieldCheck,
  PlayCircle,
  Activity,
  ArrowRight,
  TrendingUp,
  Clock,
  Flame,
} from 'lucide-react';

interface OverviewViewProps {
  incidents: Incident[];
  proposals: RemediationProposal[];
  investigations: InvestigationRun[];
  verification?: VerificationResult;
  auditEvents: AuditEvent[];
  onSelectIncident: (id: string) => void;
  onNavigateTab: (tab: any) => void;
  onOpenApproval: (proposal: RemediationProposal) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  incidents,
  proposals,
  investigations,
  verification,
  auditEvents,
  onSelectIncident,
  onNavigateTab,
  onOpenApproval,
}) => {
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter((i) => i.status !== 'resolved').length;
  const criticalIncidents = incidents.filter((i) => i.severity === 'critical').length;
  const pendingApprovals = proposals.filter((p) => p.status === 'pending');
  const executedActions = proposals.filter((p) => p.status === 'executed').length;

  return (
    <div className="space-y-6 font-mono">
      <section className="dashboard-hero relative overflow-hidden rounded-xl border border-[#D4A15D]/45 px-6 py-5 sm:px-8 sm:py-7">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#985333]">
            <Activity className="h-3.5 w-3.5" />
            <span>IncidentIQ Control Room</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[#332B20] sm:text-2xl">Incident response overview</h2>
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[#655D51] sm:text-sm">Triage, investigate, approve, and verify recovery from one operational workspace.</p>
        </div>
        <div aria-hidden="true" className="hero-orbit absolute -right-12 -top-24 h-72 w-72 rounded-full border border-[#B86B43]/20" />
        <div aria-hidden="true" className="hero-orbit hero-orbit-secondary absolute -right-2 -top-16 h-56 w-56 rounded-full border border-[#D4A15D]/35" />
      </section>
      {/* Top Telemetry KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Total Incidents"
          value={totalIncidents}
          subValue="Sandbox Fixtures"
          status="neutral"
          icon={<Activity className="w-4 h-4 text-[#756B5D]" />}
        />
        <MetricCard
          label="Active / Open"
          value={openIncidents}
          subValue="Requires Triage"
          status={openIncidents > 0 ? 'warning' : 'nominal'}
          icon={<AlertTriangle className="w-4 h-4 text-[#8A6030]" />}
        />
        <MetricCard
          label="Critical Severity"
          value={criticalIncidents}
          subValue="SLA Breach Risk"
          status={criticalIncidents > 0 ? 'critical' : 'nominal'}
          icon={<Flame className="w-4 h-4 text-[#A73832]" />}
        />
        <MetricCard
          label="Pending Approvals"
          value={pendingApprovals.length}
          subValue="Human SRE Gate"
          status={pendingApprovals.length > 0 ? 'warning' : 'nominal'}
          icon={<CheckSquare className="w-4 h-4 text-[#8A6030]" />}
        />
        <MetricCard
          label="Actions Executed"
          value={executedActions}
          subValue="Sandbox Engine"
          status="neutral"
          icon={<PlayCircle className="w-4 h-4 text-[#985333]" />}
        />
        <MetricCard
          label="Recovery Status"
          value={verification ? verification.status === 'VERIFIED_RECOVERED' ? 'RECOVERED' : 'EVALUATING' : 'PENDING'}
          subValue={verification ? `${verification.criteria_results.filter(c => c.passed).length}/${verification.criteria_results.length} gates` : 'Awaiting Run'}
          status={verification?.status === 'VERIFIED_RECOVERED' ? 'nominal' : 'warning'}
          icon={<ShieldCheck className="w-4 h-4 text-[#4F6555]" />}
        />
      </div>

      {/* Main Row: Incident Stream & Pending Approval Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Incidents Table */}
        <div className="lg:col-span-2 border border-[#D4C1A1] rounded bg-[#FAF6EE] flex flex-col">
          <div className="p-4 border-b border-[#D4C1A1] flex items-center justify-between bg-[#F4EFE5]">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-[#985333]" />
              <h3 className="text-sm font-semibold text-[#332B20]">
                Active Production Incidents
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('incidents')}
              className="text-xs text-[#985333] hover:underline flex items-center space-x-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#D4C1A1] overflow-x-auto">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc.id)}
                className="p-4 hover:bg-[#EDE4D4] transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold text-[#332B20]">{inc.id}</span>
                    <SeverityBadge severity={inc.severity} size="sm" />
                    <StatusBadge status={inc.status} />
                    <span className="text-xs text-[#756B5D]">[{inc.service_name}]</span>
                  </div>
                  <div className="text-xs text-[#655D51] line-clamp-1">
                    {inc.title}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-[#8A6030] font-bold">
                    {inc.metrics.health_check_status}
                  </div>
                  <div className="text-[11px] text-[#756B5D]">
                    {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Pending Human Approval Gate */}
        <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] flex flex-col">
          <div className="p-4 border-b border-[#D4C1A1] flex items-center justify-between bg-[#F4EFE5]">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-[#8A6030]" />
              <h3 className="text-sm font-semibold text-[#332B20]">
                Approval Queue ({pendingApprovals.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('approvals')}
              className="text-xs text-[#8A6030] hover:underline flex items-center space-x-1"
            >
              <span>Center</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="text-center text-[#756B5D] text-xs py-8">
                No remediation proposals currently awaiting human authorization.
              </div>
            ) : (
              pendingApprovals.map((prop) => (
                <div
                  key={prop.id}
                  className="p-3 rounded bg-[#F4EFE5] border border-[#D4A15D]/40 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#756B5D]">{prop.id}</span>
                    <span className="text-[#8A6030] font-bold uppercase">{prop.risk_level} RISK</span>
                  </div>
                  <div className="text-[#332B20] font-semibold text-xs">
                    {prop.action_type}
                  </div>
                  <div className="text-[11px] text-[#756B5D] font-mono truncate">
                    Hash: {prop.plan_hash}
                  </div>
                  <button
                    onClick={() => onOpenApproval(prop)}
                    className="w-full mt-2 py-1.5 rounded bg-[#B86B43] hover:bg-[#985333] text-[#332B20] text-xs font-bold transition-colors"
                  >
                    Review & Authorize
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Telemetry Charts & Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custom SRE Incident Distribution & Telemetry SVG Chart */}
        <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-4 flex flex-col">
          <div className="border-b border-[#D4C1A1] pb-3 mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#332B20] flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#4F6555]" />
              <span>Sandbox Latency & Saturation Trajectory</span>
            </h3>
            <span className="text-[10px] text-[#756B5D]">LAST 60 MINUTES</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {/* SVG Chart using strictly palette: #F4EFE5, #D4C1A1, #D4A15D, #B86B43, #718777 */}
            <div className="h-44 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                {/* Horizontal grid lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="#D4C1A1" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#D4C1A1" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#D4C1A1" strokeDasharray="3 3" />

                {/* Pre-incident baseline */}
                <path
                  d="M 0 120 L 100 118 L 180 115 L 240 40 L 320 25 L 420 30 L 460 110 L 500 115"
                  fill="none"
                  stroke="#C74F46"
                  strokeWidth="2.5"
                />

                {/* Remediated recovery curve */}
                <path
                  d="M 320 25 L 380 75 L 440 115 L 500 118"
                  fill="none"
                  stroke="#718777"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />

                {/* Incident trigger point */}
                <circle cx="240" cy="40" r="4" fill="#C74F46" stroke="#F4EFE5" strokeWidth="2" />
                {/* Remediated point */}
                <circle cx="440" cy="115" r="4" fill="#718777" stroke="#F4EFE5" strokeWidth="2" />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#756B5D] pt-3 border-t border-[#D4C1A1]">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C74F46]" />
                <span>Saturation Spike (INC-2026-8841)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#718777]" />
                <span>Post-Remediation Recovery Target</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Audit Timeline Widget */}
        <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-4 flex flex-col">
          <div className="border-b border-[#D4C1A1] pb-3 mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#332B20] flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#985333]" />
              <span>Latest Agent & Human Actions</span>
            </h3>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs text-[#985333] hover:underline"
            >
              Full Ledger
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-56">
            {auditEvents.slice(0, 5).map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded bg-[#F4EFE5] border border-[#D4C1A1] text-xs flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EDE4D4] text-[#985333] border border-[#D4C1A1] font-bold">
                      {ev.action_stage}
                    </span>
                    <span className="text-[#756B5D] text-[11px]">{ev.actor_name}</span>
                  </div>
                  <div className="text-[#332B20] line-clamp-1">{ev.summary}</div>
                </div>
                <span className="text-[10px] text-[#756B5D] shrink-0 ml-2">
                  {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
