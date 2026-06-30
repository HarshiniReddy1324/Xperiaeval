/** Display helper: stored source is already normalized on the server. */

export function formatApplicationSource(source) {
  const trimmed = String(source || '').trim();
  if (!trimmed) return 'Careers page';
  return trimmed;
}
