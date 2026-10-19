import React, { useState } from 'react';
import { IncidentLog, LogSeverity } from '../agent/types.ts';
import { Search, Filter, ChevronRight, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';

interface LogViewerProps {
  logs: IncidentLog[];
  highlightLogIds?: string[];
  onSelectLog?: (log: IncidentLog) => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  highlightLogIds = [],
  onSelectLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const services = Array.from(new Set(logs.map((l) => l.service_name)));

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.metadata).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity =
      selectedSeverity === 'ALL' || log.severity === selectedSeverity;

    const matchesService =
      selectedService === 'ALL' || log.service_name === selectedService;

    return matchesSearch && matchesSeverity && matchesService;
  });

  const severityBadgeClass: Record<LogSeverity, string> = {
    FATAL: 'bg-[#D95757]/20 text-[#B33E3E] border-[#D95757]/50',
    ERROR: 'bg-[#2677C9]/20 text-[#1E5E9B] border-[#2677C9]/50',
    WARN: 'bg-[#D9A441]/20 text-[#93691F] border-[#D9A441]/50',
    INFO: 'bg-[#25856B]/15 text-[#1E6B58] border-[#25856B]/40',
    DEBUG: 'bg-[#D9ECFF] text-[#718096] border-[#E1EAF3]',
  };

  return (
    <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] flex flex-col h-full overflow-hidden">
      {/* Controls Bar */}
      <div className="p-3 border-b border-[#E1EAF3] flex flex-wrap items-center justify-between gap-3 bg-[#F4F8FC]/60">
        <div className="flex items-center space-x-2 flex-1 min-w-[220px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#718096]" />
            <input
              type="text"
              placeholder="Search log messages, error codes, tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E1EAF3] rounded pl-8 pr-3 py-1.5 text-xs font-mono text-[#17324D] placeholder-[#718096] focus:outline-none focus:border-[#2677C9]"
            />
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-[#718096] flex items-center">
            <Filter className="w-3 h-3 mr-1" /> Level:
          </span>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-[#FFFFFF] border border-[#E1EAF3] text-[#17324D] rounded px-2 py-1 text-xs font-mono focus:outline-none"
          >
            <option value="ALL">ALL SEVERITIES</option>
            <option value="FATAL">FATAL</option>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="INFO">INFO</option>
          </select>

          {/* Service Filter */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="bg-[#FFFFFF] border border-[#E1EAF3] text-[#17324D] rounded px-2 py-1 text-xs font-mono focus:outline-none"
          >
            <option value="ALL">ALL SERVICES</option>
            {services.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono text-[#718096]">
          Showing {filteredLogs.length} of {logs.length} events
        </div>
      </div>

      {/* Log Stream Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#E1EAF3] font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-[#718096] font-mono">
            No matching log lines found in this incident stream.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isHighlighted = highlightLogIds.includes(log.id);
            const isExpanded = expandedLogId === log.id;

            return (
              <div
                key={log.id}
                onClick={() => {
                  setExpandedLogId(isExpanded ? null : log.id);
                  if (onSelectLog) onSelectLog(log);
                }}
                className={`p-2.5 transition-colors cursor-pointer ${
                  isHighlighted
                    ? 'bg-[#2677C9]/10 border-l-2 border-[#2677C9]'
                    : 'hover:bg-[#EAF4FF]'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <button className="text-[#718096] hover:text-[#17324D] pt-0.5">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* ID */}
                  <span className="text-[#718096] shrink-0 font-medium">
                    {log.id}
                  </span>

                  {/* Timestamp */}
                  <span className="text-[#718096] shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>

                  {/* Severity Badge */}
                  <span
                    className={`px-1.5 py-0.2 rounded border text-[10px] font-bold shrink-0 ${
                      severityBadgeClass[log.severity] || severityBadgeClass.INFO
                    }`}
                  >
                    {log.severity}
                  </span>

                  {/* Service Name */}
                  <span className="text-[#1E5E9B] shrink-0 font-medium">
                    [{log.service_name}]
                  </span>

                  {/* Message */}
                  <div className="flex-1 text-[#17324D] break-all">
                    {log.message}
                  </div>

                  {/* Evidence indicator */}
                  {isHighlighted && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#2677C9]/20 border border-[#2677C9]/60 text-[#1E5E9B] font-bold shrink-0">
                      CITED EVIDENCE
                    </span>
                  )}
                </div>

                {/* Expanded Metadata JSON */}
                {isExpanded && log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-2.5 ml-7 p-2 rounded bg-[#F4F8FC] border border-[#E1EAF3] text-[11px] text-[#4A6176]">
                    <div className="text-[10px] uppercase font-bold text-[#718096] mb-1">
                      Structured Metadata Payload:
                    </div>
                    <pre className="text-[#93691F] overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
