import React from 'react';
import { Incident, RemediationProposal, RemediationAction } from '../agent/types.ts';
import { ExecutionConsole } from '../components/ExecutionConsole.tsx';
import { PlayCircle, ShieldAlert } from 'lucide-react';

interface SandboxViewProps {
  incident: Incident;
  proposals: RemediationProposal[];
  selectedProposalId?: string;
  onSelectProposal: (id: string) => void;
  onExecuteProposal: (
    proposalId: string,
    options?: { forceFailure?: boolean; forceVerificationFail?: boolean }
  ) => Promise<void>;
  isExecuting: boolean;
  action?: RemediationAction;
}

export const SandboxView: React.FC<SandboxViewProps> = ({
  incident,
  proposals,
  selectedProposalId,
  onSelectProposal,
  onExecuteProposal,
  isExecuting,
  action,
}) => {
  const activeProposal =
    proposals.find((p) => p.id === selectedProposalId) || proposals[0];

  return (
    <div className="evidence-pattern space-y-4 font-mono">
      {/* Proposal Selector if multiple */}
      {proposals.length > 1 && (
        <div className="p-3 bg-[#FAF6EE] border border-[#D4C1A1] rounded flex items-center space-x-3 text-xs">
          <span className="text-[#756B5D]">Select Proposal:</span>
          <div className="flex flex-wrap gap-2">
            {proposals.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectProposal(p.id)}
                className={`px-2.5 py-1 rounded border text-xs ${
                  p.id === activeProposal?.id
                    ? 'bg-[#EDE4D4] text-[#985333] border-[#B86B43]'
                    : 'bg-[#F4EFE5] text-[#655D51] border-[#D4C1A1]'
                }`}
              >
                {p.id} — {p.action_type} ({p.status})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Execution Console */}
      <ExecutionConsole
        proposal={activeProposal}
        action={action}
        onExecute={onExecuteProposal}
        isExecuting={isExecuting}
      />
    </div>
  );
};
