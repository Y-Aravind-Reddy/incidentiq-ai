import React, { useState, useEffect, useCallback } from 'react';
import {
  Incident,
  IncidentLog,
  InvestigationRun,
  RemediationProposal,
  Runbook,
  VerificationResult,
  AuditEvent,
} from './agent/types.ts';
import {
  fetchIncidents,
  fetchIncidentDetails,
  fetchRunbooks,
  fetchAllAudit,
  runInvestigation,
  approveProposal,
  rejectProposal,
  executeProposal,
  resetSandbox,
} from './services/api.ts';
import { Navigation, NavTab } from './components/Navigation.tsx';
import { TopNav } from './components/TopNav.tsx';
import { OverviewView } from './views/OverviewView.tsx';
import { IncidentsView } from './views/IncidentsView.tsx';
import { InvestigationView } from './views/InvestigationView.tsx';
import { LogViewer } from './components/LogViewer.tsx';
import { RunbookViewer } from './components/RunbookViewer.tsx';
import { ApprovalsView } from './views/ApprovalsView.tsx';
import { SandboxView } from './views/SandboxView.tsx';
import { VerificationView } from './views/VerificationView.tsx';
import { AuditView } from './views/AuditView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { ApprovalModal } from './components/ApprovalModal.tsx';
import { TestRunnerModal } from './components/TestRunnerModal.tsx';
import { NewIncidentModal } from './components/NewIncidentModal.tsx';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('INC-2026-8841');
  const [currentIncidentData, setCurrentIncidentData] = useState<{
    incident: Incident;
    logs: IncidentLog[];
    investigations: InvestigationRun[];
    proposals: RemediationProposal[];
    verification?: VerificationResult;
    audit: AuditEvent[];
  } | null>(null);

  const [allRunbooks, setAllRunbooks] = useState<Runbook[]>([]);
  const [allAudit, setAllAudit] = useState<AuditEvent[]>([]);
  const [highlightedLogIds, setHighlightedLogIds] = useState<string[]>([]);
  const [activeRunbookId, setActiveRunbookId] = useState<string | undefined>();

  // Modals & Async States
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedProposalForModal, setSelectedProposalForModal] = useState<RemediationProposal | null>(null);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
  const [isNewIncidentOpen, setIsNewIncidentOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'warn' | 'error'; message: string } | null>(null);

  // Load all incidents and runbooks
  const reloadData = useCallback(async () => {
    try {
      const incList = await fetchIncidents();
      setIncidents(incList);
      if (incList.length > 0 && !incList.some((i) => i.id === selectedIncidentId)) {
        setSelectedIncidentId(incList[0].id);
      }
      const rbs = await fetchRunbooks();
      setAllRunbooks(rbs);
      const audits = await fetchAllAudit();
      setAllAudit(audits);
      return true;
    } catch (err) {
      setBannerNotice({ type: 'error', message: err instanceof Error ? err.message : 'Dashboard data could not be loaded.' });
      return false;
    }
  }, [selectedIncidentId]);

  // Load specific incident details
  const reloadIncidentDetails = useCallback(async (id: string) => {
    try {
      const details = await fetchIncidentDetails(id);
      setCurrentIncidentData(details);
      return true;
    } catch (err) {
      setBannerNotice({ type: 'error', message: err instanceof Error ? err.message : 'Incident details could not be loaded.' });
      return false;
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  useEffect(() => {
    if (selectedIncidentId) {
      reloadIncidentDetails(selectedIncidentId);
    }
  }, [selectedIncidentId, reloadIncidentDetails]);

  // Auto-dismiss banner notice
  useEffect(() => {
    if (bannerNotice) {
      const timer = setTimeout(() => setBannerNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [bannerNotice]);

  // Handlers
  const handleTriggerInvestigation = async (incidentId: string) => {
    setIsInvestigating(true);
    setSelectedIncidentId(incidentId);
    setCurrentTab('investigations');
    try {
      const result = await runInvestigation(incidentId);
      if (!(await reloadIncidentDetails(incidentId)) || !(await reloadData())) return;
      setBannerNotice({
        type: 'success',
        message: `Investigation completed for ${incidentId}. Generated proposal ${result.proposal.id} awaiting human authorization.`,
      });
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Investigation could not be completed.',
      });
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleApproveProposal = async (
    proposalId: string,
    confirmedPlanHash: string,
    comments: string
  ) => {
    try {
      await approveProposal(proposalId, confirmedPlanHash, comments);
      if (!(await reloadIncidentDetails(selectedIncidentId)) || !(await reloadData())) return;
      setBannerNotice({
        type: 'success',
        message: `Proposal ${proposalId} authorized by SRE. Ready for sandbox execution.`,
      });
    } catch (err: any) {
      throw err;
    }
  };

  const handleRejectProposal = async (
    proposalId: string,
    confirmedPlanHash: string,
    comments: string
  ) => {
    try {
      await rejectProposal(proposalId, confirmedPlanHash, comments);
      if (!(await reloadIncidentDetails(selectedIncidentId)) || !(await reloadData())) return;
      setBannerNotice({
        type: 'warn',
        message: `Proposal ${proposalId} rejected. Reason logged to immutable audit trail.`,
      });
    } catch (err: any) {
      throw err;
    }
  };

  const handleExecuteRemediation = async (
    proposalId: string,
    options?: { forceFailure?: boolean; forceVerificationFail?: boolean }
  ) => {
    setIsExecuting(true);
    try {
      const result = await executeProposal(proposalId, options);
      if (!(await reloadIncidentDetails(selectedIncidentId)) || !(await reloadData())) return;
      setCurrentTab('verification');
      setBannerNotice({
        type: result.verification.status === 'VERIFIED_RECOVERED' ? 'success' : 'warn',
        message: `Sandbox execution completed. Telemetry verification: ${result.verification.status}`,
      });
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Sandbox execution could not be completed.',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleResetSandbox = async () => {
    setIsResetting(true);
    try {
      const res = await resetSandbox();
      if (!(await reloadData())) return;
      if (res.incidents.length > 0) {
        setSelectedIncidentId(res.incidents[0].id);
      if (!(await reloadIncidentDetails(res.incidents[0].id))) return;
      }
      setBannerNotice({
        type: 'success',
        message: 'Sandbox state re-initialized to pristine baseline.',
      });
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Sandbox reset could not be completed.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Nav helpers
  const handleSelectEvidence = (logId: string) => {
    setHighlightedLogIds([logId]);
    setCurrentTab('logs');
  };

  const handleOpenRunbook = (runbookId: string) => {
    setActiveRunbookId(runbookId);
    setCurrentTab('runbooks');
  };

  // Pending proposals calculation
  const pendingProposals = currentIncidentData?.proposals.filter((p) => p.status === 'pending') || [];
  const activeIncident = currentIncidentData?.incident || incidents.find((i) => i.id === selectedIncidentId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F8FC] text-[#17324D] antialiased">
      {/* Left Sidebar */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingApprovalsCount={pendingProposals.length}
        activeIncidentCount={incidents.filter((i) => i.status !== 'resolved').length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F4F8FC]">
        {/* Top Navbar */}
        <TopNav
          currentTab={currentTab}
          incidents={incidents}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={(id) => {
            setSelectedIncidentId(id);
            setHighlightedLogIds([]);
          }}
          pendingApprovalsCount={pendingProposals.length}
          onOpenApprovals={() => setCurrentTab('approvals')}
          onResetSandbox={handleResetSandbox}
          onRunTests={() => setIsTestRunnerOpen(true)}
          isResetting={isResetting}
        />

        {/* Global Alert Notification Banner */}
        {bannerNotice && (
          <div
            className={`px-6 py-2 border-b text-xs font-mono flex items-center justify-between shrink-0 ${
              bannerNotice.type === 'success'
                ? 'bg-[#25856B]/15 border-[#25856B]/40 text-[#1E6B58]'
                : bannerNotice.type === 'warn'
                ? 'bg-[#D9A441]/15 border-[#D9A441]/40 text-[#93691F]'
                : 'bg-[#D95757]/15 border-[#D95757]/40 text-[#B33E3E]'
            }`}
          >
            <span>{bannerNotice.message}</span>
            <button
              onClick={() => setBannerNotice(null)}
              className="text-current hover:opacity-75 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F4F8FC]">
          {currentTab === 'overview' && (
            <OverviewView
              incidents={incidents}
              proposals={currentIncidentData?.proposals || []}
              investigations={currentIncidentData?.investigations || []}
              verification={currentIncidentData?.verification}
              auditEvents={allAudit}
              onSelectIncident={(id) => {
                setSelectedIncidentId(id);
                setCurrentTab('investigations');
              }}
              onNavigateTab={setCurrentTab}
              onOpenApproval={(proposal) => setSelectedProposalForModal(proposal)}
              onOpenCreateIncident={() => setIsNewIncidentOpen(true)}
            />
          )}

          {currentTab === 'incidents' && (
            <IncidentsView
              incidents={incidents}
              onSelectIncident={(id) => {
                setSelectedIncidentId(id);
                setCurrentTab('investigations');
              }}
              onTriggerInvestigation={handleTriggerInvestigation}
              onOpenCreateModal={() => setIsNewIncidentOpen(true)}
            />
          )}

          {currentTab === 'investigations' && activeIncident && (
            <InvestigationView
              incident={activeIncident}
              investigation={currentIncidentData?.investigations[0]}
              proposal={currentIncidentData?.proposals[0]}
              isInvestigating={isInvestigating}
              onTriggerInvestigation={handleTriggerInvestigation}
              onSelectEvidence={handleSelectEvidence}
              onOpenRunbook={handleOpenRunbook}
              onOpenApproval={(proposal) => setSelectedProposalForModal(proposal)}
            />
          )}

          {currentTab === 'logs' && (
            <div className="evidence-pattern h-[calc(100vh-140px)] flex flex-col space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs text-[#718096]">
                <div>
                  LOG STREAM FOR INCIDENT: <span className="text-[#17324D] font-bold">{selectedIncidentId}</span>
                </div>
                {highlightedLogIds.length > 0 && (
                  <button
                    onClick={() => setHighlightedLogIds([])}
                    className="text-[#1E5E9B] hover:underline"
                  >
                    Clear Filtered Evidence Highlight
                  </button>
                )}
              </div>
              <div className="flex-1 min-h-0">
                <LogViewer
                  logs={currentIncidentData?.logs || []}
                  highlightLogIds={highlightedLogIds}
                />
              </div>
            </div>
          )}

          {currentTab === 'runbooks' && (
            <div className="h-[calc(100vh-140px)]">
              <RunbookViewer
                runbooks={allRunbooks}
                activeRunbookId={activeRunbookId}
                onSelectRunbook={(id) => setActiveRunbookId(id)}
              />
            </div>
          )}

          {currentTab === 'approvals' && (
            <ApprovalsView
              proposals={currentIncidentData?.proposals || []}
              incidents={incidents}
              onOpenApproval={(proposal) => setSelectedProposalForModal(proposal)}
            />
          )}

          {currentTab === 'sandbox' && activeIncident && (
            <SandboxView
              incident={activeIncident}
              proposals={currentIncidentData?.proposals || []}
              onSelectProposal={() => {}}
              onExecuteProposal={handleExecuteRemediation}
              isExecuting={isExecuting}
            />
          )}

          {currentTab === 'verification' && activeIncident && (
            <VerificationView
              incident={activeIncident}
              verification={currentIncidentData?.verification}
              onReinvestigate={() => handleTriggerInvestigation(activeIncident.id)}
            />
          )}

          {currentTab === 'audit' && (
            <AuditView auditEvents={allAudit} />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              onRunTests={() => setIsTestRunnerOpen(true)}
              onResetComplete={reloadData}
            />
          )}
        </main>
      </div>

      {/* Human Approval Modal */}
      {selectedProposalForModal && (
        <ApprovalModal
          proposal={selectedProposalForModal}
          incident={activeIncident}
          isOpen={Boolean(selectedProposalForModal)}
          onClose={() => setSelectedProposalForModal(null)}
          onApprove={handleApproveProposal}
          onReject={handleRejectProposal}
        />
      )}

      {/* Automated Test Suite Modal */}
      <TestRunnerModal
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
      />

      {/* Inject Incident Modal */}
      <NewIncidentModal
        isOpen={isNewIncidentOpen}
        onClose={() => setIsNewIncidentOpen(false)}
        onIncidentCreated={reloadData}
      />
    </div>
  );
}
