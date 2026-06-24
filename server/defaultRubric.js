/** Standard 10-question rubric: 7 mandatory + 3 optional. Each has a full internal sample answer + AI keywords. */

export const DEFAULT_RUBRIC_QUESTIONS = [
  {
    name: 'Role-relevant experience',
    category_type: 'Project Experience',
    weight: 10,
    priority: 'mandatory',
    question: 'Summarize your professional experience most relevant to this role.',
    ideal_answer:
      'Over the past four years I have worked as a product analyst at NorthSquare Commerce, owning funnel analytics for the B2B checkout squad. Before that I spent two years as a business analyst at a regional bank, where I built SQL reporting for lending operations. My day-to-day work includes SQL, Amplitude, stakeholder interviews, and writing PRDs with engineering — which maps directly to this role’s need for someone who can translate business questions into measurable product decisions.',
    keywords: 'experience,role,responsibilities,scope,years,domain,shipped,owned,delivered',
  },
  {
    name: 'Ownership example',
    category_type: 'Project Experience',
    weight: 10,
    priority: 'mandatory',
    question: 'Describe a project or initiative you personally owned from start to finish.',
    ideal_answer:
      'I owned the employer branding refresh on our careers site end-to-end last year. I started with applicant drop-off data, ran five user interviews with recent candidates, prioritized form friction and mobile layout issues, partnered with design on wireframes, wrote Jira stories for engineering, and launched behind a feature flag. Post-launch we increased application completion by 14% and reduced support tickets about the apply flow by 22% within six weeks.',
    keywords: 'owned,led,delivered,shipped,launched,initiative,outcome,metrics,end-to-end',
  },
  {
    name: 'Measurable impact',
    category_type: 'Behavioral',
    weight: 10,
    priority: 'mandatory',
    question: 'What measurable results did you achieve in your most recent role?',
    ideal_answer:
      'In my current role I rebuilt our executive KPI dashboard, cutting reporting lag from two days to under three hours by moving logic into dbt marts and standardizing metric definitions across product and finance. I also led an A/B test on the application form that lifted completion rate by 14% (from 61% to 75%) and reduced recruiter screening time by roughly 8 hours per week because fewer incomplete applications reached the queue.',
    keywords: 'metrics,percent,revenue,users,growth,reduced,increased,impact,hours,saved',
  },
  {
    name: 'Stakeholder management',
    category_type: 'Communication',
    weight: 10,
    priority: 'mandatory',
    question: 'How do you handle conflicting priorities from multiple stakeholders?',
    ideal_answer:
      'When sales and engineering disagreed on roadmap priority for a compliance feature, I documented each stakeholder’s goal, impact, and deadline in a one-page decision brief. I facilitated a 45-minute working session focused on customer risk and revenue timing, proposed a phased rollout that shipped the compliance MVP in sprint one and deferred nice-to-have UI polish to sprint three, and sent written trade-offs to both VPs so expectations stayed aligned after the meeting.',
    keywords: 'stakeholder,prioritize,trade-off,communicate,align,decision,framework,conflict',
  },
  {
    name: 'Problem-solving',
    category_type: 'Problem Solving',
    weight: 10,
    priority: 'mandatory',
    question: 'Tell us about a difficult decision you made and how you reached it.',
    ideal_answer:
      'We discovered a data pipeline bug that understated conversion by about 9% for two weeks. I had to decide whether to pause a marketing campaign that was optimizing on the bad numbers. I reproduced the issue with engineering, quantified the error bounds, modeled the campaign waste if we continued, and recommended pausing spend for 48 hours while we backfilled corrected metrics. Leadership agreed, we avoided roughly $40K in misallocated spend, and I documented a monitoring alert so we would catch similar drift within an hour next time.',
    keywords: 'decision,trade-off,analysis,data,reasoning,result,lesson,root cause',
  },
  {
    name: 'Technical / functional depth',
    category_type: 'Technical',
    weight: 10,
    priority: 'mandatory',
    question: 'Describe the skills, tools, or methods you use daily that apply to this role.',
    ideal_answer:
      'Daily I use SQL and dbt for metric definitions, Amplitude and Looker for funnel analysis, Figma for low-fidelity flows, and Jira/Confluence for delivery. For experimentation I design guardrail metrics before launch, run power checks when sample size is tight, and write clear readouts for non-technical stakeholders. I am comfortable partnering with engineers on API contracts and event instrumentation when tracking is missing.',
    keywords: 'tools,technical,method,process,SQL,analytics,experimentation,API,data',
  },
  {
    name: 'Motivation',
    category_type: 'Motivation',
    weight: 10,
    priority: 'mandatory',
    question: 'Why are you interested in this type of role at this point in your career?',
    ideal_answer:
      'I want to move from analytics-heavy execution into a role where I own more of the discovery and roadmap narrative, not just reporting. This position sits at the intersection of hiring workflow, candidate experience, and measurable outcomes — areas where I have already delivered impact. I am specifically excited about building structured screening that helps hiring managers make faster, fairer decisions with better evidence.',
    keywords: 'motivation,career,growth,impact,team,mission,role,why',
  },
  {
    name: 'Additional achievement',
    category_type: 'Project Experience',
    weight: 10,
    priority: 'optional',
    question: 'Share a professional achievement you are proud of that we have not asked about yet.',
    ideal_answer:
      'I volunteer-led an internal mentorship circle for early-career analysts, pairing twelve mentees with senior ICs and creating a shared interview-prep curriculum. Three mentees received promotions within a year, and our org adopted the curriculum for onboarding new hires in two departments.',
    keywords: 'achievement,recognition,impact,proud,mentor,leadership',
  },
  {
    name: 'Collaboration style',
    category_type: 'Communication',
    weight: 10,
    priority: 'optional',
    question: 'How do you collaborate with cross-functional partners when requirements are ambiguous?',
    ideal_answer:
      'When requirements are fuzzy I start with a 30-minute problem framing session, capture assumptions explicitly, and deliver a thin vertical slice or clickable prototype before committing to a full build. I keep a living decision log in Confluence and recap open questions in Slack so design, engineering, and go-to-market stay synchronized even when priorities shift mid-sprint.',
    keywords: 'collaborate,cross-functional,ambiguous,align,communicate,prototype',
  },
  {
    name: 'Growth area',
    category_type: 'Behavioral',
    weight: 10,
    priority: 'optional',
    question: 'What skill are you actively improving right now?',
    ideal_answer:
      'I am deepening my experimentation statistics — especially power analysis and guardrail design — so I can run fewer false-positive launches. I am taking a structured course, pairing with our data science lead monthly, and applying the methods to our next two A/B tests on onboarding.',
    keywords: 'learning,growth,improve,skill,development,feedback',
  },
];

/** @deprecated Use ideal_answer — kept for DB backward compatibility on insert */
export function rubricRowFromQuestion(q) {
  return {
    ...q,
    expected_evidence: (q.ideal_answer || '').slice(0, 280),
  };
}

/** Validate rubric before approval: 7 mandatory + 3 optional, 10 points each. */
export function validateRubricCategories(categories = []) {
  const mandatory = categories.filter((c) => (c.priority || 'mandatory') !== 'optional');
  const optional = categories.filter((c) => c.priority === 'optional');
  if (mandatory.length !== 7) {
    return { ok: false, error: `Need exactly 7 mandatory questions (have ${mandatory.length}).` };
  }
  if (optional.length !== 3) {
    return { ok: false, error: `Need exactly 3 optional questions (have ${optional.length}).` };
  }
  const badWeight = categories.find((c) => Number(c.weight) !== 10);
  if (badWeight) {
    return { ok: false, error: 'Each question must be worth 10 points.' };
  }
  const missingQuestion = categories.find((c) => !(c.question || '').trim());
  if (missingQuestion) {
    return { ok: false, error: 'Every rubric row needs question text.' };
  }
  return { ok: true };
}
