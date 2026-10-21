import React from 'react';
import {
  ArrowDown,
  ArrowRight,
  AudioLines,
  BookOpenCheck,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Database,
  FileSearch2,
  Fingerprint,
  GitBranch,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react';

const controlRoomHref = '/#control-room';

const stages = [
  { number: '01', title: 'Incident Intake', detail: 'Start from a reported or observed service issue.', icon: AudioLines },
  { number: '02', title: 'AI Investigation', detail: 'Inspect incident context, logs and relevant runbooks.', icon: Sparkles },
  { number: '03', title: 'Evidence-Based Diagnosis', detail: 'Rank likely causes with traceable citations.', icon: FileSearch2 },
  { number: '04', title: 'Human Approval', detail: 'Review and explicitly authorize the proposed plan.', icon: ClipboardCheck },
  { number: '05', title: 'Sandboxed Remediation', detail: 'Run an approved, allowlisted simulation safely.', icon: Workflow },
  { number: '06', title: 'Independent Verification', detail: 'Evaluate recovery criteria after execution.', icon: ShieldCheck },
];

const capabilities = [
  { title: 'AI-assisted investigation', detail: 'Use Gemini to analyze incident context and retrieve relevant operational guidance.', icon: Sparkles, accent: 'violet' },
  { title: 'Evidence and root-cause analysis', detail: 'Connect ranked hypotheses to retrieved logs and runbook evidence.', icon: GitBranch, accent: 'cyan' },
  { title: 'Human-gated remediation', detail: 'Keep an operator in control of every consequential remediation proposal.', icon: LockKeyhole, accent: 'violet' },
  { title: 'Sandbox execution', detail: 'Limit remediation to deterministic, allowlisted sandbox actions.', icon: Layers3, accent: 'cyan' },
  { title: 'Recovery verification', detail: 'Evaluate defined telemetry criteria independently after a sandbox action.', icon: CheckCircle2, accent: 'green' },
  { title: 'Auditable operations', detail: 'Record investigation, approval, execution and verification steps in the audit trail.', icon: Fingerprint, accent: 'gold' },
];

export const Homepage: React.FC = () => (
  <div className="home-shell min-h-screen overflow-hidden bg-[#07111F] text-[#EAF1FB] selection:bg-[#9273FF]/35 selection:text-white">
    <a className="home-skip-link" href="#main-content">Skip to content</a>

    <header className="home-header">
      <div className="home-container flex h-[76px] items-center justify-between gap-5">
        <a href="/" className="home-brand" aria-label="IncidentIQ AI home">
          <span className="home-brand-mark"><ActivityMark /></span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight text-white">IncidentIQ <span className="text-[#8E7BFF]">AI</span></span>
            <span className="mt-1 block text-[10px] tracking-[0.14em] text-[#8795AA]">INCIDENT RESOLUTION PLATFORM</span>
          </span>
        </a>

        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-[13px] text-[#AAB6C8] md:flex">
          <a className="home-nav-link" href="#how-it-works">How it works</a>
          <a className="home-nav-link" href="#capabilities">Capabilities</a>
          <a className="home-nav-link" href="#demo-incidents">Demo incidents</a>
        </nav>

        <a className="home-header-cta" href={controlRoomHref}>
          Launch Control Room <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
    </header>

    <main id="main-content">
      <section className="home-hero home-container relative grid items-center gap-12 pb-20 pt-16 sm:pb-24 sm:pt-20 lg:min-h-[650px] lg:grid-cols-[1.02fr_.98fr] lg:gap-8 lg:pb-28 lg:pt-24">
        <div className="relative z-10 max-w-2xl">
          <div className="home-eyebrow"><span className="home-eyebrow-pip" /> AI-ASSISTED INCIDENT OPERATIONS</div>
          <h1 className="mt-7 text-[clamp(2.8rem,6.3vw,5.55rem)] font-semibold leading-[1.02] tracking-[-0.055em] text-white">
            Resolve Incidents Smarter.<br />
            <span className="home-gradient-text">Restore Services Faster.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#AAB6C8] sm:text-lg sm:leading-8">
            Slow manual investigation delays recovery. Unreviewed fixes add risk. IncidentIQ AI connects evidence to a controlled response workflow, with an operator approving remediation before a sandbox ever runs it.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a className="home-primary-cta" href={controlRoomHref}>
              Launch Control Room <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a className="home-secondary-cta" href="#how-it-works">
              Explore How It Works <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-[#94A2B7]">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#47C5B0]" /> Human approval required</span>
            <span className="inline-flex items-center gap-2"><Database className="h-4 w-4 text-[#58C9E8]" /> Sandbox-only actions</span>
          </div>
        </div>

        <div className="home-visual relative mx-auto w-full max-w-[570px]" aria-label="Illustration of an evidence-based incident response workflow" role="img">
          <div className="home-visual-glow" />
          <div className="home-grid-pattern" />
          <div className="home-console-card">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#9273FF]/25 bg-[#9273FF]/10 text-[#A493FF]"><ActivityMark /></span>
                <div><div className="text-xs font-semibold text-white">Response workspace</div><div className="mt-1 text-[10px] text-[#8291A8]">CONTROLLED INCIDENT FLOW</div></div>
              </div>
              <span className="home-status"><span /> SANDBOX</span>
            </div>

            <div className="space-y-3 p-5">
              <div className="home-incident-row">
                <span className="home-incident-icon text-[#FF7E87]"><Database className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-white">Database pool exhaustion</span><span className="mt-1 block text-[10px] text-[#8291A8]">INC-2026-8841 · auth-payment-gateway</span></span>
                <span className="home-severity severity-critical">CRITICAL</span>
              </div>
              <div className="home-incident-row">
                <span className="home-incident-icon text-[#FFB46B]"><Zap className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-white">HTTP 500 after config deploy</span><span className="mt-1 block text-[10px] text-[#8291A8]">INC-2026-9024 · edge-routing-service</span></span>
                <span className="home-severity severity-high">HIGH</span>
              </div>
            </div>

            <div className="mx-5 mb-5 rounded-xl border border-[#58C9E8]/15 bg-[#58C9E8]/[0.055] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-[#DCEAF7]"><Sparkles className="h-4 w-4 text-[#58C9E8]" /> Investigation evidence</div>
                <span className="text-[10px] text-[#7F91A8]">RETRIEVED SOURCES</span>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="home-evidence-line"><span className="home-evidence-dot bg-[#58C9E8]" /><span>Connection acquisition timeout</span><span className="ml-auto text-[#58C9E8]">LOG</span></div>
                <div className="home-evidence-line"><span className="home-evidence-dot bg-[#A493FF]" /><span>Validated service runbook</span><span className="ml-auto text-[#A493FF]">GUIDE</span></div>
              </div>
            </div>

            <div className="home-flow-strip">
              <span><CircleDot className="h-3.5 w-3.5" /> Investigate</span><i />
              <span><LockKeyhole className="h-3.5 w-3.5" /> Approve</span><i />
              <span><ShieldCheck className="h-3.5 w-3.5" /> Verify</span>
            </div>
          </div>
          <div className="home-orbit orbit-one" /><div className="home-orbit orbit-two" />
          <div className="home-visual-caption"><span className="caption-pip" /> HUMAN-IN-THE-LOOP BY DESIGN</div>
        </div>
      </section>

      <section className="home-proof-bar" aria-label="Platform principles">
        <div className="home-container grid gap-5 py-6 sm:grid-cols-3">
          <div className="home-proof-item"><Fingerprint /><span><strong>Evidence-linked</strong><small>Findings trace back to retrieved sources</small></span></div>
          <div className="home-proof-item"><LockKeyhole /><span><strong>Operator-controlled</strong><small>Human approval gates every proposed action</small></span></div>
          <div className="home-proof-item"><ShieldCheck /><span><strong>Recovery checked</strong><small>Verification follows sandbox execution</small></span></div>
        </div>
      </section>

      <section id="how-it-works" className="home-section home-container scroll-mt-24 py-20 sm:py-28">
        <div className="home-section-heading">
          <div className="home-eyebrow"><span className="home-eyebrow-pip" /> A CONTROLLED RESPONSE LOOP</div>
          <h2>From first signal to verified recovery.</h2>
          <p>One traceable workflow gives teams a clearer path through investigation and safe response.</p>
        </div>
        <ol className="home-stage-grid mt-12">
          {stages.map(({ number, title, detail, icon: Icon }, index) => (
            <li className="home-stage-card" key={number}>
              <div className="flex items-center justify-between"><span className="home-stage-number">{number}</span><Icon className="h-5 w-5 text-[#8C7AFF]" aria-hidden="true" /></div>
              <h3>{title}</h3><p>{detail}</p>
              {index < stages.length - 1 && <ArrowRight className="home-stage-arrow hidden xl:block" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>

      <section id="capabilities" className="home-feature-section scroll-mt-24 py-20 sm:py-28">
        <div className="home-container">
          <div className="home-section-heading">
            <div className="home-eyebrow"><span className="home-eyebrow-pip" /> BUILT FOR RESPONSIBLE OPERATIONS</div>
            <h2>Useful intelligence. Guardrails at every step.</h2>
            <p>AI supports the response process while deterministic controls keep consequential actions reviewable and constrained.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(({ title, detail, icon: Icon, accent }) => (
              <article className="home-feature-card" key={title}>
                <div className={`home-feature-icon ${accent}`}><Icon className="h-5 w-5" aria-hidden="true" /></div>
                <h3>{title}</h3><p>{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="demo-incidents" className="home-section home-container scroll-mt-24 py-20 sm:py-28">
        <div className="home-section-heading">
          <div className="home-eyebrow"><span className="home-eyebrow-pip" /> EXPLORE THE SANDBOX SCENARIOS</div>
          <h2>Start with the incidents already in the workspace.</h2>
          <p>These synthetic scenarios demonstrate investigation, approvals, sandbox remediation and verification.</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="home-demo-card pool-demo">
            <div className="home-demo-top"><span className="home-demo-icon"><Database className="h-5 w-5" /></span><span className="home-severity severity-critical">CRITICAL</span></div>
            <p className="home-demo-id">INC-2026-8841</p>
            <h3>Database connection pool exhaustion</h3>
            <p className="home-demo-description">The seeded scenario describes connection saturation, acquisition timeouts and elevated latency affecting <strong>auth-payment-gateway</strong>.</p>
            <div className="home-demo-footer"><span>Database reliability</span><span>Synthetic sandbox incident</span></div>
          </article>
          <article className="home-demo-card config-demo">
            <div className="home-demo-top"><span className="home-demo-icon"><Zap className="h-5 w-5" /></span><span className="home-severity severity-high">HIGH</span></div>
            <p className="home-demo-id">INC-2026-9024</p>
            <h3>HTTP 500 spike after configuration deployment</h3>
            <p className="home-demo-description">The seeded scenario describes an error surge after a canary configuration change in <strong>edge-routing-service</strong>, with a missing upstream retry setting.</p>
            <div className="home-demo-footer"><span>Configuration rollback scenario</span><span>Synthetic sandbox incident</span></div>
          </article>
        </div>
      </section>

      <section className="home-final-cta home-container pb-20 sm:pb-28">
        <div className="home-final-card">
          <div className="home-final-glow" />
          <div className="relative z-10 max-w-2xl">
            <span className="home-eyebrow"><span className="home-eyebrow-pip" /> SEE THE RESPONSE FLOW</span>
            <h2>Make the next incident easier to reason about.</h2>
            <p>Explore the existing sandbox scenarios and review the investigation-to-verification workflow.</p>
            <a className="home-primary-cta mt-7" href={controlRoomHref}>Launch Control Room <ArrowRight aria-hidden="true" className="h-4 w-4" /></a>
          </div>
          <div aria-hidden="true" className="home-final-mark"><BookOpenCheck /></div>
        </div>
      </section>
    </main>

    <footer className="home-footer">
      <div className="home-container flex flex-col gap-5 py-7 sm:flex-row sm:items-center sm:justify-between">
        <a href="/" className="home-brand" aria-label="IncidentIQ AI home">
          <span className="home-brand-mark small"><ActivityMark /></span>
          <span className="text-sm font-semibold text-white">IncidentIQ <span className="text-[#8E7BFF]">AI</span></span>
        </a>
        <p>AI-assisted incident operations with human approval and sandbox-only remediation.</p>
        <a href={controlRoomHref} className="home-footer-link">Open Control Room <ArrowRight className="h-3.5 w-3.5" /></a>
      </div>
    </footer>
  </div>
);

const ActivityMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path d="M3 12h4l2.2-6 4.1 12 2.1-6H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
