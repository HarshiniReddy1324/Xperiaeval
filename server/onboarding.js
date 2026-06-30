/** First-run checklist for hiring workspaces (free pilot + paid). */

export function getOrgOnboardingStatus(db, orgId) {
  const positions = db
    .prepare(`SELECT COUNT(*) as c FROM jobs WHERE org_id = ? AND deleted_at IS NULL`)
    .get(orgId)?.c ?? 0;

  const candidates = db
    .prepare(
      `SELECT COUNT(*) as c FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND a.deleted_at IS NULL`
    )
    .get(orgId)?.c ?? 0;

  const scored = db
    .prepare(
      `SELECT COUNT(*) as c FROM scores s
       JOIN applications a ON a.id = s.application_id
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND s.overall IS NOT NULL AND a.deleted_at IS NULL`
    )
    .get(orgId)?.c ?? 0;

  const connectors = db
    .prepare(`SELECT provider, enabled, status FROM org_connectors WHERE org_id = ?`)
    .all(orgId);
  const byProvider = Object.fromEntries(connectors.map((c) => [c.provider, c]));

  const atlassianConnected = Boolean(byProvider.atlassian?.enabled && byProvider.atlassian?.status === 'connected');
  const jiraConnected = Boolean(byProvider.jira?.enabled && byProvider.jira?.status === 'connected');

  const jiraIssueCreated = db
    .prepare(
      `SELECT COUNT(*) as c FROM connector_events
       WHERE org_id = ? AND provider = 'jira' AND event_type = 'issue_created' AND status = 'success'`
    )
    .get(orgId)?.c ?? 0;

  const jiraLinkedApp = db
    .prepare(
      `SELECT COUNT(*) as c FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND a.deleted_at IS NULL AND a.integrations_json LIKE '%"issue_key"%'`
    )
    .get(orgId)?.c ?? 0;

  const shortlisted = db
    .prepare(
      `SELECT COUNT(*) as c FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND a.deleted_at IS NULL
         AND a.pipeline_stage IN ('shortlisted_interview', 'interview_scheduled', 'interview_pending', 'interview_completed', 'final_review', 'offer_extended', 'hired')`
    )
    .get(orgId)?.c ?? 0;

  const steps = [
    {
      id: 'position',
      label: 'Create a position',
      detail: 'Add a role with screening questions so candidates can apply.',
      done: positions > 0,
      to: '/jobs/new',
    },
    {
      id: 'candidate',
      label: 'Receive or add a candidate',
      detail: 'Share your apply link or add a test applicant.',
      done: candidates > 0,
      to: positions > 0 ? '/jobs' : '/jobs/new',
    },
    {
      id: 'atlassian',
      label: 'Connect Atlassian account',
      detail: 'Site URL, email, and API token from id.atlassian.com.',
      done: atlassianConnected,
      to: '/integrations?tab=workflow',
    },
    {
      id: 'jira',
      label: 'Connect Jira project',
      detail: 'Project key (e.g. KAN) and issue type Task.',
      done: jiraConnected,
      to: '/integrations?tab=workflow',
    },
    {
      id: 'shortlist',
      label: 'Shortlist and create a Jira issue',
      detail: 'Move a candidate to Shortlist or use Create issue on their profile.',
      done: jiraIssueCreated > 0 || jiraLinkedApp > 0,
      to: candidates > 0 ? '/candidates' : '/jobs',
    },
    {
      id: 'scored',
      label: 'Review an intelligence scorecard',
      detail: 'Open a screened candidate to see the 0–100 score and dimensions.',
      done: scored > 0,
      to: candidates > 0 ? '/candidates?screening=complete' : '/candidates',
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const complete = completed === total;

  return {
    steps,
    completed,
    total,
    complete,
    progress_pct: total ? Math.round((completed / total) * 100) : 0,
  };
}
