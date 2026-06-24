import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Card } from '../components/ui';

const DIMENSIONS = [
  { name: 'Technical competency', weight: '30%', detail: 'Skills, tools, and depth aligned to the job posting and rubric' },
  { name: 'Problem solving', weight: '20%', detail: 'Structured thinking, trade-offs, and debugging approach in answers' },
  { name: 'Communication', weight: '10%', detail: 'Clarity, structure, and appropriate length (typed or transcribed audio)' },
  { name: 'Project ownership', weight: '10%', detail: 'End-to-end delivery, scope, and accountability signals' },
  { name: 'Authenticity', weight: '10%', detail: 'Consistency with resume; session integrity context (not auto-reject)' },
  { name: 'Resume consistency', weight: '10%', detail: 'Alignment between resume, posting requirements, and written answers' },
  { name: 'Behavioral confidence', weight: '10%', detail: 'Behavioral and leadership signals from rubric categories' },
];

const TIERS = [
  ['90–100', 'Exceptional match', 'Strongly recommend interview'],
  ['80–89', 'Strong match', 'Recommend interview'],
  ['70–79', 'Potential match', 'Recruiter review needed'],
  ['60–69', 'Needs review', 'Recruiter review needed'],
  ['Below 60', 'Low match', 'Not recommended (human review still required)'],
];

export function Help() {
  const [methodology, setMethodology] = useState(null);

  useEffect(() => {
    api('/methodology').then(setMethodology).catch(() => {});
  }, []);

  return (
    <div className="helpPage">
      <div className="pageHead">
        <h1>Documentation</h1>
        <p>
          How the portal works today — jobs, screening rubrics, candidate intelligence scoring, blind review, and
          reviewer workflows.
        </p>
      </div>

      <Card id="platform">
        <h2>Platform pillars</h2>
        <p>
          Xperieval is organized into four pillars: <strong>Resume intelligence</strong>,{' '}
          <strong>Experience validation</strong>, <strong>Assessment integrity</strong>, and{' '}
          <strong>Candidate potential</strong>. See the live vs planned capability map on{' '}
          <Link to="/reports">Analytics</Link>.
        </p>
      </Card>

      <Card id="overview">
        <h2>What is Xperieval?</h2>
        <p>
          Xperieval is an <strong>evidence-based hiring evaluation portal</strong>. Each applicant receives one{' '}
          <strong>Candidate Intelligence score (0–100)</strong> with explainable dimensions, a tier, a hiring
          recommendation, and Green / Amber / Red bucket — all advisory until a human makes the final decision.
        </p>
        <ul>
          <li>
            <strong>Jobs</strong> — create postings, build or import a 10-question screening rubric, approve it, then
            share the public apply link (<code>/apply/&#123;slug&#125;</code>) or careers page.
          </li>
          <li>
            <strong>Candidates</strong> — ranked list with score, bucket, recommendation, screening status, and
            pipeline stage.
          </li>
          <li>
            <strong>Candidate profile</strong> — Overview (intelligence report), Resume &amp; answers, Reviewer actions,
            Background check (Green bucket).
          </li>
          <li>
            <strong>No auto-reject</strong> — Red means low fit signal; recruiters still review and can advance anyone.
          </li>
          <li>
            <strong>Audit</strong> — rubric approval, scoring, notes, overrides, and key actions are logged.
          </li>
        </ul>
      </Card>

      <Card id="workflow">
        <h2>Typical workflow</h2>
        <ol>
          <li>
            <strong>Jobs → New job</strong> (or edit existing) — set title, team, location, and posting details.
          </li>
          <li>
            <strong>Job detail → Question library</strong> — pick 10+ questions by department/level, or edit manually.
            Save draft, then <strong>Approve rubric</strong> (requires 7 mandatory + 3 optional, 10 points each).
          </li>
          <li>
            <strong>Optional:</strong> save the rubric as a <strong>template</strong> (e.g. Senior Backend v2) and apply
            it to other jobs from <strong>Rubrics</strong> or the job page.
          </li>
          <li>
            Share <strong>Careers page</strong> or <strong>Apply link</strong> — candidates submit resume + answers (text,
            audio, or video per question).
          </li>
          <li>
            Scoring runs on submit (and via <strong>Re-score intelligence</strong> on the candidate). Review the{' '}
            <strong>Candidate Intelligence Report</strong> on Overview.
          </li>
          <li>
            <strong>Shortlist</strong>, send optional <strong>scheduling invite</strong>, compare two candidates, export a{' '}
            <strong>PDF scorecard</strong>, add notes, override bucket if needed.
          </li>
        </ol>
      </Card>

      <Card id="scoring">
        <h2>Candidate Intelligence score (single score 0–100)</h2>
        <p>
          There is <strong>one primary match score</strong> per application, shown on the dashboard, candidates table, and
          candidate Overview. It is <em>not</em> split into separate application-phase and interview-phase scores in the
          current UI.
        </p>
        <p>
          The engine evaluates each rubric answer (including audio transcripts when provided), resume text, job posting
          skills, and session integrity context, then aggregates into seven dimensions:
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
            'Per-question rubric scoring compares applicant answers to internal sample answers and AI evaluation keywords (7×10 mandatory + 3×10 optional). Groq can refine scores when GROQ_API_KEY is configured.'}
        </p>
        <h3>Tiers &amp; recommendations</h3>
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
          concerns, and interview focus areas.
        </p>
      </Card>

      <Card id="buckets">
        <h2>Green / Amber / Red buckets</h2>
        <p>Bucket thresholds apply to the intelligence overall score (defaults below; configurable in Settings):</p>
        <div className="bucketDocs">
          <div className="bucketDoc green">
            <strong>Green</strong>
            <p>
              {methodology?.buckets?.Green || '≥ 80 (default)'} — prioritize for hiring team review. Eligible for
              background verification simulation.
            </p>
          </div>
          <div className="bucketDoc amber">
            <strong>Amber</strong>
            <p>{methodology?.buckets?.Amber || '60–79'} — mixed fit; deeper human review before advancing.</p>
          </div>
          <div className="bucketDoc red">
            <strong>Red</strong>
            <p>{methodology?.buckets?.Red || '< 60'} — low fit signal; never auto-rejected.</p>
          </div>
        </div>
        <p className="muted">
          <strong>Settings → Scoring thresholds</strong> — adjust Green/Amber cutoffs, tier boundaries, and recommendation
          labels. Jobs can inherit org defaults.
        </p>
      </Card>

      <Card id="rubrics">
        <h2>Screening rubrics &amp; question library</h2>
        <ul>
          <li>
            <strong>10 questions per job</strong> — 7 mandatory + 3 optional, 10 points each (100 total). Candidates see
            questions only; sample answers, AI keywords, and time limits stay internal for scoring.
          </li>
          <li>
            <strong>Response types</strong> — text, audio, or video per question. Audio is transcribed for scoring when
            transcription is available.
          </li>
          <li>
            <strong>Internal scoring fields</strong> — per question, recruiters set a <strong>sample answer</strong> (what a
            strong response looks like) and <strong>AI evaluation keywords</strong> (terms the scorer should find in
            applicant answers). These are never shown to candidates.
          </li>
          <li>
            <strong>Question library</strong> — filter by department and level (HR, Engineering · Mid, General, etc.),
            select 10+, apply to the job.
          </li>
          <li>
            <strong>Rubric templates</strong> — save an approved set as a named template; one-click apply on new jobs.
          </li>
          <li>
            <strong>Careers + apply</strong> — public pages per job slug; candidates must complete screening after rubric
            is approved.
          </li>
        </ul>
      </Card>

      <Card id="identity">
        <h2>Blind screening &amp; DEI-safe review</h2>
        <p>
          <strong>Settings → DEI &amp; blind review</strong>
        </p>
        <ul>
          <li>
            <strong>Blind screening</strong> — when enabled, early review uses <strong>CAND-####</strong> codes; name,
            email, phone, and resume are hidden.
          </li>
          <li>
            <strong>DEI-safe mode</strong> — identity stays hidden until the candidate is{' '}
            <em>Shortlisted for interview</em> (or a later pipeline stage), then unlocks automatically.
          </li>
          <li>
            <strong>Reveal identity</strong> — hiring managers may reveal earlier when standard blind mode allows;
            admins have broader access.
          </li>
          <li>
            <strong>Compliance Auditor</strong> — anonymized view only; scores and audit data remain visible.
          </li>
        </ul>
        <p>Intelligence scores, dimensions, and buckets stay visible during blind review for fair comparison.</p>
      </Card>

      <Card id="compare">
        <h2>Compare candidates</h2>
        <p>
          On <strong>Candidates</strong>, select two rows (filter by job first), then <strong>Compare</strong>. Side-by-side
          dimension radar charts help review fit for the same role.
        </p>
      </Card>

      <Card id="scorecard">
        <h2>Hiring manager scorecard (PDF)</h2>
        <p>
          Candidate → <strong>Overview</strong> → <strong>Export scorecard (PDF)</strong>. Use the browser print dialog →{' '}
          <strong>Save as PDF</strong> for a one-page intelligence summary.
        </p>
      </Card>

      <Card id="proctoring">
        <h2>Apply proctoring (full suite)</h2>
        <p>
          Configure under <strong>Settings → Proctoring</strong>. When enabled, the public apply form runs a proctored
          session with one combined integrity + proctoring log stored on the application.
        </p>
        <h3>What is enforced in the browser</h3>
        <ul>
          <li>Copy, cut, paste, and drag-drop into answers — blocked when enabled</li>
          <li>Text selection / highlight — blocked on the screening area</li>
          <li>Right-click / context menu — disabled and logged</li>
          <li>Shortcuts — Ctrl+C/V/X/A, F12, PrintScreen, save/print, and similar (flagged; OS shortcuts like Alt+Tab are detected but cannot be fully blocked by browsers)</li>
          <li>Fullscreen — prompted on question start; exits are logged</li>
          <li>Tab/window blur and visibility — focus loss counted; optional auto-fail after threshold</li>
          <li>Clicks outside the test card — logged; repeated clicks can auto-fail</li>
          <li>Developer tools — heuristics when inspector may be open</li>
          <li>Multiple monitors — flagged when the browser reports extended displays</li>
          <li>New window.open — blocked</li>
          <li>Per-question timers — from rubric max seconds; auto-advance when time expires</li>
          <li>No backtrack — cannot return to previous questions when enabled</li>
          <li>Question shuffle — random order per candidate session</li>
          <li>Keystroke dynamics — flags answers typed with too few keystrokes or robotic timing</li>
          <li>Duplicate IP — server flags if the same IP applied to the same job recently</li>
          <li>
            Camera presence (optional) — after one-time consent, face-in-frame and look-away signals are sampled in the
            browser; <strong>no video is recorded or uploaded</strong>
          </li>
        </ul>
        <h3>Enforcement modes</h3>
        <ul>
          <li><strong>Monitor</strong> — log everything, always accept submission</li>
          <li><strong>Strict</strong> — heavy authenticity penalties; auto-fail only for in-session critical violations</li>
          <li><strong>Fail</strong> — reject submission (HTTP 403) on critical proctoring failures</li>
        </ul>
        <p className="muted">
          Recruiters see the full log under candidate → Resume &amp; answers → Proctoring &amp; session integrity.
          Screening category <strong>Proctoring Violation</strong> is assigned when the session failed.
        </p>
      </Card>

      <Card id="screening-integrity">
        <h2>Screening status &amp; authenticity</h2>
        <ul>
          <li>
            <strong>Screening status</strong> — complete, incomplete, AI Used, or Proctoring Violation
          </li>
          <li>
            <strong>Authenticity score</strong> — blends session + proctoring signals; ≥75 likely genuine, 50–74 review,
            &lt;50 high risk
          </li>
          <li>
            <strong>Voice verification (optional)</strong> — fingerprint from audio answers; compare on candidate profile
          </li>
        </ul>
      </Card>

      <Card id="scheduling">
        <h2>Interview scheduling</h2>
        <p>Scheduling is optional and lives on the candidate <strong>Overview</strong> tab (not a separate score).</p>
        <ol>
          <li>Enter a meeting URL → <strong>Send scheduling invite</strong>.</li>
          <li>Copy the booking link and send it to the candidate.</li>
          <li>Candidate picks a slot at <code>/schedule/&#123;token&#125;</code>.</li>
          <li>You receive a notification → <strong>Accept &amp; confirm interview</strong> or decline.</li>
          <li>Pipeline updates (e.g. Interview scheduled). Identity may unlock per DEI settings when shortlisted.</li>
        </ol>
        <p className="muted">Email is not sent automatically — copy the booking link manually.</p>
      </Card>

      <Card id="pipeline">
        <h2>Pipeline stages</h2>
        <p>Use the action bar on a candidate profile to move stages:</p>
        <ul>
          <li>Application review</li>
          <li>Shortlisted for interview</li>
          <li>Interview scheduled</li>
          <li>Interview completed</li>
          <li>Final review</li>
          <li>Not advancing</li>
        </ul>
        <p className="muted">
          Pipeline tracks hiring progress; it does not replace the intelligence score. There is no separate interview
          notetaker score in the current product UI.
        </p>
      </Card>

      <Card id="background">
        <h2>Background verification (Green bucket)</h2>
        <p>
          On the <strong>Background check</strong> tab, Green-bucket candidates can run a <strong>simulated</strong>{' '}
          verification report (identity consistency, contact signals, role alignment, etc.).
        </p>
        <p className="disclaimer">
          Demo only — does not replace licensed criminal, credit, or employment verification.
        </p>
      </Card>

      <Card id="trash">
        <h2>Trash &amp; recovery</h2>
        <p>
          Deleting a job or candidate moves it to <strong>Trash</strong> (sidebar, below Help). Restore from Trash or
          permanently delete from there.
        </p>
      </Card>

      <Card id="integrations">
        <h2>Integrations (demo)</h2>
        <p>
          The <strong>Integrations</strong> page shows webhook ingest and writeback stubs for connecting an applicant
          tracking system. This environment uses demo credentials — not a production connector.
        </p>
      </Card>

      <Card id="roles">
        <h2>Roles &amp; demo login</h2>
        <p>Role is fixed per account at login.</p>
        <ul>
          <li>
            <strong>Admin</strong> — settings, thresholds, DEI, users, full access
          </li>
          <li>
            <strong>Recruiter / Hiring Manager</strong> — jobs, candidates, rubrics, scorecards, notes, scheduling
          </li>
          <li>
            <strong>Compliance Auditor</strong> — audit, reports, anonymized candidate view
          </li>
        </ul>
        <p className="muted">
          Demo: <code>demo@xperieval.com</code> / <code>demo1234</code> (Admin). Also <code>recruiter@</code> and{' '}
          <code>hiring@</code> xperieval.com with the same password.
        </p>
      </Card>

      <Card id="data">
        <h2>Local setup</h2>
        <ul>
          <li>
            <strong>Run:</strong> <code>npm run dev</code> — API <code>localhost:3001</code>, web{' '}
            <code>localhost:5173</code> (or next free port if 5173 is busy)
          </li>
          <li>
            <strong>Database:</strong> <code>data/xperieval.db</code>
          </li>
          <li>
            <strong>Uploads:</strong> <code>uploads/</code> (resumes, audio)
          </li>
          <li>
            <strong>Optional AI:</strong> set <code>GROQ_API_KEY</code> in <code>.env</code> for LLM refinement and
            Whisper transcription
          </li>
        </ul>
      </Card>
    </div>
  );
}
