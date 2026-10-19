import React, { useState } from 'react';
import { AutomatedTestReport, TestResultItem } from '../tests/agent.test.ts';
import { triggerAutomatedTests } from '../services/api.ts';
import { CheckCircle2, XCircle, Play, ShieldAlert, Clock, ChevronDown, ChevronRight, Terminal } from 'lucide-react';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<AutomatedTestReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await triggerAutomatedTests();
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Test execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324D]/55 backdrop-blur-xs p-4 font-mono">
      <div className="bg-[#FFFFFF] border border-[#E1EAF3] rounded-lg w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E1EAF3] flex items-center justify-between bg-[#F4F8FC]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-[#25856B]/15 border border-[#25856B]/40 text-[#1E6B58]">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17324D]">
                Automated SRE & Agent Verification Test Suite
              </h3>
              <div className="text-xs text-[#718096]">
                Deterministic Validation: Security, Sandboxing, Integrity & Citations
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="px-3 py-1.5 rounded bg-[#2677C9] hover:bg-[#1E5E9B] text-white text-xs font-bold transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Executing Suite...' : 'Run Full Suite'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-[#718096] hover:text-[#17324D] text-sm px-2 py-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-[#D95757]/15 border border-[#D95757]/40 text-[#B33E3E] rounded">
              {error}
            </div>
          )}

          {!report && !isRunning && (
            <div className="p-8 text-center text-[#718096]">
              Click "Run Full Suite" to execute deterministic tests for incident ingestion, log parsing, AI investigation citations, plan hash integrity, approval enforcement, sandbox remediation, and recovery verification.
            </div>
          )}

          {isRunning && (
            <div className="p-8 text-center space-y-3">
              <div className="inline-block animate-spin w-8 h-8 border-2 border-[#2677C9] border-t-transparent rounded-full" />
              <div className="text-[#17324D] font-semibold text-xs">
                Executing full suite in isolated sandbox memory...
              </div>
              <div className="text-[11px] text-[#718096]">
                Testing plan hash immutability, duplicate execution locks, and before/after verification metrics
              </div>
            </div>
          )}

          {report && (
            <>
              {/* Scorecard */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3]">
                  <div className="text-[10px] text-[#718096] uppercase">Suite Status</div>
                  <div className={`text-base font-bold mt-1 ${report.suite_status === 'PASSED' ? 'text-[#1E6B58]' : 'text-[#B33E3E]'}`}>
                    {report.suite_status}
                  </div>
                </div>

                <div className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3]">
                  <div className="text-[10px] text-[#718096] uppercase">Total Tests</div>
                  <div className="text-base font-bold text-[#17324D] mt-1">
                    {report.total_tests}
                  </div>
                </div>

                <div className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3]">
                  <div className="text-[10px] text-[#718096] uppercase">Passed</div>
                  <div className="text-base font-bold text-[#1E6B58] mt-1">
                    {report.passed_tests}
                  </div>
                </div>

                <div className="p-3 bg-[#F4F8FC] rounded border border-[#E1EAF3]">
                  <div className="text-[10px] text-[#718096] uppercase">Failed</div>
                  <div className="text-base font-bold text-[#B33E3E] mt-1">
                    {report.failed_tests}
                  </div>
                </div>
              </div>

              {/* Test List */}
              <div className="border border-[#E1EAF3] rounded divide-y divide-[#E1EAF3] bg-[#F4F8FC]">
                {report.results.map((t) => {
                  const isExpanded = expandedTestId === t.id;
                  return (
                    <div
                      key={t.id}
                      className="p-3 hover:bg-[#FFFFFF] transition-colors cursor-pointer"
                      onClick={() => setExpandedTestId(isExpanded ? null : t.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          {t.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-[#1E6B58] shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#B33E3E] shrink-0" />
                          )}
                          <span className="text-[#718096] font-semibold">{t.id}</span>
                          <span className="text-[#17324D] font-medium">{t.name}</span>
                          <span className="px-1.5 py-0.2 bg-[#EAF4FF] text-[#4A6176] rounded border border-[#E1EAF3] text-[10px]">
                            {t.category}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 text-[11px] text-[#718096]">
                          <span>{t.duration_ms}ms</span>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 ml-6 p-3 bg-[#FFFFFF] rounded border border-[#E1EAF3] space-y-2 text-[11px]">
                          <div>
                            <span className="text-[#718096] uppercase font-bold">Input: </span>
                            <pre className="text-[#93691F] inline">
                              {JSON.stringify(t.input)}
                            </pre>
                          </div>
                          <div>
                            <span className="text-[#718096] uppercase font-bold">Expected: </span>
                            <span className="text-[#1E6B58]">{t.expected}</span>
                          </div>
                          <div>
                            <span className="text-[#718096] uppercase font-bold">Actual: </span>
                            <span className="text-[#17324D]">{t.actual}</span>
                          </div>
                          <div>
                            <span className="text-[#718096] uppercase font-bold">Evidence: </span>
                            <span className="text-[#4A6176]">{t.evidence}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#E1EAF3] bg-[#F4F8FC] flex items-center justify-between text-[11px] text-[#718096]">
          <span>IncidentIQ AI Automated Test Runner</span>
          <span>100% Deterministic Verification</span>
        </div>
      </div>
    </div>
  );
};
