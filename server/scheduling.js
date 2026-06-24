import { v4 as uuid } from 'uuid';

/** Generate bookable slots for the next N business days. */
export function generateDefaultSlots({
  days = 10,
  startHour = 9,
  endHour = 17,
  durationMinutes = 30,
  timezone = 'America/New_York',
}) {
  const slots = [];
  const now = new Date();
  let d = new Date(now);
  d.setHours(0, 0, 0, 0);

  let added = 0;
  let scanned = 0;
  while (added < days && scanned < days + 14) {
    d.setDate(d.getDate() + (scanned === 0 ? 0 : 1));
    scanned += 1;
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += durationMinutes) {
        if (h === endHour - 1 && m > 0) break;
        const start = new Date(d);
        start.setHours(h, m, 0, 0);
        if (start <= now) continue;
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
        slots.push({
          id: uuid(),
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          timezone,
        });
      }
    }
    added += 1;
  }
  return slots.slice(0, 24);
}

export function formatSlotLabel(startsAt, timezone = 'America/New_York') {
  try {
    return new Date(startsAt).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: timezone,
    });
  } catch {
    return startsAt;
  }
}

export function buildIcsEvent({ title, startsAt, endsAt, description, location }) {
  const fmt = (d) =>
    new Date(d)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Xperieval//Interview//EN',
    'BEGIN:VEVENT',
    `UID:${uuid()}@xperieval.com`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startsAt)}`,
    `DTEND:${fmt(endsAt)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${location || 'Video call'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
