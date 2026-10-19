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
      <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-[#B86B43]/15 text-[#985333] border border-[#B86B43]/40">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#332B20]">
              Operational Settings & Testing Control
            </h3>
            <p className="text-xs text-[#756B5D]">
              Inspect runtime health, Gemini configuration, Supabase integration, and execute automated verification tests.
            </p>
          </div>
        </div>

        <button
          onClick={onRunTests}
          className="px-4 py-2 bg-[#718777] hover:bg-[#4F6555] text-[#F4EFE5] font-bold rounded flex items-center space-x-1.5 transition-colors"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Run Automated Tests</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-[#718777]/20 border border-[#718777]/50 text-[#4F6555] rounded">
          {message}
        </div>
      )}
      {healthError && (
        <div role="alert" className="p-3 bg-[#C74F46]/15 border border-[#C74F46]/40 text-[#A73832] rounded">
          {healthError}
        </div>
      )}

      {/* Backend & AI Integration Status */}
      <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-5 space-y-4">
        <h4 className="text-sm font-semibold text-[#332B20] flex items-center space-x-2 border-b border-[#D4C1A1] pb-3">
          <Server className="w-4 h-4 text-[#985333]" />
          <span>System Architecture & Runtime Telemetry</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 bg-[#F4EFE5] rounded border border-[#D4C1A1] space-y-1">
            <div className="text-[10px] text-[#756B5D] uppercase">AI Reasoning Engine</div>
            <div className="text-sm font-bold text-[#332B20] flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-[#985333]" />
              <span>{health?.model || 'gemini-3.8-flash'}</span>
            </div>
            <div className="text-[11px] text-[#4F6555]">
              {health?.has_gemini_key ? '● Gemini API Key Active' : '● Grounded SRE Reasoner Active'}
            </div>
          </div>

          <div className="p-3.5 bg-[#F4EFE5] rounded border border-[#D4C1A1] space-y-1">
            <div className="text-[10px] text-[#756B5D] uppercase">Database Persistence</div>
            <div className="text-sm font-bold text-[#332B20] flex items-center space-x-1.5">
              {health?.supabase_connected
                ? <CheckCircle2 className="w-4 h-4 text-[#4F6555]" />
                : <AlertTriangle className="w-4 h-4 text-[#C74F46]" />}
              <span>
                {health?.storage_mode === 'supabase'
                  ? health.supabase_connected ? 'Supabase Tables Accessible' : 'Supabase Configured · Unavailable'
                  : 'In-Memory — Not Persisted'}
              </span>
            </div>
            <div className="text-[11px] text-[#655D51]">
              {health?.supabase_connected
                ? 'All expected tables are accessible and application routes use the server-side repository. This health check does not verify a write.'
                : health?.storage_mode === 'supabase'
                  ? health?.supabase_diagnostics?.diagnostic || 'Database access is unavailable; database errors will not fall back to memory.'
                  : health?.supabase_diagnostics?.diagnostic || 'WARNING: Supabase is unconfigured; app state is held only in memory.'}
            </div>
          </div>

          <div className="p-3.5 bg-[#F4EFE5] rounded border border-[#D4C1A1] space-y-1">
            <div className="text-[10px] text-[#756B5D] uppercase">Execution Sandbox</div>
            <div className="text-sm font-bold text-[#8A6030]">
              DETERMINISTIC SANDBOX
            </div>
            <div className="text-[11px] text-[#756B5D]">
              Air-gapped from production systems
            </div>
          </div>
        </div>
      </div>

      {/* Demo Walkthrough Guide */}
      <div className="border border-[#D4C1A1] rounded bg-[#FAF6EE] p-5 space-y-4">
        <h4 className="text-sm font-semibold text-[#332B20] flex items-center space-x-2 border-b border-[#D4C1A1] pb-3">
          <Layers className="w-4 h-4 text-[#8A6030]" />
          <span>Hackathon Demo Scenarios Guide</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-[#F4EFE5] rounded border border-[#D4C1A1] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#985333]">SCENARIO A</span>
              <span className="px-1.5 py-0.2 bg-[#C74F46]/15 text-[#A73832] border border-[#C74F46]/40 rounded text-[10px]">CRITICAL</span>
            </div>
            <div className="font-semibold text-[#332B20]">DB Connection Pool Exhaustion</div>
            <p className="text-[11px] text-[#756B5D] leading-relaxed">
              1. Open incident <span className="text-[#332B20]">INC-2026-8841</span>.<br />
              2. Inspect logs with acquisition timeouts and stale handles.<br />
              3. Run Gemini Investigation to cite LOG-8841-01 through 04.<br />
              4. Review proposal with immutable plan hash.<br />
              5. Approve and execute in sandbox to verify recovery.
            </p>
          </div>

          <div className="p-3.5 bg-[#F4EFE5] rounded border border-[#D4C1A1] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#985333]">SCENARIO B</span>
              <span className="px-1.5 py-0.2 bg-[#B86B43]/15 text-[#985333] border border-[#B86B43]/40 rounded text-[10px]">HIGH</span>
            </div>
            <div className="font-semibold text-[#332B20]">HTTP 500 Post-Config Deployment</div>
            <p className="text-[11px] text-[#756B5D] leading-relaxed">
              1. Open incident <span className="text-[#332B20]">INC-2026-9024</span>.<br />
              2. Note ConfigValidationError and canonical hash mismatch.<br />
              3. AI identifies root cause and proposes rolling rollback.<br />
              4. Test honest reporting by toggling simulated failure mode in the sandbox console.
            </p>
          </div>
        </div>
      </div>

      {/* Sandbox Reset Section */}
      <div className="border border-[#B86B43]/40 rounded bg-[#FAF6EE] p-5 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[#332B20]">
            Sandbox State Reset
          </h4>
          <p className="text-xs text-[#756B5D] mt-1 max-w-lg">
            Restore all incidents, logs, telemetry metrics, and proposals back to their pristine baseline for a fresh demonstration run.
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="px-4 py-2 bg-[#EDE4D4] hover:bg-[#E4D8C4] border border-[#B86B43] text-[#985333] hover:text-[#332B20] rounded font-bold transition-colors flex items-center space-x-1.5 disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting...' : 'Reset Sandbox to Pristine'}</span>
        </button>
      </div>
    </div>
  );
};
