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
      <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] flex flex-col overflow-hidden">
        <div className="p-3 border-b border-[#E1EAF3] bg-[#F4F8FC]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#718096]" />
            <input
              type="text"
              placeholder="Search SRE runbooks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E1EAF3] rounded pl-8 pr-3 py-1.5 text-xs text-[#17324D] placeholder-[#718096] focus:outline-none focus:border-[#2677C9]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#E1EAF3]">
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
                    ? 'bg-[#EAF4FF] border-l-2 border-[#2677C9]'
                    : 'hover:bg-[#FFFFFF]'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-[#718096] mb-1">
                  <span>{rb.id}</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#D9ECFF] text-[10px]">
                    {rb.source_type}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#17324D] mb-1.5 line-clamp-1">
                  {rb.title}
                </div>
                <div className="flex flex-wrap gap-1">
                  {rb.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.2 rounded bg-[#F4F8FC] text-[#4A6176] text-[10px] border border-[#E1EAF3]"
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
      <div className="md:col-span-2 border border-[#E1EAF3] rounded bg-[#FFFFFF] p-5 overflow-y-auto flex flex-col space-y-4">
        {currentRunbook ? (
          <>
            <div className="border-b border-[#E1EAF3] pb-3 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 text-xs text-[#718096] mb-1">
                  <span className="text-[#1E5E9B] font-bold">{currentRunbook.id}</span>
                  <span>·</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#25856B]/15 text-[#1E6B58] border border-[#25856B]/30 text-[10px]">
                    SYNTHETIC SRE FIXTURE
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#17324D]">
                  {currentRunbook.title}
                </h3>
                <p className="text-xs text-[#4A6176] mt-1">
                  {currentRunbook.description}
                </p>
              </div>
            </div>

            {/* Markdown/Content view */}
            <div className="p-4 bg-[#F4F8FC] rounded border border-[#E1EAF3] text-xs text-[#17324D] whitespace-pre-wrap leading-relaxed">
              {currentRunbook.content}
            </div>

            {/* Troubleshooting Steps */}
            <div>
              <div className="text-xs font-bold uppercase text-[#718096] mb-2">
                Prescribed Troubleshooting Steps:
              </div>
              <div className="space-y-2">
                {currentRunbook.troubleshooting_steps.map((st) => (
                  <div
                    key={st.step}
                    className="flex items-start space-x-3 p-2.5 rounded bg-[#EAF4FF] border border-[#E1EAF3] text-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#F4F8FC] border border-[#E1EAF3] text-[#1E5E9B] font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {st.step}
                    </span>
                    <span className="text-[#17324D] mt-0.5">{st.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Approved Remediation Guidance */}
            <div className="p-3 bg-[#2677C9]/10 border border-[#2677C9]/30 rounded text-xs">
              <div className="text-[11px] font-bold uppercase text-[#1E5E9B] mb-1">
                Approved Remediation Guidance:
              </div>
              <div className="text-[#17324D]">
                {currentRunbook.approved_remediation_guidance}
              </div>
            </div>

            {/* Rollback Procedure */}
            <div className="p-3 bg-[#F4F8FC] border border-[#E1EAF3] rounded text-xs">
              <div className="text-[11px] font-bold uppercase text-[#B33E3E] mb-1">
                Emergency Rollback Instructions:
              </div>
              <div className="text-[#4A6176]">
                {currentRunbook.rollback_instructions}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-[#718096] text-xs p-8">
            Select a runbook to inspect troubleshooting procedures.
          </div>
        )}
      </div>
    </div>
  );
};
