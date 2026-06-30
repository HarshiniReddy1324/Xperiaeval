/** Workflow connectors; Jira only in product UI (Confluence/Slack backend retained for later). */

export const CONNECTOR_IDS = ['atlassian', 'jira', 'confluence', 'slack'];

export const ACTIVE_CONNECTOR_IDS = ['atlassian', 'jira'];

export const CONNECTOR_CATALOG = [
  {
    id: 'atlassian',
    name: 'Atlassian account',
    tagline: 'Shared credentials for Jira',
    category: 'Account',
    pilotNote: 'Free Jira plan · API token from id.atlassian.com',
    docsUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    signupUrl: 'https://www.atlassian.com/software/jira/free',
    authType: 'atlassian_api_token',
    fields: [
      { key: 'site_url', label: 'Site URL', placeholder: 'https://yourteam.atlassian.net', required: true },
      { key: 'email', label: 'Account email', placeholder: 'you@company.com', required: true },
      { key: 'api_token', label: 'API token', type: 'password', required: true, secret: true },
    ],
    capabilities: ['One API token for Jira', 'Create at id.atlassian.com → Security → API tokens'],
  },
  {
    id: 'jira',
    name: 'Jira',
    tagline: 'Create hiring issues when candidates are shortlisted',
    category: 'Workflow',
    pilotNote: 'Requires Atlassian account above · uses your default project',
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/',
    authType: 'atlassian_inherited',
    requires: 'atlassian',
    fields: [
      { key: 'project_key', label: 'Project key', placeholder: 'HIR', required: true },
      { key: 'issue_type', label: 'Issue type', placeholder: 'Task' },
      { key: 'auto_on_shortlist', label: 'Auto-create on shortlist', placeholder: 'true' },
    ],
    capabilities: ['Auto-create issue on shortlist', 'Manual create from candidate page', 'Score and bucket in description'],
  },
  {
    id: 'confluence',
    name: 'Confluence',
    tagline: 'Publish scorecard pages to your hiring space',
    category: 'Workflow',
    pilotNote: 'Requires Atlassian account above · same site and token as Jira',
    docsUrl: 'https://developer.atlassian.com/cloud/confluence/rest/v2/intro/',
    authType: 'atlassian_inherited',
    requires: 'atlassian',
    fields: [
      { key: 'space_key', label: 'Space key', placeholder: 'HIR', required: true },
      { key: 'parent_page_title', label: 'Parent page title (optional)', placeholder: 'Hiring scorecards' },
      { key: 'auto_on_shortlist', label: 'Auto-publish on shortlist', placeholder: 'true' },
    ],
    capabilities: ['Auto-publish scorecard on shortlist', 'Intelligence dimensions in page body', 'Manual publish from candidate page'],
  },
  {
    id: 'slack',
    name: 'Slack',
    tagline: 'Notify your hiring channel when candidates are shortlisted',
    category: 'Workflow',
    pilotNote: 'Free plan · Bot token with chat:write scope',
    docsUrl: 'https://api.slack.com/authentication/token-types#bot',
    signupUrl: 'https://api.slack.com/apps',
    authType: 'bearer_token',
    fields: [
      { key: 'bot_token', label: 'Bot token (xoxb-…)', type: 'password', required: true, secret: true },
      { key: 'channel_id', label: 'Channel ID', placeholder: 'C0123456789', required: true },
      { key: 'auto_on_shortlist', label: 'Auto-notify on shortlist', placeholder: 'true' },
    ],
    capabilities: ['Post to channel on shortlist', 'Includes score, bucket, and portal link', 'Works on Slack free plan'],
  },
];

export function connectorById(id) {
  return CONNECTOR_CATALOG.find((c) => c.id === id) || null;
}

export function activeConnectorCatalog() {
  return CONNECTOR_CATALOG.filter((c) => ACTIVE_CONNECTOR_IDS.includes(c.id));
}

export function isTruthyFlag(value) {
  if (value === true || value === 1) return true;
  const s = String(value || '').trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'on';
}

export const WORKFLOW_CONNECTOR_IDS = ACTIVE_CONNECTOR_IDS;
