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
  onOpenCreateIncident: () => void;
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
  onOpenCreateIncident,
}) => {
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter((i) => i.status !== 'resolved').length;
  const criticalIncidents = incidents.filter((i) => i.severity === 'critical').length;
  const pendingApprovals = proposals.filter((p) => p.status === 'pending');
  const executedActions = proposals.filter((p) => p.status === 'executed').length;
  const severityCounts = [
    { label: 'Critical', color: '#D95757', count: incidents.filter((incident) => incident.severity === 'critical').length },
    { label: 'High', color: '#C77535', count: incidents.filter((incident) => incident.severity === 'high').length },
    { label: 'Medium', color: '#D9A441', count: incidents.filter((incident) => incident.severity === 'medium').length },
    { label: 'Low', color: '#718096', count: incidents.filter((incident) => incident.severity === 'low').length },
  ];
  let severityAngle = 0;
  const severityGradient = incidents.length
    ? `conic-gradient(${severityCounts.map(({ color, count }) => {
      const start = severityAngle;
      severityAngle += (count / incidents.length) * 360;
      return `${color} ${start}deg ${severityAngle}deg`;
    }).join(', ')})`
    : 'conic-gradient(#E1EAF3 0deg 360deg)';

  return (
    <div className="space-y-6 font-mono">
      <section className="dashboard-hero relative overflow-hidden rounded-2xl border border-[#D9A441]/45 px-6 py-6 sm:px-9 sm:py-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E5E9B]">
            <Activity className="h-3.5 w-3.5" />
            <span>Enterprise AI Operations</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#17324D] sm:text-3xl">IncidentIQ AI</h2>
          <p className="mt-1 max-w-xl text-sm font-medium text-[#1E5E9B]">Diagnose <span className="text-[#D9A441]">·</span> Analyze <span className="text-[#D9A441]">·</span> Resolve <span className="text-[#D9A441]">·</span> Learn</p>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#4A6176] sm:text-sm">AI-powered incident resolution with evidence, human approval and safe remediation.</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button onClick={onOpenCreateIncident} className="rounded-lg bg-[#2677C9] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1E5E9B]">+ New Incident</button>
            <button onClick={() => onNavigateTab('investigations')} className="rounded-lg border border-[#2677C9]/25 bg-white/80 px-4 py-2 text-sm font-semibold text-[#1E5E9B] hover:bg-white">Ask AI Assistant</button>
          </div>
        </div>
        <div aria-hidden="true" className="hero-orbit absolute -right-12 -top-24 h-72 w-72 rounded-full border border-[#2677C9]/20" />
        <div aria-hidden="true" className="hero-orbit hero-orbit-secondary absolute -right-2 -top-16 h-56 w-56 rounded-full border border-[#D9A441]/35" />
      </section>
      {/* Top Telemetry KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard
          label="Total Incidents"
          value={totalIncidents}
          subValue="Sandbox Fixtures"
          status="neutral"
          icon={<Activity className="w-4 h-4 text-[#718096]" />}
        />
        <MetricCard
          label="Active / Open"
          value={openIncidents}
          subValue="Requires Triage"
          status={openIncidents > 0 ? 'warning' : 'nominal'}
          icon={<AlertTriangle className="w-4 h-4 text-[#93691F]" />}
        />
        <MetricCard
          label="Critical Severity"
          value={criticalIncidents}
          subValue="SLA Breach Risk"
          status={criticalIncidents > 0 ? 'critical' : 'nominal'}
          icon={<Flame className="w-4 h-4 text-[#B33E3E]" />}
        />
        <MetricCard
          label="Pending Approvals"
          value={pendingApprovals.length}
          subValue="Human SRE Gate"
          status={pendingApprovals.length > 0 ? 'warning' : 'nominal'}
          icon={<CheckSquare className="w-4 h-4 text-[#93691F]" />}
        />
        <MetricCard
          label="Actions Executed"
          value={executedActions}
          subValue="Sandbox Engine"
          status="neutral"
          icon={<PlayCircle className="w-4 h-4 text-[#1E5E9B]" />}
        />
        <MetricCard
          label="Recovery Status"
          value={verification ? verification.status === 'VERIFIED_RECOVERED' ? 'RECOVERED' : 'EVALUATING' : 'PENDING'}
          subValue={verification ? `${verification.criteria_results.filter(c => c.passed).length}/${verification.criteria_results.length} gates` : 'Awaiting Run'}
          status={verification?.status === 'VERIFIED_RECOVERED' ? 'nominal' : 'warning'}
          icon={<ShieldCheck className="w-4 h-4 text-[#1E6B58]" />}
        />
      </div>

      {/* Main Row: Incident Stream & Pending Approval Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Incidents Table */}
        <div className="lg:col-span-2 border border-[#E1EAF3] rounded bg-[#FFFFFF] flex flex-col">
          <div className="p-4 border-b border-[#E1EAF3] flex items-center justify-between bg-[#F4F8FC]">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-[#1E5E9B]" />
              <h3 className="text-sm font-semibold text-[#17324D]">
                Active Sandbox Incidents
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('incidents')}
              className="text-xs text-[#1E5E9B] hover:underline flex items-center space-x-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#E1EAF3] overflow-x-auto">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc.id)}
                className="p-4 hover:bg-[#EAF4FF] transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold text-[#17324D]">{inc.id}</span>
                    <SeverityBadge severity={inc.severity} size="sm" />
                    <StatusBadge status={inc.status} />
                    <span className="text-xs text-[#718096]">[{inc.service_name}]</span>
                  </div>
                  <div className="text-xs text-[#4A6176] line-clamp-1">
                    {inc.title}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-[#93691F] font-bold">
                    {inc.metrics.health_check_status}
                  </div>
                  <div className="text-[11px] text-[#718096]">
                    {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Pending Human Approval Gate */}
        <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] flex flex-col">
          <div className="p-4 border-b border-[#E1EAF3] flex items-center justify-between bg-[#F4F8FC]">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-[#93691F]" />
              <h3 className="text-sm font-semibold text-[#17324D]">
                Approval Queue ({pendingApprovals.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('approvals')}
              className="text-xs text-[#93691F] hover:underline flex items-center space-x-1"
            >
              <span>Center</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="text-center text-[#718096] text-xs py-8">
                No remediation proposals currently awaiting human authorization.
              </div>
            ) : (
              pendingApprovals.map((prop) => (
                <div
                  key={prop.id}
                  className="p-3 rounded bg-[#F4F8FC] border border-[#D9A441]/40 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#718096]">{prop.id}</span>
                    <span className="text-[#93691F] font-bold uppercase">{prop.risk_level} RISK</span>
                  </div>
                  <div className="text-[#17324D] font-semibold text-xs">
                    {prop.action_type}
                  </div>
                  <div className="text-[11px] text-[#718096] font-mono truncate">
                    Hash: {prop.plan_hash}
                  </div>
                  <button
                    onClick={() => onOpenApproval(prop)}
                    className="w-full mt-2 py-1.5 rounded bg-[#2677C9] hover:bg-[#1E5E9B] text-white text-xs font-bold transition-colors"
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
        {/* Incident severity distribution derived from the live incident list. */}
        <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-4 flex flex-col">
          <div className="border-b border-[#E1EAF3] pb-3 mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#17324D] flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#2677C9]" />
              <span>Incidents by Severity</span>
            </h3>
            <span className="text-[10px] text-[#718096]">LIVE INCIDENT DATA</span>
          </div>

          <div className="flex flex-1 items-center justify-center gap-8 py-3">
            <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: severityGradient }} role="img" aria-label={`${incidents.length} incidents distributed by severity`}>
              <div className="grid h-24 w-24 place-content-center rounded-full bg-white text-center shadow-inner">
                <span className="text-2xl font-semibold text-[#17324D]">{incidents.length}</span>
                <span className="text-[10px] uppercase tracking-wide text-[#718096]">Incidents</span>
              </div>
            </div>
            <div className="space-y-3">
              {severityCounts.map(({ label, color, count }) => (
                <div key={label} className="flex min-w-32 items-center justify-between gap-5 text-xs">
                  <span className="flex items-center gap-2 text-[#4A6176]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>
                  <span className="font-semibold tabular-nums text-[#17324D]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Audit Timeline Widget */}
        <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-4 flex flex-col">
          <div className="border-b border-[#E1EAF3] pb-3 mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#17324D] flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#1E5E9B]" />
              <span>Latest Agent & Human Actions</span>
            </h3>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs text-[#1E5E9B] hover:underline"
            >
              Full Ledger
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-56">
            {auditEvents.slice(0, 5).map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded bg-[#F4F8FC] border border-[#E1EAF3] text-xs flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EAF4FF] text-[#1E5E9B] border border-[#E1EAF3] font-bold">
                      {ev.action_stage}
                    </span>
                    <span className="text-[#718096] text-[11px]">{ev.actor_name}</span>
                  </div>
                  <div className="text-[#17324D] line-clamp-1">{ev.summary}</div>
                </div>
                <span className="text-[10px] text-[#718096] shrink-0 ml-2">
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
