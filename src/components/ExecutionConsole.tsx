import React, { useState } from 'react';
import { RemediationProposal, RemediationAction } from '../agent/types.ts';
import { Terminal, Play, AlertTriangle, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

interface ExecutionConsoleProps {
  proposal?: RemediationProposal;
  action?: RemediationAction;
  onExecute: (proposalId: string, options?: { forceFailure?: boolean; forceVerificationFail?: boolean }) => Promise<void>;
  isExecuting: boolean;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  proposal,
  action,
  onExecute,
  isExecuting,
}) => {
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [simulateVerificationFailure, setSimulateVerificationFailure] = useState(false);

  const isApproved = proposal?.status === 'approved';
  const isExecuted = proposal?.status === 'executed';

  return (
    <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-4 font-mono flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E1EAF3] mb-4">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-[#1E5E9B]" />
          <h3 className="text-sm font-semibold text-[#17324D]">
            Sandbox Remediation Engine
          </h3>
        </div>

        {proposal && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#718096]">STATUS:</span>
            <span
              className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                isApproved
                  ? 'bg-[#25856B]/20 text-[#1E6B58] border-[#25856B]/50'
                  : isExecuted
                  ? 'bg-[#25856B]/10 text-[#1E6B58] border-[#25856B]/30'
                  : 'bg-[#D9A441]/20 text-[#93691F] border-[#D9A441]/50'
              }`}
            >
              {proposal.status.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Execution Controls */}
      {proposal && (
        <div className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3] mb-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[#718096]">Target Action: </span>
              <span className="text-[#1E5E9B] font-bold">{proposal.action_type}</span>
            </div>
            <div className="text-[#718096]">
              Hash: <span className="text-[#17324D]">{proposal.plan_hash}</span>
            </div>
          </div>

          {/* Simulation Mode Toggles */}
          <div className="pt-2 border-t border-[#E1EAF3] flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer text-[#4A6176] hover:text-[#17324D]">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="rounded border-[#E1EAF3] bg-[#FFFFFF] text-[#1E5E9B] focus:ring-0"
              />
              <span>Simulate Sandbox Subsystem Precondition Lock Failure</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer text-[#4A6176] hover:text-[#17324D]">
              <input
                type="checkbox"
                checked={simulateVerificationFailure}
                onChange={(e) => setSimulateVerificationFailure(e.target.checked)}
                className="rounded border-[#E1EAF3] bg-[#FFFFFF] text-[#1E5E9B] focus:ring-0"
              />
              <span>Simulate Post-Remediation Verification Failure (Honest reporting)</span>
            </label>
          </div>

          {/* Action Trigger Button */}
          <div className="pt-2 flex items-center justify-between">
            <div className="text-[11px] text-[#718096]">
              {!isApproved && !isExecuted
                ? 'Execution locked until Human SRE approval is signed in Approval Center'
                : isExecuted
                ? 'Action executed. State captured in verification engine.'
                : 'Plan approved. Ready for isolated sandbox execution.'}
            </div>

            <button
              onClick={() =>
                onExecute(proposal.id, {
                  forceFailure: simulateFailure,
                  forceVerificationFail: simulateVerificationFailure,
                })
              }
              disabled={!isApproved || isExecuting}
              className={`px-4 py-2 rounded font-bold text-xs flex items-center space-x-1.5 transition-all ${
                isApproved && !isExecuting
                  ? 'bg-[#2677C9] hover:bg-[#1E5E9B] text-white cursor-pointer'
                  : 'bg-[#EAF4FF] text-[#718096] border border-[#E1EAF3] cursor-not-allowed opacity-60'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
              <span>
                {isExecuting ? 'Executing in Sandbox...' : isExecuted ? 'Re-Execute in Sandbox' : 'Execute Sandbox Remediation'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Terminal Output */}
      <div className="flex-1 bg-[#F4F8FC] rounded border border-[#E1EAF3] p-3 text-xs overflow-y-auto font-mono flex flex-col justify-between min-h-[220px]">
        <div className="space-y-1.5">
          <div className="text-[#718096] pb-1 border-b border-[#E1EAF3] flex items-center justify-between">
            <span>[SANDBOX EXECUTION LOG BUFFER]</span>
            <span className="text-[10px] text-[#1E6B58]">READY</span>
          </div>

          {!action?.execution_logs || action.execution_logs.length === 0 ? (
            <div className="text-[#718096] italic pt-4">
              Awaiting execution trigger. Preconditions will be revalidated against immutable plan hash upon launch.
            </div>
          ) : (
            action.execution_logs.map((logLine, idx) => {
              const isError = logLine.includes('ERROR') || logLine.includes('REJECT');
              const isWarn = logLine.includes('WARN');
              const isExec = logLine.includes('EXEC') || logLine.includes('COMPLETE');

              return (
                <div
                  key={idx}
                  className={`${
                    isError
                      ? 'text-[#B33E3E]'
                      : isWarn
                      ? 'text-[#93691F]'
                      : isExec
                      ? 'text-[#1E6B58]'
                      : 'text-[#17324D]'
                  }`}
                >
                  <span className="text-[#718096] mr-2">[{idx + 1}]</span>
                  {logLine}
                </div>
              );
            })
          )}
        </div>

        {/* Before / After State Snapshot if executed */}
        {action && (
          <div className="mt-4 pt-3 border-t border-[#E1EAF3] grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-2 rounded bg-[#FFFFFF] border border-[#E1EAF3]">
              <div className="text-[#718096] uppercase font-bold mb-1">Before State (Baseline):</div>
              <div className="text-[#B33E3E]">
                {action.before_state.connection_utilization_pct !== undefined && (
                  <div>Pool Saturation: {action.before_state.connection_utilization_pct}%</div>
                )}
                {action.before_state.http_500_error_rate_pct !== undefined && (
                  <div>HTTP 500 Rate: {action.before_state.http_500_error_rate_pct}%</div>
                )}
                <div>Latency p99: {action.before_state.p99_latency_ms}ms</div>
                <div>Probe Health: {action.before_state.health_check_status}</div>
              </div>
            </div>

            <div className="p-2 rounded bg-[#FFFFFF] border border-[#E1EAF3]">
              <div className="text-[#718096] uppercase font-bold mb-1">After State (Remediated):</div>
              <div className="text-[#1E6B58]">
                {action.after_state.connection_utilization_pct !== undefined && (
                  <div>Pool Saturation: {action.after_state.connection_utilization_pct}%</div>
                )}
                {action.after_state.http_500_error_rate_pct !== undefined && (
                  <div>HTTP 500 Rate: {action.after_state.http_500_error_rate_pct}%</div>
                )}
                <div>Latency p99: {action.after_state.p99_latency_ms}ms</div>
                <div>Probe Health: {action.after_state.health_check_status}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
