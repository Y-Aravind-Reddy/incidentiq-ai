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
    FATAL: 'bg-[#C74F46]/20 text-[#A73832] border-[#C74F46]/50',
    ERROR: 'bg-[#B86B43]/20 text-[#985333] border-[#B86B43]/50',
    WARN: 'bg-[#D4A15D]/20 text-[#8A6030] border-[#D4A15D]/50',
    INFO: 'bg-[#718777]/15 text-[#4F6555] border-[#718777]/40',
    DEBUG: 'bg-[#E4D8C4] text-[#756B5D] border-[#D4C1A1]',
  };

  return (
    <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] flex flex-col h-full overflow-hidden">
      {/* Controls Bar */}
      <div className="p-3 border-b border-[#D4C1A1] flex flex-wrap items-center justify-between gap-3 bg-[#F4EFE5]/60">
        <div className="flex items-center space-x-2 flex-1 min-w-[220px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#756B5D]" />
            <input
              type="text"
              placeholder="Search log messages, error codes, tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#FAF6EE] border border-[#D4C1A1] rounded pl-8 pr-3 py-1.5 text-xs font-mono text-[#332B20] placeholder-[#756B5D] focus:outline-none focus:border-[#B86B43]"
            />
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-[#756B5D] flex items-center">
            <Filter className="w-3 h-3 mr-1" /> Level:
          </span>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-[#FAF6EE] border border-[#D4C1A1] text-[#332B20] rounded px-2 py-1 text-xs font-mono focus:outline-none"
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
            className="bg-[#FAF6EE] border border-[#D4C1A1] text-[#332B20] rounded px-2 py-1 text-xs font-mono focus:outline-none"
          >
            <option value="ALL">ALL SERVICES</option>
            {services.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono text-[#756B5D]">
          Showing {filteredLogs.length} of {logs.length} events
        </div>
      </div>

      {/* Log Stream Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#D4C1A1] font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-[#756B5D] font-mono">
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
                    ? 'bg-[#B86B43]/10 border-l-2 border-[#B86B43]'
                    : 'hover:bg-[#EDE4D4]'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <button className="text-[#756B5D] hover:text-[#332B20] pt-0.5">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* ID */}
                  <span className="text-[#756B5D] shrink-0 font-medium">
                    {log.id}
                  </span>

                  {/* Timestamp */}
                  <span className="text-[#756B5D] shrink-0">
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
                  <span className="text-[#985333] shrink-0 font-medium">
                    [{log.service_name}]
                  </span>

                  {/* Message */}
                  <div className="flex-1 text-[#332B20] break-all">
                    {log.message}
                  </div>

                  {/* Evidence indicator */}
                  {isHighlighted && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#B86B43]/20 border border-[#B86B43]/60 text-[#985333] font-bold shrink-0">
                      CITED EVIDENCE
                    </span>
                  )}
                </div>

                {/* Expanded Metadata JSON */}
                {isExpanded && log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-2.5 ml-7 p-2 rounded bg-[#F4EFE5] border border-[#D4C1A1] text-[11px] text-[#655D51]">
                    <div className="text-[10px] uppercase font-bold text-[#756B5D] mb-1">
                      Structured Metadata Payload:
                    </div>
                    <pre className="text-[#8A6030] overflow-x-auto">
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
