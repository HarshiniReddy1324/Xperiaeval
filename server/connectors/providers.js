import { basicAuthHeader, connectorFetch, normalizeSiteUrl } from './http.js';

function fail(message, detail) {
  const err = new Error(message);
  err.detail = detail;
  return err;
}

export async function testAtlassian(config) {
  const site = normalizeSiteUrl(config.site_url);
  const email = config.email?.trim();
  const token = config.api_token;
  if (!site || !email || !token) throw fail('Site URL, email, and API token are required');

  const jiraRes = await connectorFetch(`${site}/rest/api/3/myself`, {
    headers: {
      Authorization: basicAuthHeader(email, token),
      Accept: 'application/json',
    },
  });
  if (!jiraRes.ok) {
    throw fail(jiraRes.json?.errorMessages?.[0] || `Jira API returned ${jiraRes.status}`, jiraRes.json);
  }

  const confRes = await connectorFetch(`${site}/wiki/rest/api/user/current`, {
    headers: {
      Authorization: basicAuthHeader(email, token),
      Accept: 'application/json',
    },
  });

  const confluenceOk = confRes.ok;
  let confluenceWarning = null;
  if (!confluenceOk) {
    confluenceWarning =
      confRes.status === 401 || confRes.status === 403
        ? 'Confluence is not available on this site (wiki shows "null - null" or is deactivated). Jira works, add or reactivate Confluence at admin.atlassian.com, or skip the Confluence connector.'
        : `Confluence API returned ${confRes.status}. Jira is connected; fix Confluence on your Atlassian site before using that connector.`;
  }

  return {
    account: jiraRes.json?.displayName || jiraRes.json?.emailAddress,
    jira: true,
    confluence: confluenceOk,
    ...(confluenceWarning ? { confluence_warning: confluenceWarning } : {}),
  };
}

export async function testJira(config) {
  const site = normalizeSiteUrl(config.site_url);
  const email = config.email?.trim();
  const token = config.api_token;
  const projectKey = config.project_key?.trim();
  if (!site || !email || !token) throw fail('Connect your Atlassian account first (site, email, API token)');
  if (!projectKey) throw fail('Project key is required');

  await testAtlassian({ site_url: site, email, api_token: token });

  const res = await connectorFetch(`${site}/rest/api/3/project/${encodeURIComponent(projectKey)}`, {
    headers: {
      Authorization: basicAuthHeader(email, token),
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw fail(`Project "${projectKey}" not found or token lacks access`, res.json);

  return {
    project_key: projectKey,
    project_name: res.json?.name,
  };
}

export async function testConfluence(config) {
  const site = normalizeSiteUrl(config.site_url);
  const email = config.email?.trim();
  const token = config.api_token;
  const spaceKey = config.space_key?.trim();
  if (!site || !email || !token) throw fail('Connect your Atlassian account first');
  if (!spaceKey) throw fail('Space key is required');

  const atlassianTest = await testAtlassian({ site_url: site, email, api_token: token });
  if (!atlassianTest.confluence) {
    throw fail(
      atlassianTest.confluence_warning ||
        'Confluence is not active on this Atlassian site. Add Confluence at admin.atlassian.com → Products, or reactivate it under Billing → Inactive.'
    );
  }

  const res = await connectorFetch(`${site}/wiki/rest/api/space/${encodeURIComponent(spaceKey)}`, {
    headers: {
      Authorization: basicAuthHeader(email, token),
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw fail(`Space "${spaceKey}" not found or token lacks access`, res.json);

  return {
    space_key: spaceKey,
    space_name: res.json?.name,
  };
}

export async function testSlack(config) {
  const token = config.bot_token;
  const channelId = config.channel_id?.trim();
  if (!token) throw fail('Bot token is required');
  if (!channelId) throw fail('Channel ID is required');

  const authRes = await connectorFetch('https://slack.com/api/auth.test', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  if (!authRes.ok || !authRes.json?.ok) {
    throw fail(authRes.json?.error || `Slack auth failed (${authRes.status})`, authRes.json);
  }

  const joinRes = await connectorFetch('https://slack.com/api/conversations.join', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel: channelId }),
  });
  if (!joinRes.json?.ok && joinRes.json?.error !== 'method_not_supported_for_channel_type') {
    // Public channels may need join; DMs and some channels return errors we can ignore if post works
  }

  const postRes = await connectorFetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
      text: 'Xperieval connection test, you can delete this message.',
    }),
  });
  if (!postRes.json?.ok) {
    throw fail(
      postRes.json?.error === 'not_in_channel'
        ? 'Invite the bot to the channel first: /invite @YourBot'
        : postRes.json?.error || 'Could not post to channel',
      postRes.json
    );
  }

  return {
    team: authRes.json?.team,
    channel_id: channelId,
    bot_user: authRes.json?.user,
  };
}

const TESTERS = {
  atlassian: testAtlassian,
  jira: testJira,
  confluence: testConfluence,
  slack: testSlack,
};

export async function testConnector(providerId, config) {
  const tester = TESTERS[providerId];
  if (!tester) throw fail(`Unknown connector: ${providerId}`);
  return tester(config || {});
}
