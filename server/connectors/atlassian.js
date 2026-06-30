import { basicAuthHeader, connectorFetch, normalizeSiteUrl } from './http.js';
import { isTruthyFlag } from './catalog.js';

function fail(message, detail) {
  const err = new Error(message);
  err.detail = detail;
  return err;
}

export function atlassianHeaders(config) {
  const email = config.email?.trim();
  const token = config.api_token;
  if (!email || !token) throw fail('Atlassian email and API token are required');
  return {
    Authorization: basicAuthHeader(email, token),
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export function atlassianSite(config) {
  return normalizeSiteUrl(config.site_url);
}

function adfFromText(text) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) {
    return { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }] };
  }
  return {
    type: 'doc',
    version: 1,
    content: lines.map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
}

const DIMENSION_LABELS = {
  technical_competency: 'Technical competency',
  problem_solving: 'Problem solving',
  communication: 'Communication',
  project_ownership: 'Project ownership',
  authenticity: 'Authenticity',
  resume_consistency: 'Resume consistency',
  behavioral_confidence: 'Behavioral confidence',
};

function dimensionLinesFromIntelligence(intelligence) {
  const dimensions = intelligence?.dimensions;
  if (!dimensions) return [];
  if (Array.isArray(dimensions)) {
    return dimensions.map((d) => `- ${d.label || d.id}: ${d.score ?? 'N/A'}/100`);
  }
  if (typeof dimensions === 'object') {
    return Object.entries(dimensions)
      .filter(([, score]) => typeof score === 'number' && !Number.isNaN(score))
      .map(([key, score]) => `- ${DIMENSION_LABELS[key] || key.replace(/_/g, ' ')}: ${score}/100`);
  }
  return [];
}

function storageHtml(lines) {
  return lines
    .map((line) => `<p>${String(line).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('');
}

export function buildCandidateSyncContext({ application, job, intelligence, score, portalBaseUrl }) {
  const name = application.name || application.anonymized_code || application.id;
  const jobTitle = job?.title || 'Role';
  const overall = intelligence?.overall ?? score?.overall;
  const bucket = intelligence?.bucket ?? score?.bucket;
  const recommendation = intelligence?.recommendation || application.recommendation;
  const tier = intelligence?.tier || score?.tier;
  const portalUrl = portalBaseUrl ? `${portalBaseUrl}/candidates/${application.id}` : null;

  const summary = `Interview: ${name}, ${jobTitle}`;
  const descriptionLines = [
    `Xperieval candidate: ${name}`,
    `Position: ${jobTitle}`,
    overall != null ? `Intelligence score: ${overall}/100` : null,
    bucket ? `Bucket: ${bucket}` : null,
    tier ? `Tier: ${tier}` : null,
    recommendation ? `Recommendation: ${recommendation}` : null,
    `Pipeline: ${application.pipeline_stage || application.status || 'updated'}`,
    portalUrl ? `Portal: ${portalUrl}` : null,
  ].filter(Boolean);

  const dimensionLines = dimensionLinesFromIntelligence(intelligence);

  return {
    summary,
    descriptionLines,
    dimensionLines,
    portalUrl,
    pageTitle: `Scorecard: ${name}, ${jobTitle}`,
  };
}

export async function createJiraIssue(config, { summary, descriptionLines, labels = [] }) {
  const site = atlassianSite(config);
  const projectKey = config.project_key?.trim();
  if (!site || !projectKey) throw fail('Jira site URL and project key are required');

  const body = {
    fields: {
      project: { key: projectKey },
      summary,
      description: adfFromText(descriptionLines.join('\n')),
      issuetype: { name: (config.issue_type || 'Task').trim() },
      labels: ['xperieval', 'hiring', ...labels].filter(Boolean),
    },
  };

  const res = await connectorFetch(`${site}/rest/api/3/issue`, {
    method: 'POST',
    headers: atlassianHeaders(config),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw fail(res.json?.errorMessages?.[0] || res.json?.errors ? JSON.stringify(res.json.errors) : `Jira returned ${res.status}`, res.json);
  }

  const issueKey = res.json?.key;
  return {
    issue_key: issueKey,
    issue_id: res.json?.id,
    url: issueKey ? `${site}/browse/${issueKey}` : null,
  };
}

export async function addJiraComment(config, issueKey, text) {
  const site = atlassianSite(config);
  const res = await connectorFetch(`${site}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
    method: 'POST',
    headers: atlassianHeaders(config),
    body: JSON.stringify({ body: adfFromText(text) }),
  });
  if (!res.ok) throw fail(`Jira comment failed (${res.status})`, res.json);
  return { ok: true };
}

export async function findConfluencePageByTitle(config, spaceKey, title) {
  const site = atlassianSite(config);
  const cql = `space="${spaceKey}" and title="${String(title).replace(/"/g, '\\"')}"`;
  const res = await connectorFetch(
    `${site}/wiki/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=1`,
    { headers: atlassianHeaders(config) }
  );
  if (!res.ok) return null;
  const page = res.json?.results?.[0];
  return page ? { id: page.id, title: page.title } : null;
}

export async function createConfluencePage(config, { title, lines, parentId = null }) {
  const site = atlassianSite(config);
  const spaceKey = config.space_key?.trim();
  if (!site || !spaceKey) throw fail('Confluence site URL and space key are required');

  const body = {
    type: 'page',
    title,
    space: { key: spaceKey },
    body: {
      storage: {
        value: storageHtml(lines),
        representation: 'storage',
      },
    },
  };
  if (parentId) body.ancestors = [{ id: String(parentId) }];

  const res = await connectorFetch(`${site}/wiki/rest/api/content`, {
    method: 'POST',
    headers: atlassianHeaders(config),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw fail(res.json?.message || `Confluence returned ${res.status}`, res.json);

  const pageId = res.json?.id;
  const webui = res.json?._links?.webui;
  return {
    page_id: pageId,
    title: res.json?.title || title,
    url: webui ? `${site}/wiki${webui}` : null,
  };
}

export async function publishConfluenceScorecard(config, context) {
  const lines = [
    context.pageTitle,
    '',
    ...context.descriptionLines,
    '',
    ...(context.dimensionLines.length ? ['Dimensions:', ...context.dimensionLines, ''] : []),
    context.portalUrl ? `Open in Xperieval: ${context.portalUrl}` : null,
  ].filter(Boolean);

  let parentId = null;
  const parentTitle = config.parent_page_title?.trim();
  if (parentTitle) {
    const parent = await findConfluencePageByTitle(config, config.space_key, parentTitle);
    parentId = parent?.id || null;
  }

  return createConfluencePage(config, {
    title: context.pageTitle,
    lines,
    parentId,
  });
}

export function parseIntegrationsJson(raw) {
  if (!raw) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

export function mergeIntegrationsJson(existing, patch) {
  return { ...parseIntegrationsJson(existing), ...patch };
}

export function shouldAutoSync(config) {
  return isTruthyFlag(config?.auto_on_shortlist ?? 'true');
}
