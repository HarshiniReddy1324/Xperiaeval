/** Rubric question → assessment category (configurable per question via category_type column). */

export const QUESTION_CATEGORIES = [
  'Technical',
  'Behavioral',
  'Problem Solving',
  'Communication',
  'Project Experience',
  'Leadership',
  'Motivation',
  'General',
];

const NAME_HINTS = [
  [/technical|functional depth|skills|tools/i, 'Technical'],
  [/problem|decision|troubleshoot/i, 'Problem Solving'],
  [/stakeholder|collaborat|communicat/i, 'Communication'],
  [/ownership|owned|project|initiative|achievement/i, 'Project Experience'],
  [/lead|manage|team/i, 'Leadership'],
  [/motivat|interest|career/i, 'Motivation'],
  [/impact|measurable|results/i, 'Behavioral'],
  [/experience|relevant/i, 'Project Experience'],
];

export function inferCategoryType(category) {
  if (category?.category_type && QUESTION_CATEGORIES.includes(category.category_type)) {
    return category.category_type;
  }
  const name = `${category?.name || ''} ${category?.question || ''}`;
  for (const [re, type] of NAME_HINTS) {
    if (re.test(name)) return type;
  }
  return 'General';
}

export const CATEGORY_DIMENSION_FOCUS = {
  Technical: ['technical_competency', 'depth_of_knowledge', 'problem_solving'],
  'Problem Solving': ['problem_solving', 'technical_competency', 'depth_of_knowledge'],
  Behavioral: ['authenticity', 'communication', 'depth_of_knowledge'],
  Communication: ['communication', 'authenticity'],
  'Project Experience': ['project_ownership', 'authenticity', 'depth_of_knowledge'],
  Leadership: ['project_ownership', 'communication', 'authenticity'],
  Motivation: ['authenticity', 'communication'],
  General: ['technical_competency', 'communication', 'authenticity'],
};
