import React, { useState } from 'react';
import { Incident, Severity, IncidentStatus } from '../agent/types.ts';
import { SeverityBadge, StatusBadge } from '../components/SeverityBadge.tsx';
import { Search, Filter, Plus, Cpu, Terminal, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface IncidentsViewProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  onTriggerInvestigation: (id: string) => void;
  onOpenCreateModal: () => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  incidents,
  onSelectIncident,
  onTriggerInvestigation,
  onOpenCreateModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      searchTerm === '' ||
      inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.service_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity =
      severityFilter === 'ALL' || inc.severity === severityFilter;

    const matchesStatus =
      statusFilter === 'ALL' || inc.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-4 font-mono">
      {/* Controls Bar */}
      <div className="p-4 border border-[#D4C1A1] rounded bg-[#FAF6EE] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1 min-w-[260px]">
          <div className="relative w-full max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#756B5D]" />
            <input
              type="text"
              placeholder="Filter by ID (INC-2026-...), service, keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F4EFE5] border border-[#D4C1A1] rounded pl-8 pr-3 py-1.5 text-xs text-[#332B20] placeholder-[#756B5D] focus:outline-none focus:border-[#B86B43]"
            />
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 text-[#756B5D]">
            <Filter className="w-3.5 h-3.5" />
            <span>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-[#F4EFE5] border border-[#D4C1A1] text-[#332B20] rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option value="ALL">ALL</option>
              <option value="critical">CRITICAL</option>
              <option value="high">HIGH</option>
              <option value="medium">MEDIUM</option>
              <option value="low">LOW</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-[#756B5D]">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F4EFE5] border border-[#D4C1A1] text-[#332B20] rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="open">OPEN</option>
              <option value="investigating">INVESTIGATING</option>
              <option value="awaiting_approval">AWAITING APPROVAL</option>
              <option value="remediating">REMEDIATING</option>
              <option value="resolved">RESOLVED</option>
              <option value="failed">FAILED</option>
            </select>
          </div>

          {/* New Incident Trigger */}
          <button
            onClick={onOpenCreateModal}
            className="px-3 py-1.5 bg-[#B86B43] hover:bg-[#985333] text-[#332B20] rounded font-bold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Inject Incident</span>
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F4EFE5] border-b border-[#D4C1A1] text-[#756B5D] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Incident ID</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Service & Environment</th>
              <th className="py-3 px-4">Title & Symptoms</th>
              <th className="py-3 px-4">Health Probe</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D4C1A1]">
            {filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#756B5D]">
                  No incidents match the selected filters.
                </td>
              </tr>
            ) : (
              filteredIncidents.map((inc) => (
                <tr
                  key={inc.id}
                  className="hover:bg-[#EDE4D4] transition-colors cursor-pointer"
                  onClick={() => onSelectIncident(inc.id)}
                >
                  <td className="py-3.5 px-4 font-bold text-[#332B20]">
                    {inc.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <SeverityBadge severity={inc.severity} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={inc.status} />
                  </td>
                  <td className="py-3.5 px-4 text-[#655D51]">
                    <div className="font-semibold text-[#332B20]">{inc.service_name}</div>
                    <div className="text-[10px] text-[#756B5D]">{inc.environment}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#332B20] max-w-md">
                    <div className="font-medium line-clamp-1">{inc.title}</div>
                    <div className="text-[11px] text-[#756B5D] line-clamp-1">{inc.description}</div>
                  </td>
                  <td className="py-3.5 px-4 font-bold">
                    <span
                      className={`text-xs ${
                        inc.metrics.health_check_status === 'HEALTHY'
                          ? 'text-[#4F6555]'
                          : 'text-[#A73832]'
                      }`}
                    >
                      {inc.metrics.health_check_status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerInvestigation(inc.id);
                      }}
                      className="px-2.5 py-1 bg-[#FAF6EE] hover:bg-[#B86B43] hover:text-[#332B20] border border-[#B86B43]/60 text-[#985333] rounded font-bold text-xs inline-flex items-center space-x-1 transition-all"
                    >
                      <Cpu className="w-3 h-3" />
                      <span>Investigate</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
