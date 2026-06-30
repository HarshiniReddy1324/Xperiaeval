import { connectorFetch } from './http.js';

function fail(message, detail) {
  const err = new Error(message);
  err.detail = detail;
  return err;
}

export async function postSlackShortlist(config, context) {
  const token = config.bot_token;
  const channel = config.channel_id?.trim();
  if (!token || !channel) throw fail('Slack bot token and channel ID are required');

  const lines = [
    `*Shortlisted for interview*`,
    context.summary,
    ...context.descriptionLines.map((l) => `• ${l}`),
    context.portalUrl ? `<${context.portalUrl}|Open in Xperieval>` : null,
  ].filter(Boolean);

  const res = await connectorFetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      text: lines.join('\n'),
      unfurl_links: false,
    }),
  });

  if (!res.json?.ok) {
    throw fail(res.json?.error || 'Slack post failed', res.json);
  }

  return {
    channel,
    message_ts: res.json?.ts,
    permalink: res.json?.message?.permalink || null,
  };
}
