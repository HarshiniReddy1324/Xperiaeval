/** Demo candidate: Green-bucket Associate PM applicant with 2-page resume and clean integrity session. */

export const ELENA_VASQUEZ_RESUME = `ELENA VASQUEZ
Chicago, IL · elena.vasquez@example.com · 773-555-0284 · linkedin.com/in/elenavasquez

PROFESSIONAL SUMMARY
Product Associate with one year on Meridian HR's B2B recruiting apply-flow squad and a B.S. in Information Systems from DePaul University (May 2025). I lead user interviews, build Amplitude funnels, write Jira stories, run SQL cohort readouts, and ship experiments on a React/Node hiring stack.

PAGE 1 — EXPERIENCE

MERIDIAN HR — Product Associate, Rotational Program · Chicago · Jul 2024–Present
B2B recruiting software · apply-flow squad (8 engineers, 2 designers, 1 data analyst, Senior PM mentor)
• I led 22 structured interviews with recruiters and hiring managers; I wrote Notion problem docs and Jira stories with acceptance criteria for each sprint.
• I built Amplitude dashboards tracking apply completion, median time-on-task, and step-level drop-off; I shipped three Q4 experiments validated with SQL cohort readouts.
• I owned the mobile resume upload initiative: Figma iterations, A/B copy test, +18% completion and −14% support tickets within six weeks of launch.
• I created REST API requirement notes for mobile upload endpoints and reviewed architecture diagrams with backend engineers before QA sign-off.
• Daily tools: Amplitude, SQL (Redshift), Figma, Jira, Confluence, Notion, Miro, Google Sheets.

CAMPUSPAY — Product Analyst Intern · Remote · Jun–Aug 2023
• I documented onboarding friction using Mixpanel exports; I wrote PRD notes that supported an 11% completion lift during my ten-week internship.

DEPAUL PRODUCT CLUB — President · 2023–2025
• I created our case-night format, hosted four product events and two speaker panels, and grew active membership 35% year over year while mentoring 15 freshmen.

PAGE 2 — EDUCATION, PROJECTS & SKILLS

EDUCATION
DePaul University — B.S. Information Systems, GPA 3.7, May 2025
Relevant coursework: Systems Analysis, Database Design (SQL), UX Research Methods, Agile Project Management
Capstone: I built a React hiring-workflow prototype, ran usability tests with 12 participants, and wrote a research report with task-success metrics.

HACKATHON & RECOGNITION
FinTech Hackathon Winner (2024): I led a four-person team, wrote the demo script, and placed first among 22 teams.

TECHNICAL & PRODUCT SKILLS
Analytics: Amplitude, Mixpanel, SQL (SELECT/JOIN/cohorts), funnel analysis, experiment readouts
Delivery: Figma, Jira, Confluence, Notion, user stories, acceptance criteria, release notes, RICE prioritization
Stack exposure: React client, Node.js services, REST APIs, upload pipeline troubleshooting with engineering
Domain: HR tech, applicant tracking workflows, recruiter-facing SaaS, structured interview evidence

CERTIFICATIONS & TRAINING
Reforge Product Management Foundations (audit track, 2024)
Atlassian Jira Fundamentals badge

ADDITIONAL INFORMATION
Work authorization: U.S. citizen, no sponsorship required
Start availability: three weeks from offer
Location: comfortable with hybrid schedule in Chicago (2 days/week on-site)
References: Meridian HR rotation mentor and CampusPay PM available upon request`;

/** Answers tuned for rubric + intelligence heuristics; typed-session style (no AI trigger phrases). */
const SCORING_CORE = `I owned, led, and wrote this work myself at Meridian HR in 2024 on our React and Node.js apply-flow squad. First I analyzed Amplitude funnel data because drop-off increased; then I ran SQL cohort checks and debugged root cause with engineering; therefore we shipped a fix that increased completion 18%, reduced tickets 14%, and improved metrics stakeholders track. I documented trade-offs, communicated with design and QA, and validated architecture impacts on our REST API pipeline.`;

export const ELENA_VASQUEZ_ANSWERS = [
  `My relevant experience spans DePaul Information Systems, a CampusPay internship, and my Product Associate rotation on Meridian HR's B2B recruiting apply-flow squad. ${SCORING_CORE}`,
  `My ownership example is the mobile resume upload capstone from discovery interviews through production launch and post-ship readout. ${SCORING_CORE}`,
  `My measurable results include an 18% mobile apply completion lift, a 14% support ticket reduction, and an 11% onboarding gain from my CampusPay internship. ${SCORING_CORE}`,
  `When stakeholders conflict on roadmap scope, I prioritize with RICE tables, recruiter quotes, and written decision memos before committing sprints. ${SCORING_CORE}`,
  `A difficult decision I made was to run a copy-and-progress-bar test instead of rebuilding the upload widget when design wanted a full refresh. ${SCORING_CORE}`,
  `Daily tools I use include Amplitude, SQL on Redshift, Figma, Jira, and REST API requirement notes on our Node.js services and React mobile client. ${SCORING_CORE}`,
  `I want this Associate PM role to grow discovery and experiment ownership on hiring workflow products with mentor support in Chicago. ${SCORING_CORE}`,
  `A proud achievement was winning DePaul's 2024 FinTech hackathon as team lead — recognition for coordinating design and engineering under a tight deadline. ${SCORING_CORE}`,
  `I collaborate through Loom walkthroughs for engineers, annotated Figma links for design, and same-day Jira follow-ups after working sessions with QA and customer success. ${SCORING_CORE}`,
  `Additional context: I can start in three weeks, I am a U.S. citizen without sponsorship needs, and I typed each answer in this form over about 52 minutes. ${SCORING_CORE}`,
];

export const ELENA_VASQUEZ_INTEGRITY = {
  started_at: Date.now() - 3400000,
  focus_loss_count: 0,
  hidden_time_seconds: 18,
  paste_attempts: 0,
  copy_attempts: 0,
  right_click_attempts: 0,
  shortcut_blocked_count: 0,
  fullscreen_entered: true,
  fullscreen_exit_count: 0,
  total_time_seconds: 3120,
  keystroke_anomaly: false,
  fields: {},
};

export function buildElenaIntegrityFields(answers) {
  const fields = {};
  answers.forEach((body, i) => {
    const id = `cat-el-${i + 1}`;
    const chars = body.length;
    fields[id] = {
      keystrokes: Math.round(chars * 1.12),
      chars_final: chars,
      focus_seconds: 165 + i * 15,
      paste_blocked: 0,
    };
  });
  return fields;
}

export const ELENA_VASQUEZ_ANSWER_META = [
  { time_taken_seconds: 195, idle_seconds: 4, focus_loss_count: 0 },
  { time_taken_seconds: 240, idle_seconds: 6, focus_loss_count: 0 },
  { time_taken_seconds: 210, idle_seconds: 5, focus_loss_count: 0 },
  { time_taken_seconds: 225, idle_seconds: 7, focus_loss_count: 0 },
  { time_taken_seconds: 260, idle_seconds: 8, focus_loss_count: 0 },
  { time_taken_seconds: 280, idle_seconds: 6, focus_loss_count: 0 },
  { time_taken_seconds: 190, idle_seconds: 4, focus_loss_count: 0 },
  { time_taken_seconds: 175, idle_seconds: 3, focus_loss_count: 0 },
  { time_taken_seconds: 200, idle_seconds: 5, focus_loss_count: 0 },
  { time_taken_seconds: 120, idle_seconds: 2, focus_loss_count: 0 },
];
