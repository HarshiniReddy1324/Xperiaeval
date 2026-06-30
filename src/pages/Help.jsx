import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { normalizeProductMode } from '../lib/productMode';
import { canAccessIntegrations, isUpgradeIntegrationsBlocked } from '../lib/integrationAccess';
import { Card } from '../components/ui';

const DIMENSIONS = [
  { name: 'Technical competency', weight: '30%', detail: 'Skills, tools, and depth aligned to the position and screening criteria' },
  { name: 'Problem solving', weight: '20%', detail: 'Structured thinking, trade-offs, and debugging approach in answers' },
  { name: 'Communication', weight: '10%', detail: 'Clarity, structure, and appropriate length (typed or transcribed audio)' },
  { name: 'Project ownership', weight: '10%', detail: 'End-to-end delivery, scope, and accountability signals' },
  { name: 'Authenticity', weight: '10%', detail: 'Consistency with resume; session integrity context (never auto-rejects)' },
  { name: 'Resume consistency', weight: '10%', detail: 'Alignment between resume, posting requirements, and written answers' },
  { name: 'Behavioral confidence', weight: '10%', detail: 'Behavioral and leadership signals from screening categories' },
];

const TIERS = [
  ['90–100', 'Exceptional match', 'Strongly recommend interview'],
  ['80–89', 'Strong match', 'Recommend interview'],
  ['70–79', 'Potential match', 'Recruiter review needed'],
  ['60–69', 'Needs review', 'Recruiter review needed'],
  ['Below 60', 'Low match', 'Not recommended (human review still required)'],
];

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'modules', label: 'Product modules' },
  { id: 'workflow', label: 'Typical workflow' },
  { id: 'scoring', label: 'Candidate Intelligence score' },
  { id: 'buckets', label: 'Green, Amber, and Red' },
  { id: 'screening', label: 'Screening & questions' },
  { id: 'experience', label: 'Experience fit' },
  { id: 'identity', label: 'Blind review & DEI' },
  { id: 'proctoring', label: 'Proctoring & integrity' },
  { id: 'review', label: 'Reviewer tools' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings & workspace' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'roles', label: 'Roles & access' },
  { id: 'audit', label: 'Audit & compliance' },
];

export function Help() {
  const { user } = useAuth();
  const role = user?.role || 'Hiring Manager';
  const isIntelOnly = normalizeProductMode(user?.productMode) === 'intelligence';
  const showIntegrationsHelp = canAccessIntegrations(user);
  const integrationsUpgradeBlocked = isUpgradeIntegrationsBlocked(user);
  const [methodology, setMethodology] = useState(null);

  useEffect(() => {
    api('/methodology').then(setMethodology).catch(() => {});
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const scrollToSection = (event, id) => {
    event.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  };

  const visibleToc = TOC.filter((item) => {
    if (isIntelOnly && item.id === 'screening') return false;
    if (item.id === 'integrations' && !showIntegrationsHelp && role !== 'Hiring Manager') return false;
    return true;
  });

  return (
    <div className="helpPage">
      <div className="pageHead">
        <h1>Help &amp; documentation</h1>
        <p>
          {isIntelOnly
            ? 'Everything you need to evaluate candidates through Xperieval Intelligence: ATS ingestion, API scoring, explainability, and writeback.'
            : 'Everything you need to run evidence-based hiring in Xperieval: positions, screening, intelligence scoring, blind review, and recruiter workflows.'}
        </p>
      </div>

      <nav className="helpToc" aria-label="Documentation sections">
        <p className="helpTocTitle">On this page</p>
        <ul>
          {visibleToc.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} onClick={(e) => scrollToSection(e, item.id)}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Card id="overview" className="helpSection">
        <h2>Overview</h2>
        <p>
          Xperieval is an <strong>evidence-based hiring evaluation platform</strong>. Every applicant receives a single{' '}
          <strong>Candidate Intelligence score (0–100)</strong> with explainable dimensions, a tier, a hiring
          recommendation, and a Green, Amber, or Red bucket. All outputs are <strong>advisory</strong>: recruiters and
          hiring managers always make the final decision. The product never auto-rejects a candidate based on score alone.
        </p>
        <p>The platform is built on four pillars:</p>
        <ul className="helpPillarList">
          <li>
            <strong>Resume intelligence</strong>: structured parsing, keyword alignment, and consistency checks against
            the role.
          </li>
          <li>
            <strong>Experience validation</strong>: tenure and seniority fit compared to position requirements.
          </li>
          <li>
            <strong>Assessment integrity</strong>: proctored apply sessions, authenticity signals, and session logging.
          </li>
          <li>
            <strong>Candidate potential</strong>: dimension-level strengths, concerns, and interview focus areas.
          </li>
        </ul>
      </Card>

      <Card id="modules" className="helpSection">
        <h2>Product modules</h2>
        <p>
          Your organization can run <strong>Hiring</strong>, <strong>Intelligence</strong>, or <strong>both</strong>.
          Admins change this under <strong>Settings → Workspace</strong>.
        </p>
        <div className="helpModuleGrid">
          <div className="helpModuleCard">
            <h3>Hiring</h3>
            <p>
              Create positions, configure and approve screening questionnaires, share public apply links, and manage the
              full candidate pipeline from application through interview scheduling.
            </p>
          </div>
          <div className="helpModuleCard">
            <h3>Intelligence</h3>
            <p>
              Score candidates ingested from your ATS or submitted via API. Review explainable scores, experience fit,
              and analytics without managing positions in the portal.
            </p>
          </div>
          <div className="helpModuleCard">
            <h3>Hiring + Intelligence</h3>
            <p>
              The full portal: positions, screening, pipeline, integrations, analytics, and intelligence scoring in one
              place. Recommended for most teams.
            </p>
          </div>
        </div>
      </Card>

      {isIntelOnly && (
        <Card className="helpSection helpIntelCard">
          <h2>Intelligence quick start</h2>
          <ol>
            <li>Open <strong>Integrations</strong> and create an API key for your organization.</li>
            <li>
              Send candidate payloads through the evaluate API, or configure your ATS to deliver webhooks to Xperieval.
            </li>
            <li>
              Review scores, explainability, and experience fit under <strong>Candidates</strong> and{' '}
              <strong>Analytics</strong>. Qualified results can write back to your ATS when configured.
            </li>
          </ol>
        </Card>
      )}

      <Card id="workflow" className="helpSection">
        <h2>Typical workflow</h2>
        {!isIntelOnly ? (
          <ol>
            <li>
              <strong>Create a position</strong> with title, team, location, and posting details. New positions start in{' '}
              <strong>Draft</strong> until you publish them.
            </li>
            <li>
              <strong>Build screening questions</strong> from the question library or from scratch. Mark questions required
              or optional. Points split evenly across all questions to total 100.
            </li>
            <li>
              <strong>Approve screening</strong> when the questionnaire is ready. Candidates cannot complete screening
              until approval.
            </li>
            <li>
              Optionally <strong>save the questionnaire as a template</strong> and reuse it on future positions.
            </li>
            <li>
              Share the <strong>careers page</strong> or <strong>apply link</strong>. Candidates submit a resume and answer
              screening questions by text, audio, or video as configured per question.
            </li>
            <li>
              Scoring runs automatically on submit. Open the candidate profile to read the{' '}
              <strong>Candidate Intelligence Report</strong>. Use <strong>Re-score intelligence</strong> after material
              changes.
            </li>
            <li>
              <strong>Shortlist</strong>, compare candidates, export a PDF scorecard, add notes, override buckets if
              needed, and send an optional scheduling invite.
            </li>
          </ol>
        ) : (
          <ol>
            <li>Connect your ATS or API key under <strong>Integrations</strong>.</li>
            <li>Ingest or evaluate candidates. Each receives an intelligence score and explainability breakdown.</li>
            <li>Review flagged candidates (integrity, authenticity, experience mismatch) before advancing in your ATS.</li>
            <li>Use <strong>Analytics</strong> for pipeline-level trends and platform health.</li>
          </ol>
        )}
      </Card>

      <Card id="scoring" className="helpSection">
        <h2>Candidate Intelligence score</h2>
        <p>
          There is <strong>one primary match score</strong> per application, shown on the dashboard, candidates table,
          and candidate overview. The engine evaluates screening answers (including audio transcripts when available),
          resume text, position skills, and session integrity context, then aggregates into seven weighted dimensions:
        </p>
        <table className="docTable">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Weight</th>
              <th>What we measure</th>
            </tr>
          </thead>
          <tbody>
            {DIMENSIONS.map((d) => (
              <tr key={d.name}>
                <td>{d.name}</td>
                <td>{d.weight}</td>
                <td>{d.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <strong>Overall formula:</strong>{' '}
          {methodology?.formula ||
            'Technical 30% + Problem solving 20% + Communication 10% + Ownership 10% + Authenticity 10% + Resume consistency 10% + Behavioral confidence 10%'}
        </p>
        <p className="muted">
          {methodology?.scoring_note ||
            'Per-question rubric scoring compares applicant answers to internal sample answers and evaluation keywords recruiters configure. Points split evenly across questions to total 100. Optional AI refinement improves accuracy when enabled for your environment.'}
        </p>
        <h3>Tiers and recommendations</h3>
        <table className="docTable">
          <thead>
            <tr>
              <th>Score range</th>
              <th>Tier</th>
              <th>Typical recommendation</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map(([range, tier, rec]) => (
              <tr key={tier}>
                <td>{range}</td>
                <td>{tier}</td>
                <td>{rec}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Expand <strong>Per-question breakdown</strong> on the intelligence report for dimension bars, strengths,
          concerns, and suggested interview focus areas.
        </p>
      </Card>

      <Card id="buckets" className="helpSection">
        <h2>Green, Amber, and Red buckets</h2>
        <p>
          Buckets summarize fit at a glance. Thresholds apply to the overall intelligence score. Defaults are shown
          below; admins can adjust them under <strong>Settings → Scoring thresholds</strong>.
        </p>
        <div className="bucketDocs">
          <div className="bucketDoc green">
            <strong>Green</strong>
            <p>
              {methodology?.buckets?.Green || 'Score 80 or above (default)'}. Prioritize for hiring team review.
              Green-bucket candidates are eligible for the simulated background verification step.
            </p>
          </div>
          <div className="bucketDoc amber">
            <strong>Amber</strong>
            <p>
              {methodology?.buckets?.Amber || 'Score 60–79 (default)'}. Mixed fit. Schedule deeper human review before
              advancing.
            </p>
          </div>
          <div className="bucketDoc red">
            <strong>Red</strong>
            <p>
              {methodology?.buckets?.Red || 'Score below 60 (default)'}. Low fit signal. Candidates remain visible and
              reviewable. Never auto-rejected.
            </p>
          </div>
        </div>
        <p className="muted">
          Recruiters can override buckets after review with a documented reason. Overrides appear in the audit trail.
        </p>
      </Card>

      {!isIntelOnly && (
        <Card id="screening" className="helpSection">
          <h2>Screening and questions</h2>
          <ul>
            <li>
              <strong>Flexible question count</strong>: configure as many screening questions as you need (up to 40).
              Candidates see question text only. Sample answers, evaluation keywords, and time guidelines stay internal
              for scoring.
            </li>
            <li>
              <strong>Response types</strong>: text, audio, or video per question. Audio is transcribed for scoring when
              transcription is available.
            </li>
            <li>
              <strong>Internal scoring fields</strong>: per question, set a sample answer (what a strong response looks
              like) and evaluation keywords the scorer should find. These are never shown to candidates.
            </li>
            <li>
              <strong>Question library</strong>: filter by department and level, select questions, and apply them to a
              position.
            </li>
            <li>
              <strong>Screening templates</strong>: save an approved questionnaire as a named template and apply it to
              new positions in one step.
            </li>
            <li>
              <strong>Public apply</strong>: each published position has a careers page and apply link. Screening must be
              approved before candidates can complete it.
            </li>
          </ul>
        </Card>
      )}

      <Card id="experience" className="helpSection">
        <h2>Experience fit</h2>
        <p>
          Experience intelligence compares resume tenure and seniority signals against position requirements. When a gap
          is detected, the overall score may receive a penalty and the candidate profile shows an experience fit panel
          with years required versus years detected.
        </p>
        <p>
          Experience fit appears on the dashboard, position detail, analytics, and individual candidate reports. Use it
          alongside the intelligence score; not as a standalone hire or no-hire decision.
        </p>
      </Card>

      <Card id="identity" className="helpSection">
        <h2>Blind review and DEI</h2>
        <p>Configure under <strong>Settings → Blind review</strong>.</p>
        <ul>
          <li>
            <strong>Blind screening</strong>: when enabled, early review uses anonymized candidate codes. Name, email,
            phone, and resume are hidden during initial review.
          </li>
          <li>
            <strong>DEI-safe mode</strong>: identity stays hidden until the candidate reaches{' '}
            <em>Shortlisted for interview</em> or a later pipeline stage, then unlocks automatically.
          </li>
          <li>
            <strong>Reveal identity</strong>: hiring managers may reveal earlier when your policy allows. Admins have
            broader access.
          </li>
          <li>
            <strong>Compliance Auditor role</strong>: anonymized candidate view only. Scores, dimensions, buckets, and
            audit data remain visible for oversight.
          </li>
        </ul>
        <p>Intelligence scores and buckets stay visible during blind review so reviewers can compare candidates fairly.</p>
      </Card>

      <Card id="proctoring" className="helpSection">
        <h2>Proctoring and integrity</h2>
        <p>
          Configure under <strong>Settings → Proctoring</strong>. When enabled, the public apply form runs a proctored
          session. A combined integrity and proctoring log is stored on the application and visible to recruiters on the
          candidate profile.
        </p>

        <h3>Available today</h3>
        <ul>
          <li>Block copy, cut, paste, and drag-drop into answers</li>
          <li>Block text selection and highlight on the screening area</li>
          <li>Disable right-click and log context menu attempts</li>
          <li>Block in-page shortcuts (copy, paste, view source, print screen, and similar)</li>
          <li>Require fullscreen during questions; log exits</li>
          <li>Track tab switches, window blur, and visibility changes</li>
          <li>Optional auto-fail after too many tab switches (in strict or fail mode)</li>
          <li>Log and optionally fail on repeated clicks outside the test area</li>
          <li>Block opening new windows during the session</li>
          <li>No backtrack: prevent returning to previous questions when enabled</li>
          <li>Shuffle question order per candidate session</li>
          <li>Keystroke dynamics: flag answers with too few keystrokes or robotic timing</li>
          <li>Duplicate IP detection: server flags repeat applications from the same IP on the same position</li>
        </ul>

        <h3>Coming soon</h3>
        <p className="muted">These options appear in settings but are not fully available yet:</p>
        <ul>
          <li>Per-question time limit enforcement (time is recorded today; auto-enforce is in development)</li>
          <li>Audio level monitoring during recording</li>
          <li>Developer tools detection (heuristic only; not reliable enough to ship)</li>
          <li>Multiple monitor detection (limited browser support)</li>
          <li>Camera presence and gaze monitoring (experimental; Chrome-focused)</li>
        </ul>

        <h3>Enforcement modes</h3>
        <table className="docTable">
          <thead>
            <tr>
              <th>Mode</th>
              <th>Behavior</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Monitor</strong></td>
              <td>Log all signals. Always accept submission.</td>
            </tr>
            <tr>
              <td><strong>Strict</strong></td>
              <td>Apply heavy authenticity penalties. Auto-fail only for critical in-session violations.</td>
            </tr>
            <tr>
              <td><strong>Fail</strong></td>
              <td>Reject submission on critical proctoring failures.</td>
            </tr>
          </tbody>
        </table>
        <p className="muted">
          Browsers cannot block operating-system shortcuts such as Alt+Tab globally. Those events are detected and
          flagged when possible. Tab switches and paste events are context signals; they do not auto-reject candidates
          unless you choose strict or fail mode with the relevant rules enabled.
        </p>

        <h3>Screening status and authenticity</h3>
        <ul>
          <li>
            <strong>Screening status</strong>: Complete, Incomplete, AI Used, or Proctoring Violation
          </li>
          <li>
            <strong>Authenticity score</strong>: blends session and proctoring signals. 75 or above suggests likely
            genuine; 50–74 warrants review; below 50 is high risk
          </li>
          <li>
            <strong>Voice verification (demo)</strong>: optional fingerprint from audio answers for same-session
            comparison on the candidate profile
          </li>
        </ul>
      </Card>

      <Card id="review" className="helpSection">
        <h2>Reviewer tools</h2>
        <h3>Compare candidates</h3>
        <p>
          On the candidates list, filter by position, select two rows, then open compare. Side-by-side dimension charts
          help evaluate fit for the same role.
        </p>
        <h3>Pipeline stages</h3>
        <p>Move candidates through hiring stages from the profile action bar:</p>
        <ul>
          <li>Application review</li>
          <li>Shortlisted for interview</li>
          <li>Interview scheduled</li>
          <li>Interview completed</li>
          <li>Final review</li>
          <li>Not advancing</li>
        </ul>
        <p className="muted">Pipeline tracks progress. It does not replace the intelligence score.</p>
        <h3>Interview scheduling</h3>
        <p>Scheduling is optional on the candidate overview.</p>
        <ol>
          <li>Enter a meeting URL and send a scheduling invite.</li>
          <li>Copy the booking link and share it with the candidate (email is not sent automatically).</li>
          <li>The candidate picks a time slot.</li>
          <li>You receive a notification to accept and confirm or decline.</li>
          <li>Pipeline updates accordingly. Identity may unlock per your DEI settings when shortlisted.</li>
        </ol>
        <h3>PDF scorecard</h3>
        <p>
          From the candidate overview, export a scorecard and use your browser print dialog to save as PDF for hiring
          manager review.
        </p>
        <h3>Background verification (Green bucket)</h3>
        <p>
          Green-bucket candidates can run a <strong>simulated</strong> verification report (identity consistency,
          contact signals, role alignment, and related checks).
        </p>
        <p className="disclaimer">
          Simulation only. Does not replace licensed criminal, credit, or employment verification.
        </p>
        <h3>Standout candidate signal</h3>
        <p>
          When screening is strong but resume keyword overlap is weak, the profile may flag a standout candidate for a
          manual second look. This is advisory only.
        </p>
      </Card>

      <Card id="analytics" className="helpSection">
        <h2>Analytics</h2>
        <p>
          The analytics hub summarizes hiring health across your organization. Open a tile to drill into a topic:
        </p>
        <ul>
          <li><strong>Overview</strong>: high-level volume, scoring, and funnel health</li>
          <li><strong>Experience intelligence</strong>: fit scores and tenure trends across the pipeline</li>
          <li><strong>Applicants</strong>: source mix, completion, and applicant-level insights</li>
          <li><strong>Screening</strong>: completion rates, integrity flags, and routing buckets</li>
          <li><strong>Positions</strong>: performance by role and department</li>
          <li><strong>Platform</strong>: capability map and operational metrics</li>
        </ul>
        <h3>Dashboard pipeline funnel</h3>
        <p>
          The funnel on your home dashboard counts applicants in the selected date range at each stage: Applied → Screened
          (started screening) → Verified (scored) → Recommended (score ≥ 65) → Interviewed → Selected (offer extended or
          hired). Click a stage to open the matching candidate list.
        </p>
        <p>
          <strong>Selection rate</strong> is <em>Selected ÷ Applied</em> in that period: the share of applicants who
          reached an offer or hire. It is not a forecast; it reflects recorded pipeline stages only.
        </p>
        <h3>Recruiter performance</h3>
        <p>
          Open the recruiter performance tile from the dashboard for hours saved (auto-scored reviews × 45 minutes
          estimated per review) and screening completion %. Integrity and fraud signals are on the dashboard under
          <strong> Risk &amp; Fraud Alerts</strong>. Use the back button to return to the dashboard or the page you came
          from.
        </p>
      </Card>

      <Card id="settings" className="helpSection">
        <h2>Settings and workspace</h2>
        <p>Settings are organized by topic. Admins and recruiters can access most sections; workspace mode is admin-only.</p>
        <table className="docTable">
          <thead>
            <tr>
              <th>Section</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>General</td>
              <td>Company name shown on apply forms and candidate-facing pages</td>
            </tr>
            <tr>
              <td>Scoring thresholds</td>
              <td>Green, Amber, and Red cutoffs; tier boundaries; recommendation labels</td>
            </tr>
            <tr>
              <td>Legal notice</td>
              <td>Custom text on apply forms</td>
            </tr>
            <tr>
              <td>Data retention</td>
              <td>How long application data is kept</td>
            </tr>
            <tr>
              <td>Scheduling</td>
              <td>Default scheduling preferences</td>
            </tr>
            <tr>
              <td>Proctoring</td>
              <td>Integrity rules and enforcement mode for apply sessions</td>
            </tr>
            <tr>
              <td>Blind review</td>
              <td>Blind screening and DEI-safe identity controls</td>
            </tr>
            <tr>
              <td>Workspace (Admin)</td>
              <td>Product module mode (Hiring, Intelligence, or both). Optional embed allowlist for iframe apply widgets on external career sites.</td>
            </tr>
          </tbody>
        </table>
        <p className="muted">
          Most teams never need the embed allowlist. It only applies when you place the apply form inside another website
          using an iframe. Leave the default for standard apply links.
        </p>
      </Card>

      {showIntegrationsHelp ? (
        <Card id="integrations" className="helpSection">
          <h2>Integrations</h2>
          <p>
            Visible to <strong>Admin</strong> and <strong>Recruiter</strong> in the sidebar.{' '}
            {integrationsUpgradeBlocked
              ? 'Your pilot includes the Jira tab and Activity log. ATS and Evaluate API are available when you upgrade from Settings.'
              : 'All integration tabs are available on your plan.'}
          </p>

          <h3>Jira workflow (all plans)</h3>
          <ol>
            <li>Create a free Jira site at atlassian.com (e.g. <code>yourteam.atlassian.net</code>).</li>
            <li>Create a project and note the <strong>project key</strong> (e.g. KAN from <code>KAN-1</code>).</li>
            <li>Go to id.atlassian.com → Security → API tokens → Create token (classic token).</li>
            <li>Integrations → Jira → connect <strong>Atlassian account</strong> (site URL, email, token).</li>
            <li>Connect <strong>Jira</strong> with project key, issue type <code>Task</code>: auto-create on shortlist.</li>
            <li>Shortlist a candidate or use <strong>Create issue</strong> on their profile.</li>
          </ol>

          {!integrationsUpgradeBlocked && (
            <>
              <h3>ATS: inbound and writeback (Team / Enterprise)</h3>
              <p>
                <strong>Inbound:</strong> your ATS POSTs new applicants to the Xperieval webhook URL.{' '}
                <strong>Writeback:</strong> after scoring, Xperieval POSTs the intelligence summary to a URL you
                provide; your ATS endpoint, Zapier, or the local demo receiver for testing.
              </p>
              <ol>
                <li>Admin: Integrations → ATS → Create connection. Copy webhook URL and secret.</li>
                <li>Configure your ATS to send new applications to that URL.</li>
                <li>Use <strong>Send test candidate</strong> to verify ingest.</li>
                <li>Set a <strong>writeback URL</strong> where scores should be delivered after evaluation.</li>
                <li>Use <strong>Process queue now</strong> if writebacks are pending.</li>
              </ol>

              <h3>Greenhouse setup</h3>
              <ol>
                <li>In Xperieval: Admin → Integrations → ATS → Create connection → copy webhook URL and secret.</li>
                <li>In Greenhouse: Configure → Dev Center → Web hooks → Create new webhook.</li>
                <li>
                  Event: <strong>Candidate has submitted application</strong> (or application updated).
                </li>
                <li>Paste the Xperieval webhook URL. Add a custom header <code>X-Webhook-Secret</code> with your secret.</li>
                <li>Send a test from Greenhouse or use <strong>Send test candidate</strong> in Xperieval.</li>
                <li>
                  For writeback: set your writeback URL to a Greenhouse custom field receiver or middleware that accepts
                  JSON score payloads.
                </li>
              </ol>

              <h3>Lever setup</h3>
              <ol>
                <li>In Xperieval: create the ATS connection and copy webhook URL + secret.</li>
                <li>In Lever: Settings → Integrations → Webhooks → Add webhook.</li>
                <li>Trigger: <strong>applicationCreated</strong> (or equivalent new-candidate event).</li>
                <li>URL: your Xperieval webhook. Header <code>X-Webhook-Secret</code> = your secret.</li>
                <li>Map Lever candidate fields to the sample JSON body shown on the ATS tab.</li>
                <li>Writeback: point the writeback URL at your Lever partner endpoint or Zapier catch hook.</li>
              </ol>

              <h3>Evaluate API (Team / Enterprise)</h3>
              <p>
                Integrations → Evaluate API → Create API key. POST JSON to <code>/api/v1/evaluate</code> with{' '}
                <code>Authorization: Bearer xpi_…</code>. Sample body and curl are on that tab.
              </p>
            </>
          )}

          <h3>Activity</h3>
          <p>Integrations → Activity shows ATS ingest, writeback delivery, and Jira issue events.</p>
        </Card>
      ) : (
        <Card id="integrations" className="helpSection">
          <h2>Integrations &amp; Jira links</h2>
          <p>
            Your role (<strong>{role}</strong>) does not include the Integrations page in the sidebar. Admins and
            recruiters configure Jira there.
          </p>
          <p>
            When a recruiter creates a Jira issue for a candidate, you will see a <strong>Jira</strong> link on that
            candidate&apos;s profile; use it to open the task in your hiring board.
          </p>
        </Card>
      )}

      <Card id="roles" className="helpSection">
        <h2>Roles and access</h2>
        <p>Each person signs in with their own account. Role is assigned by an admin and cannot be switched after login.</p>
        <table className="docTable">
          <thead>
            <tr>
              <th>Role</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Admin</strong></td>
              <td>Full access: settings, thresholds, DEI, users, workspace mode, positions, candidates, audit, integrations (all tabs)</td>
            </tr>
            <tr>
              <td><strong>Recruiter</strong></td>
              <td>Positions, candidates, screening, scorecards, notes, scheduling, compare, integrations (Jira + activity; ATS test/writeback)</td>
            </tr>
            <tr>
              <td><strong>Hiring Manager</strong></td>
              <td>Positions, candidates, screening, scorecards, notes, scheduling, compare. Opens Jira links on candidates when present.</td>
            </tr>
            <tr>
              <td><strong>Compliance Auditor</strong></td>
              <td>Audit, analytics, anonymized candidate view with scores and integrity data</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card id="audit" className="helpSection">
        <h2>Audit and compliance</h2>
        <p>
          The audit log is a timestamped timeline of scoring, reviews, overrides, integrity events, and pipeline
          decisions. It records who did what and when.
        </p>
        <p>
          Deleting a position or candidate moves it to <strong>Trash</strong> in the sidebar. Restore from Trash or
          permanently delete from there.
        </p>
      </Card>

      <footer className="helpFooter">
        <p className="muted">
          Questions about your deployment or enterprise setup? Contact your Xperieval administrator or account team.
        </p>
      </footer>
    </div>
  );
}
