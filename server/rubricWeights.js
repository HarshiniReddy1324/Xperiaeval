/** Flexible rubric sizing — total application score always sums to 100. */

export const MIN_RUBRIC_QUESTIONS = 1;
export const MAX_RUBRIC_QUESTIONS = 40;

export function distributeWeights(count) {
  if (count < 1) return [];
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function normalizeRubricCategories(categories = []) {
  const weights = distributeWeights(categories.length);
  return categories.map((c, i) => ({
    ...c,
    weight: weights[i],
    sort_order: i,
  }));
}

export function validateRubricQuestions(categories = []) {
  const n = categories.length;
  if (n < MIN_RUBRIC_QUESTIONS) {
    return { ok: false, error: `Add at least ${MIN_RUBRIC_QUESTIONS} screening question.` };
  }
  if (n > MAX_RUBRIC_QUESTIONS) {
    return { ok: false, error: `Maximum ${MAX_RUBRIC_QUESTIONS} questions per rubric.` };
  }
  const missing = categories.find((c) => !(c.question || '').trim() || !(c.name || '').trim());
  if (missing) {
    return { ok: false, error: 'Every question needs a category name and question text.' };
  }
  const weightSum = distributeWeights(n).reduce((s, w) => s + w, 0);
  if (weightSum !== 100) {
    return { ok: false, error: 'Question weights must total 100 points.' };
  }
  return { ok: true };
}

export function rubricScoreCaps(categories = []) {
  const normalized = normalizeRubricCategories(categories);
  const mandatory_max = normalized
    .filter((c) => (c.priority || 'mandatory') !== 'optional')
    .reduce((s, c) => s + Number(c.weight || 0), 0);
  const optional_max = normalized
    .filter((c) => c.priority === 'optional')
    .reduce((s, c) => s + Number(c.weight || 0), 0);
  return {
    mandatory_max,
    optional_max,
    total: mandatory_max + optional_max,
    count: normalized.length,
  };
}

export function weightedQuestionPoints(rawPoints, rawMax, categoryWeight) {
  const max = Number(rawMax) || 10;
  const weight = Number(categoryWeight) || 0;
  if (!max || !weight) return 0;
  return Math.round((Number(rawPoints) / max) * weight * 10) / 10;
}
