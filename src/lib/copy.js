/** Normalize legacy em-dash copy for display (product-wide). */
export function sanitizeProductCopy(text) {
  if (text == null || text === '') return text;
  return String(text)
    .replace(/\s*—\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .trim();
}
