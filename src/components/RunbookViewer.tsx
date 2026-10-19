import React, { useState } from 'react';
import { Runbook } from '../agent/types.ts';
import { BookOpen, Search, Tag, ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface RunbookViewerProps {
  runbooks: Runbook[];
  activeRunbookId?: string;
  onSelectRunbook?: (id: string) => void;
}

export const RunbookViewer: React.FC<RunbookViewerProps> = ({
  runbooks,
  activeRunbookId,
  onSelectRunbook,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string>(activeRunbookId || runbooks[0]?.id || '');

  const filtered = runbooks.filter(
    (rb) =>
      rb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rb.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rb.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const currentRunbook = runbooks.find((r) => r.id === selectedId) || runbooks[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono h-full">
      {/* Runbook List Column */}
      <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] flex flex-col overflow-hidden">
        <div className="p-3 border-b border-[#D4C1A1] bg-[#F4EFE5]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#756B5D]" />
            <input
              type="text"
              placeholder="Search SRE runbooks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#FAF6EE] border border-[#D4C1A1] rounded pl-8 pr-3 py-1.5 text-xs text-[#332B20] placeholder-[#756B5D] focus:outline-none focus:border-[#B86B43]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#D4C1A1]">
          {filtered.map((rb) => {
            const isSelected = rb.id === selectedId;
            return (
              <div
                key={rb.id}
                onClick={() => {
                  setSelectedId(rb.id);
                  if (onSelectRunbook) onSelectRunbook(rb.id);
                }}
                className={`p-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#EDE4D4] border-l-2 border-[#B86B43]'
                    : 'hover:bg-[#FAF6EE]'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-[#756B5D] mb-1">
                  <span>{rb.id}</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#E4D8C4] text-[10px]">
                    {rb.source_type}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#332B20] mb-1.5 line-clamp-1">
                  {rb.title}
                </div>
                <div className="flex flex-wrap gap-1">
                  {rb.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.2 rounded bg-[#F4EFE5] text-[#655D51] text-[10px] border border-[#D4C1A1]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Runbook Detail Column */}
      <div className="md:col-span-2 border border-[#D4C1A1] rounded bg-[#FAF6EE] p-5 overflow-y-auto flex flex-col space-y-4">
        {currentRunbook ? (
          <>
            <div className="border-b border-[#D4C1A1] pb-3 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 text-xs text-[#756B5D] mb-1">
                  <span className="text-[#985333] font-bold">{currentRunbook.id}</span>
                  <span>·</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#718777]/15 text-[#4F6555] border border-[#718777]/30 text-[10px]">
                    SYNTHETIC SRE FIXTURE
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#332B20]">
                  {currentRunbook.title}
                </h3>
                <p className="text-xs text-[#655D51] mt-1">
                  {currentRunbook.description}
                </p>
              </div>
            </div>

            {/* Markdown/Content view */}
            <div className="p-4 bg-[#F4EFE5] rounded border border-[#D4C1A1] text-xs text-[#332B20] whitespace-pre-wrap leading-relaxed">
              {currentRunbook.content}
            </div>

            {/* Troubleshooting Steps */}
            <div>
              <div className="text-xs font-bold uppercase text-[#756B5D] mb-2">
                Prescribed Troubleshooting Steps:
              </div>
              <div className="space-y-2">
                {currentRunbook.troubleshooting_steps.map((st) => (
                  <div
                    key={st.step}
                    className="flex items-start space-x-3 p-2.5 rounded bg-[#EDE4D4] border border-[#D4C1A1] text-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#F4EFE5] border border-[#D4C1A1] text-[#985333] font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {st.step}
                    </span>
                    <span className="text-[#332B20] mt-0.5">{st.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Approved Remediation Guidance */}
            <div className="p-3 bg-[#B86B43]/10 border border-[#B86B43]/30 rounded text-xs">
              <div className="text-[11px] font-bold uppercase text-[#985333] mb-1">
                Approved Remediation Guidance:
              </div>
              <div className="text-[#332B20]">
                {currentRunbook.approved_remediation_guidance}
              </div>
            </div>

            {/* Rollback Procedure */}
            <div className="p-3 bg-[#F4EFE5] border border-[#D4C1A1] rounded text-xs">
              <div className="text-[11px] font-bold uppercase text-[#A73832] mb-1">
                Emergency Rollback Instructions:
              </div>
              <div className="text-[#655D51]">
                {currentRunbook.rollback_instructions}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-[#756B5D] text-xs p-8">
            Select a runbook to inspect troubleshooting procedures.
          </div>
        )}
      </div>
    </div>
  );
};
