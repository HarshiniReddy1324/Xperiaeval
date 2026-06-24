/** Screening answers tuned to green / amber / red buckets per role family. */

import { buildKeystrokeFields } from './keystrokeProfile.js';

const CORE = {
  product: (role) =>
    `In my recent ${role} work I owned discovery interviews, wrote Jira stories with acceptance criteria, built Amplitude funnels, and partnered with engineering on React/Node delivery. I documented trade-offs, communicated with stakeholders, and validated outcomes with SQL cohort readouts — therefore we increased completion 18%, reduced support tickets 14%, and improved metrics leadership tracks.`,
  analytics: () =>
    `I rebuilt KPI models in dbt and Looker, ran power-checked A/B tests, and partnered with product on event instrumentation. I reduced reporting lag from 48 hours to 3 hours, improved funnel conversion 6.2%, and presented readouts executives used for roadmap decisions — using SQL, cohort analysis, and clear stakeholder communication throughout.`,
  engineering: () =>
    `I shipped production features in TypeScript/React and Node.js with code review, unit tests, and observability. I debugged root cause with logs and metrics, implemented caching that cut latency 18%, and collaborated in agile rituals — delivering measurable outcomes with maintainable code and documentation.`,
  dataEng: () =>
    `I designed streaming pipelines on Kafka into Snowflake with data contracts, Airflow orchestration, and Great Expectations checks. I reduced pipeline failures 63%, cut compute cost 27%, and mentored engineers on on-call runbooks — balancing reliability, cost, and clear SLAs for downstream analytics teams.`,
  peopleOps: () =>
    `I scaled structured interviewing across 1,100 annual hires, built rubric certification, and partnered with RevOps on funnel analytics. I cut time-to-fill 24%, reduced agency spend $1.2M, and led ATS migration with 98% adoption — using process design, change management, and executive reporting.`,
};

function greenAnswers(family, jobTitle) {
  const c =
    family === 'product'
      ? CORE.product(jobTitle)
      : family === 'analytics'
        ? CORE.analytics()
        : family === 'engineering'
          ? CORE.engineering()
          : family === 'dataEng'
            ? CORE.dataEng()
            : CORE.peopleOps();
  return [
    `My professional experience is directly relevant to this ${jobTitle} role across multiple years and domains. ${c}`,
    `I personally owned an initiative end-to-end from problem framing through launch and post-ship readout. ${c}`,
    `My measurable results include double-digit percentage improvements, reduced operational waste, and revenue or efficiency gains leadership validated. ${c}`,
    `When stakeholders disagreed on priorities, I facilitated trade-off sessions, documented decisions, and aligned engineering, design, and business partners. ${c}`,
    `A difficult decision I made weighed customer risk, revenue timing, and engineering cost — I chose a phased rollout with written rationale and rollback plan. ${c}`,
    `Daily I use the tools and methods this role requires — SQL, analytics platforms, delivery tooling, and cross-functional communication rituals. ${c}`,
    `I am motivated by this role because it matches my career stage, domain interest, and desire to own outcomes with accountable teams. ${c}`,
    `An achievement I am proud of outside the core job description shows leadership, initiative, and measurable community or business impact. ${c}`,
    `I collaborate across functions through shared docs, working sessions, and proactive blocker removal before deadlines slip. ${c}`,
    `Additional context: I typed these answers myself, can provide references, and am available to start within standard notice periods. ${c}`,
  ];
}

function amberAnswers(family, jobTitle) {
  const greens = greenAnswers(family, jobTitle);
  return greens.map((a, i) => {
    if (i >= 7) return i === 8 ? a.slice(0, 120) : '';
    return a
      .replace(/18%|63%|24%|\$1\.2M|6\.2%/g, 'meaningful')
      .replace(/I personally owned/gi, 'I contributed to')
      .slice(0, i < 4 ? 280 : 180);
  });
}

function redAnswers() {
  return [
    'I have some related experience and am interested in this type of role.',
    'I helped on a project at work with support from teammates.',
    'I improved a few metrics but do not have strong numbers handy.',
    'I try to communicate with stakeholders when priorities conflict.',
    'I made decisions with manager guidance.',
    'I use common workplace tools.',
    'I want to grow in this field.',
    '',
    '',
    '',
  ];
}

const FAMILY_BY_JOB = {
  'JOB-INTERN-001': 'engineering',
  'JOB-ASSOC-001': 'product',
  'JOB-MID-001': 'analytics',
  'JOB-SENIOR-001': 'product',
  'JOB-STAFF-001': 'dataEng',
  'JOB-DIRECTOR-001': 'peopleOps',
};

export function getPortfolioAnswers(jobId, jobTitle, quality) {
  const family = FAMILY_BY_JOB[jobId] || 'product';
  if (quality === 'strong') return greenAnswers(family, jobTitle);
  if (quality === 'average') return amberAnswers(family, jobTitle);
  return redAnswers();
}

export function getAnswerMeta(quality, index) {
  const base =
    quality === 'strong'
      ? { time_taken_seconds: 200 + index * 12, idle_seconds: 4, focus_loss_count: 0 }
      : quality === 'average'
        ? { time_taken_seconds: 140 + index * 8, idle_seconds: 12, focus_loss_count: index % 4 === 0 ? 1 : 0 }
        : { time_taken_seconds: 70 + index * 5, idle_seconds: 30, focus_loss_count: index % 2 ? 2 : 1 };
  return base;
}

export function getIntegrityProfile(quality, categories = [], answers = []) {
  const { fields, keystroke_intervals } =
    categories.length > 0 ? buildKeystrokeFields(categories, answers, quality) : { fields: {}, keystroke_intervals: [] };

  if (quality === 'strong') {
    return {
      started_at: Date.now() - 3200000,
      focus_loss_count: 0,
      hidden_time_seconds: 20,
      paste_attempts: 0,
      copy_attempts: 0,
      right_click_attempts: 0,
      fullscreen_entered: true,
      fullscreen_exit_count: 0,
      total_time_seconds: 2900,
      keystroke_anomaly: false,
      fields,
      keystroke_intervals,
    };
  }
  if (quality === 'average') {
    return {
      started_at: Date.now() - 2600000,
      focus_loss_count: 2,
      hidden_time_seconds: 90,
      paste_attempts: 0,
      copy_attempts: 1,
      right_click_attempts: 0,
      fullscreen_entered: true,
      fullscreen_exit_count: 1,
      total_time_seconds: 2400,
      keystroke_anomaly: false,
      fields,
      keystroke_intervals,
    };
  }
  return {
    started_at: Date.now() - 1800000,
    focus_loss_count: 7,
    hidden_time_seconds: 240,
    paste_attempts: 4,
    copy_attempts: 3,
    right_click_attempts: 2,
    fullscreen_entered: true,
    fullscreen_exit_count: 3,
    total_time_seconds: 1500,
    keystroke_anomaly: true,
    fields,
    keystroke_intervals,
  };
}
