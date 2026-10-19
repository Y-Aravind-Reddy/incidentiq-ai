import React, { useState, useEffect } from 'react';
import { fetchHealth, resetSandbox } from '../services/api.ts';
import {
  Settings,
  Server,
  Cpu,
  Database,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  Shield,
  Layers,
} from 'lucide-react';

interface SettingsViewProps {
  onRunTests: () => void;
  onResetComplete: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onRunTests,
  onResetComplete,
}) => {
  const [health, setHealth] = useState<any>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealthError('Runtime health is unavailable. Check the backend connection.'));
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    setMessage(null);
    try {
      const res = await resetSandbox();
      setMessage(res.message);
      onResetComplete();
    } catch (err: any) {
      setMessage(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs max-w-4xl">
      {/* Header */}
      <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-[#2677C9]/15 text-[#1E5E9B] border border-[#2677C9]/40">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#17324D]">
              Operational Settings & Testing Control
            </h3>
            <p className="text-xs text-[#718096]">
              Inspect runtime health, Gemini configuration, Supabase integration, and execute automated verification tests.
            </p>
          </div>
        </div>

        <button
          onClick={onRunTests}
          className="px-4 py-2 bg-[#25856B] hover:bg-[#1E6B58] text-[#F4F8FC] font-bold rounded flex items-center space-x-1.5 transition-colors"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Run Automated Tests</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-[#25856B]/20 border border-[#25856B]/50 text-[#1E6B58] rounded">
          {message}
        </div>
      )}
      {healthError && (
        <div role="alert" className="p-3 bg-[#D95757]/15 border border-[#D95757]/40 text-[#B33E3E] rounded">
          {healthError}
        </div>
      )}

      {/* Backend & AI Integration Status */}
      <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-5 space-y-4">
        <h4 className="text-sm font-semibold text-[#17324D] flex items-center space-x-2 border-b border-[#E1EAF3] pb-3">
          <Server className="w-4 h-4 text-[#1E5E9B]" />
          <span>System Architecture & Runtime Telemetry</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 bg-[#F4F8FC] rounded border border-[#E1EAF3] space-y-1">
            <div className="text-[10px] text-[#718096] uppercase">AI Reasoning Engine</div>
            <div className="text-sm font-bold text-[#17324D] flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-[#1E5E9B]" />
              <span>{health?.model || 'gemini-3.8-flash'}</span>
            </div>
            <div className="text-[11px] text-[#1E6B58]">
              {health?.has_gemini_key ? '● Gemini API Key Active' : '● Grounded SRE Reasoner Active'}
            </div>
          </div>

          <div className="p-3.5 bg-[#F4F8FC] rounded border border-[#E1EAF3] space-y-1">
            <div className="text-[10px] text-[#718096] uppercase">Database Persistence</div>
            <div className="text-sm font-bold text-[#17324D] flex items-center space-x-1.5">
              {health?.supabase_connected
                ? <CheckCircle2 className="w-4 h-4 text-[#1E6B58]" />
                : <AlertTriangle className="w-4 h-4 text-[#D95757]" />}
              <span>
                {health?.storage_mode === 'supabase'
                  ? health.supabase_connected ? 'Supabase Tables Accessible' : 'Supabase Configured · Unavailable'
                  : 'In-Memory — Not Persisted'}
              </span>
            </div>
            <div className="text-[11px] text-[#4A6176]">
              {health?.supabase_connected
                ? 'All expected tables are accessible and application routes use the server-side repository. This health check does not verify a write.'
                : health?.storage_mode === 'supabase'
                  ? health?.supabase_diagnostics?.diagnostic || 'Database access is unavailable; database errors will not fall back to memory.'
                  : health?.supabase_diagnostics?.diagnostic || 'WARNING: Supabase is unconfigured; app state is held only in memory.'}
            </div>
          </div>

          <div className="p-3.5 bg-[#F4F8FC] rounded border border-[#E1EAF3] space-y-1">
            <div className="text-[10px] text-[#718096] uppercase">Execution Sandbox</div>
            <div className="text-sm font-bold text-[#93691F]">
              DETERMINISTIC SANDBOX
            </div>
            <div className="text-[11px] text-[#718096]">
              Air-gapped from production systems
            </div>
          </div>
        </div>
      </div>

      {/* Demo Walkthrough Guide */}
      <div className="border border-[#E1EAF3] rounded bg-[#FFFFFF] p-5 space-y-4">
        <h4 className="text-sm font-semibold text-[#17324D] flex items-center space-x-2 border-b border-[#E1EAF3] pb-3">
          <Layers className="w-4 h-4 text-[#93691F]" />
          <span>Hackathon Demo Scenarios Guide</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-[#F4F8FC] rounded border border-[#E1EAF3] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1E5E9B]">SCENARIO A</span>
              <span className="px-1.5 py-0.2 bg-[#D95757]/15 text-[#B33E3E] border border-[#D95757]/40 rounded text-[10px]">CRITICAL</span>
            </div>
            <div className="font-semibold text-[#17324D]">DB Connection Pool Exhaustion</div>
            <p className="text-[11px] text-[#718096] leading-relaxed">
              1. Open incident <span className="text-[#17324D]">INC-2026-8841</span>.<br />
              2. Inspect logs with acquisition timeouts and stale handles.<br />
              3. Run Gemini Investigation to cite LOG-8841-01 through 04.<br />
              4. Review proposal with immutable plan hash.<br />
              5. Approve and execute in sandbox to verify recovery.
            </p>
          </div>

          <div className="p-3.5 bg-[#F4F8FC] rounded border border-[#E1EAF3] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1E5E9B]">SCENARIO B</span>
              <span className="px-1.5 py-0.2 bg-[#2677C9]/15 text-[#1E5E9B] border border-[#2677C9]/40 rounded text-[10px]">HIGH</span>
            </div>
            <div className="font-semibold text-[#17324D]">HTTP 500 Post-Config Deployment</div>
            <p className="text-[11px] text-[#718096] leading-relaxed">
              1. Open incident <span className="text-[#17324D]">INC-2026-9024</span>.<br />
              2. Note ConfigValidationError and canonical hash mismatch.<br />
              3. AI identifies root cause and proposes rolling rollback.<br />
              4. Test honest reporting by toggling simulated failure mode in the sandbox console.
            </p>
          </div>
        </div>
      </div>

      {/* Sandbox Reset Section */}
      <div className="border border-[#2677C9]/40 rounded bg-[#FFFFFF] p-5 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[#17324D]">
            Sandbox State Reset
          </h4>
          <p className="text-xs text-[#718096] mt-1 max-w-lg">
            Restore all incidents, logs, telemetry metrics, and proposals back to their pristine baseline for a fresh demonstration run.
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="px-4 py-2 bg-[#EAF4FF] hover:bg-[#D9ECFF] border border-[#2677C9] text-[#1E5E9B] hover:text-[#17324D] rounded font-bold transition-colors flex items-center space-x-1.5 disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting...' : 'Reset Sandbox to Pristine'}</span>
        </button>
      </div>
    </div>
  );
};
