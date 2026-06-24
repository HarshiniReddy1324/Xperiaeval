/** Full formatted resumes for portfolio demo candidates (2-page style, not one-line summaries). */

function header({ name, email, phone, location, linkedin }) {
  return `${name.toUpperCase()}
${location} · ${email} · ${phone} · ${linkedin}

`;
}

function footer(extras = []) {
  return extras.length
    ? `\nADDITIONAL INFORMATION\n${extras.map((l) => `• ${l}`).join('\n')}`
    : '';
}

export const PORTFOLIO_RESUMES = {
  'APP-INT-1001': `${header({
    name: 'Aarav Mehta',
    email: 'aarav.mehta@example.com',
    phone: '512-555-0101',
    location: 'Austin, TX',
    linkedin: 'linkedin.com/in/aaravmehta',
  })}PROFESSIONAL SUMMARY
Computer Science student (B.S., May 2026) at UT Austin with production internship experience building React dashboards, Node.js services, and CI pipelines. I ship measurable improvements — 18% latency reduction, 22% fewer failed deploys — and collaborate in agile squads with code review discipline.

PAGE 1 — EXPERIENCE

FINNEST — Software Engineering Intern · Austin, TX · Jun–Aug 2025
Fintech onboarding squad · React, TypeScript, Node.js, PostgreSQL
• Built recruiter-facing dashboard module with paginated API caching; cut median page load from 2.1s to 1.7s (−18%).
• Implemented Jest + React Testing Library coverage for three critical flows; reduced regression bugs in QA by 22%.
• Paired with senior engineer on Express middleware for rate limiting and structured logging (Winston + Datadog).
• Participated in sprint planning, standups, and post-incident reviews; shipped four PRs merged to main.

UT AUSTIN CS LABS — Teaching Assistant, Data Structures · Jan 2025–Present
• Led weekly office hours for 40 students; authored autograder test suites in Python for graph algorithms module.

PAGE 2 — PROJECTS, EDUCATION & SKILLS

SELECTED PROJECTS
Distributed KV Store (Go, gRPC) — consistent hashing, replication lab, 94th percentile read < 12ms in benchmark harness
Interview Scheduler (Node.js, SQLite, React) — calendar conflict detection, REST API, deployed on Render for campus club

EDUCATION
The University of Texas at Austin — B.S. Computer Science, GPA 3.82, expected May 2026
Relevant coursework: Operating Systems, Databases, Computer Networks, Software Engineering

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Python, Go, SQL
Frameworks: React, Node.js, Express, Jest, Cypress, GitHub Actions
Tools: Git, Docker basics, Postman, Jira, Linux CLI

CERTIFICATIONS
AWS Cloud Practitioner (2025) · Meta Front-End Developer Professional Certificate (audit track)${footer([
    'U.S. citizen · available May 2026 full-time · open to Austin hybrid internship',
    'GitHub: github.com/aaravmehta-dev · references: FinNest engineering manager',
  ])}`,

  'APP-INT-1002': `${header({
    name: 'Nora Fields',
    email: 'nora.fields@example.com',
    phone: '512-555-0102',
    location: 'San Marcos, TX',
    linkedin: 'linkedin.com/in/norafields',
  })}PROFESSIONAL SUMMARY
Information Systems student graduating December 2026 with QA automation internship experience and solid fundamentals in web applications, databases, and test design. Comfortable in Cypress, SQL, and cross-functional bug triage.

PAGE 1 — EXPERIENCE

RETAILFLOW STARTUP — QA & Automation Intern · Remote · Jun–Aug 2025
• Authored 38 Cypress smoke tests for checkout and inventory flows; caught 14 regressions pre-release.
• Logged reproducible defects in Jira with screen recordings; partnered with developers on fix verification.
• Maintained Postman collections for staging API checks and wrote onboarding doc for future interns.

TEXAS STATE IT HELP DESK — Student Technician · 2024–Present
• Resolved 200+ tier-1 tickets; documented knowledge-base articles for VPN and MFA issues.

PAGE 2 — EDUCATION & SKILLS

EDUCATION
Texas State University — B.S. Information Systems, GPA 3.55, expected Dec 2026
Coursework: Web Application Development, Database Systems, Systems Analysis, UX Fundamentals

TECHNICAL SKILLS
Testing: Cypress, manual QA, test cases, regression suites
Development: JavaScript basics, HTML/CSS, SQL (SELECT/JOIN), REST APIs via Postman
Tools: Jira, Confluence, Figma (review), Git basics

ACTIVITIES
Women in STEM Society — workshop organizer, 2024–2025${footer([
    'Seeking first software engineering internship with mentorship and structured code review',
    'Available full-time summer 2026 · willing to relocate within Texas',
  ])}`,

  'APP-INT-1003': `${header({
    name: 'Ethan Cole',
    email: 'ethan.cole@example.com',
    phone: '512-555-0103',
    location: 'Round Rock, TX',
    linkedin: 'linkedin.com/in/ethancole',
  })}PROFESSIONAL SUMMARY
Self-taught web developer exploring first internship opportunity. Built small React projects and static sites for local organizations; eager to learn production engineering practices.

PAGE 1 — EXPERIENCE

FREELANCE — Web Projects · 2023–Present
• Created brochure websites for two local nonprofits using HTML, CSS, and basic JavaScript.
• Built personal todo app in React with local storage (learning project, not production scale).

COMMUNITY COLLEGE — Part-time IT Tutor · 2024
• Helped students with introductory programming assignments in Python.

PAGE 2 — EDUCATION & SKILLS

EDUCATION
Austin Community College — Associate coursework in Computer Science (in progress)
Planned transfer to four-year program

TECHNICAL SKILLS
HTML, CSS, JavaScript, beginner React, GitHub, VS Code
Currently studying: data structures, SQL fundamentals

PROJECTS
Personal portfolio site · React todo list · club event landing pages${footer([
    'Looking for internship to gain professional mentorship and codebase experience',
  ])}`,

  'APP-ASC-2001': `${header({
    name: 'Elena Vasquez',
    email: 'elena.vasquez@example.com',
    phone: '773-555-0201',
    location: 'Chicago, IL',
    linkedin: 'linkedin.com/in/elenavasquez',
  })}PROFESSIONAL SUMMARY
Product Associate with one year on Meridian HR's B2B recruiting apply-flow squad and a B.S. in Information Systems from DePaul University (May 2025). I lead user interviews, build Amplitude funnels, write Jira stories, run SQL cohort readouts, and ship experiments on a React/Node hiring stack.

PAGE 1 — EXPERIENCE

MERIDIAN HR — Product Associate, Rotational Program · Chicago · Jul 2024–Present
B2B recruiting software · apply-flow squad (8 engineers, 2 designers, 1 data analyst, Senior PM mentor)
• Led 22 structured interviews with recruiters and hiring managers; wrote Notion problem docs and Jira stories with acceptance criteria.
• Built Amplitude dashboards tracking apply completion, median time-on-task, and step-level drop-off; shipped three Q4 experiments validated with SQL cohort readouts.
• Owned mobile resume upload initiative: Figma iterations, A/B copy test, +18% completion and −14% support tickets within six weeks of launch.
• Created REST API requirement notes for mobile upload endpoints and reviewed architecture diagrams with backend engineers before QA sign-off.

BEACONHIRE (prior rotation) — Product Analyst Intern · Remote · Jun–Aug 2023
• Documented onboarding friction using Mixpanel exports; PRD notes supported 11% completion lift during ten-week internship.

PAGE 2 — EDUCATION, PROJECTS & SKILLS

EDUCATION
DePaul University — B.S. Information Systems, GPA 3.7, May 2025
Capstone: React hiring-workflow prototype, usability tests with 12 participants, research report with task-success metrics.

TECHNICAL & PRODUCT SKILLS
Analytics: Amplitude, Mixpanel, SQL (SELECT/JOIN/cohorts), funnel analysis, experiment readouts
Delivery: Figma, Jira, Confluence, Notion, user stories, acceptance criteria, RICE prioritization
Stack exposure: React client, Node.js services, REST APIs, HR tech / applicant tracking workflows

RECOGNITION
DePaul FinTech Hackathon Winner (2024) — team lead among 22 teams${footer([
    'U.S. citizen · start availability three weeks from offer · hybrid Chicago 2 days/week',
    'References: Meridian HR rotation mentor and CampusPay PM available upon request',
  ])}`,

  'APP-ASC-2002': `${header({
    name: 'Jordan Rivera',
    email: 'jordan.rivera@example.com',
    phone: '773-555-0202',
    location: 'Chicago, IL',
    linkedin: 'linkedin.com/in/jordanrivera',
  })}PROFESSIONAL SUMMARY
Early-career product professional with Business Analytics degree (UIUC 2024) and a ten-week product internship at PayFlow. Strong in user research support, sprint coordination, and funnel documentation; growing depth in SQL and experiment design.

PAGE 1 — EXPERIENCE

PAYFLOW — Product Intern · Chicago · Jun–Aug 2024
• Supported PM on onboarding funnel: user interviews, Amplitude notes, sprint task tracking in Jira.
• Drafted release notes and coordinated UAT checklist with QA for two minor feature releases.
• Built Google Sheets roadmap view used by leadership for quarterly planning summaries.

UIUC PRODUCT CLUB — President · 2022–2024
• Organized two campus hackathons (80+ participants) and weekly case nights for 35 active members.

PAGE 2 — EDUCATION & SKILLS

EDUCATION
University of Illinois Urbana-Champaign — B.S. Business Analytics, GPA 3.6, May 2024

SKILLS
Figma, Jira, Google Sheets, SQL basics, user interview note-taking, stakeholder updates
Exposure: Amplitude (intern project), Notion, Miro${footer([
    'Interested in Associate PM roles with structured mentorship',
    'Available to start within four weeks',
  ])}`,

  'APP-ASC-2003': `${header({
    name: 'Mina Patel',
    email: 'mina.patel@example.com',
    phone: '773-555-0203',
    location: 'Naperville, IL',
    linkedin: 'linkedin.com/in/minapatel',
  })}PROFESSIONAL SUMMARY
Operations-oriented coordinator with 1.5 years at a small startup supporting backlog hygiene, QA tracking, and release communications. Interested in transitioning into product management.

PAGE 1 — EXPERIENCE

BRIGHTPATH STARTUP — Product Coordinator · Remote · 2023–Present
• Updated Jira tickets, maintained Trello boards, and scheduled sprint demos.
• Assisted PMs with release notes and customer support escalations; limited discovery ownership.

PAGE 2 — SKILLS & EDUCATION

EDUCATION
B.A. Communications, regional university (2022)

TOOLS
Jira, Trello, Google Sheets, basic analytics requests${footer(['Seeking product role to grow discovery and roadmap skills'])})`,

  'APP-MID-3001': `${header({
    name: 'Sofia Nguyen',
    email: 'sofia.nguyen@example.com',
    phone: '646-555-0301',
    location: 'Brooklyn, NY',
    linkedin: 'linkedin.com/in/sofia-nguyen-analytics',
  })}PROFESSIONAL SUMMARY
Data Analyst II with four years across e-commerce and B2B SaaS. I own executive KPI models, dbt marts, funnel diagnostics, and experimentation readouts. Reduced reporting lag from 48 hours to 3 hours and improved experiment decision velocity for product leadership.

PAGE 1 — EXPERIENCE

NORTHSQUARE COMMERCE — Data Analyst II · Remote · 2022–Present
• Rebuilt executive KPI layer in dbt + Looker; standardized definitions across product, finance, and GTM.
• Led A/B analysis on checkout flow (+6.2% conversion) with guardrail metrics and power checks.
• Partnered with engineers on event instrumentation specs; cut dashboard discrepancies by 41%.

CARTLY — BI Analyst · New York · 2020–2022
• Built SQL reporting for merchandising; automated weekly revenue bridge used by VP Sales.

PAGE 2 — EDUCATION & SKILLS

EDUCATION
NYU — B.S. Applied Mathematics, 2020

TECHNICAL SKILLS
SQL (advanced), dbt, Looker, Amplitude, Python (pandas), experiment design, funnel analysis, stakeholder readouts${footer([
    'Authorized to work in the U.S. · remote-first · references from NorthSquare director of analytics',
  ])}`,

  'APP-MID-3002': `${header({
    name: 'Caleb Morris',
    email: 'caleb.morris@example.com',
    phone: '646-555-0302',
    location: 'Philadelphia, PA',
    linkedin: 'linkedin.com/in/calebmorris',
  })}PROFESSIONAL SUMMARY
Healthcare BI analyst with three years building Tableau dashboards and recurring SQL reports for clinical operations. Solid translator between business questions and metrics; moderate depth in experimentation and product analytics.

PAGE 1 — EXPERIENCE

HEALTHBRIDGE — BI Analyst · Philadelphia · 2021–Present
• Maintains staffing and throughput dashboards for 12 hospital units; weekly SQL jobs in Snowflake.
• Partnered with operations leaders on ad-hoc analyses; introduced basic cohort views for readmission tracking.

PAGE 2 — EDUCATION & SKILLS

EDUCATION
Drexel University — B.S. Health Informatics, 2021

SKILLS
SQL, Tableau, Excel, Snowflake basics, requirements gathering${footer(['Open to remote analytics roles in SaaS or healthcare tech'])})`,

  'APP-MID-3003': `${header({
    name: 'Liam Torres',
    email: 'liam.torres@example.com',
    phone: '646-555-0303',
    location: 'Albany, NY',
    linkedin: 'linkedin.com/in/liamtorres',
  })}PROFESSIONAL SUMMARY
Reporting analyst at a regional nonprofit maintaining monthly spreadsheets and basic charts. Interested in growing SQL and product analytics skills.

PAGE 1 — EXPERIENCE

COMMUNITY IMPACT NONPROFIT — Reporting Analyst · 2022–Present
• Updates monthly donor and program spreadsheets; exports charts for board packets.
• Limited experience with modern BI stacks or experimentation frameworks.

EDUCATION
B.A. Economics, SUNY Albany, 2021${footer(['Motivated learner seeking mentorship in analytics career path'])})`,

  'APP-SNR-4001': `${header({
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '212-555-0401',
    location: 'New York, NY',
    linkedin: 'linkedin.com/in/priyasharma-pm',
  })}PROFESSIONAL SUMMARY
Senior product leader with seven years in B2B workflow SaaS. I own discovery-to-launch motions, pricing packaging, and cross-functional roadmaps. Grew attached ARR by $4.7M and improved net retention 9 points at BloomDesk.

PAGE 1 — EXPERIENCE

BLOOMDESK — Senior Product Manager · New York · 2021–Present
• Launched approvals automation and analytics modules adopted by 62% of enterprise accounts within two quarters.
• Ran quarterly roadmap council with sales, CS, and engineering; shipped phased compliance MVP saving $40K misallocated spend.
• Mentored two associate PMs; instituted PRD template and experiment readout ritual adopted org-wide.

FINTECH OPS — Business Analyst · 2019–2021
• Built lending operations dashboards and requirements for core banking integrations.

PAGE 2 — EDUCATION & SKILLS

EDUCATION
MBA coursework (evenings, incomplete) · B.S. Finance, Rutgers, 2019

PRODUCT SKILLS
Discovery, PRDs, Amplitude, SQL, Figma, Jira, GTM alignment, enterprise SaaS, API products${footer([
    'Seeking Senior PM role on hiring/workflow products · available in 4 weeks',
  ])}`,

  'APP-SNR-4002': `${header({
    name: 'Marcus Chen',
    email: 'marcus.chen@example.com',
    phone: '212-555-0402',
    location: 'Jersey City, NJ',
    linkedin: 'linkedin.com/in/marcuschen',
  })}PROFESSIONAL SUMMARY
Senior PM with nine years in SaaS, strong in platform analytics and enterprise integrations. MBA from Kellogg. Less recent hands-on discovery depth; heavier on roadmap maintenance and stakeholder management.

PAGE 1 — EXPERIENCE

VERTEX CLOUD — Senior Product Manager · 2018–Present
• Maintains enterprise analytics roadmap; coordinated API integration releases with three partner teams.
• Led rollout governance and executive QBR narratives; limited net-new 0-to-1 launches in past 18 months.

PAGE 2 — EDUCATION

Northwestern Kellogg — MBA, 2018
B.S. Computer Science, UIUC, 2012${footer(['Open to Senior PM opportunities in NYC metro'])})`,

  'APP-SNR-4003': `${header({
    name: 'Olivia Grant',
    email: 'olivia.grant@example.com',
    phone: '212-555-0403',
    location: 'Brooklyn, NY',
    linkedin: 'linkedin.com/in/olivagrant',
  })}PROFESSIONAL SUMMARY
Product manager with three years at early-stage startups. Experience writing tickets and attending stakeholder meetings; limited ownership of roadmap strategy, experimentation programs, or commercial outcomes.

PAGE 1 — EXPERIENCE

SPROUTLY — Product Manager · 2022–Present
• Manages backlog grooming and release communications; PM counterpart handles most discovery.
• Shipped minor UI improvements; no P&L or retention accountability on resume.

PING APP — Associate PM · 2020–2022
• Supported feature delivery for mobile notifications team.${footer(['Interested in growing into senior product responsibilities'])})`,

  'APP-STF-5001': `${header({
    name: 'Daniel Okafor',
    email: 'daniel.okafor@example.com',
    phone: '206-555-0501',
    location: 'Seattle, WA',
    linkedin: 'linkedin.com/in/danielokafor',
  })}PROFESSIONAL SUMMARY
Staff Data Engineer with ten years building event-driven platforms on Kafka, Spark, and Snowflake. Serves 45 product squads; reduced pipeline failures 63% and cut compute cost 27% via tiered storage and observability standards.

PAGE 1 — EXPERIENCE

HORIZON DATA — Staff Data Engineer · Seattle · 2019–Present
• Owns streaming ingestion architecture (Kafka → Flink → Snowflake) with 99.95% SLA and automated replay tooling.
• Led architecture guild; published data contract standards adopted by 38 teams.
• Mentored six senior engineers; instituted on-call runbooks reducing MTTR 44%.

CLOUDMETRICS — Senior Data Engineer · 2015–2019
• Built Airflow + dbt pipelines for product analytics; introduced data quality checks with Great Expectations.

PAGE 2 — SKILLS & EDUCATION

EDUCATION
University of Washington — B.S. Computer Engineering, 2014

SKILLS
Python, Scala, SQL, Kafka, Spark, Airflow, dbt, Snowflake, Terraform, data modeling, cost optimization${footer([
    'U.S. permanent resident · hybrid Seattle OK · references: Horizon VP Engineering',
  ])}`,

  'APP-STF-5002': `${header({
    name: 'Grace Kim',
    email: 'grace.kim@example.com',
    phone: '206-555-0502',
    location: 'Bellevue, WA',
    linkedin: 'linkedin.com/in/gracekim-de',
  })}PROFESSIONAL SUMMARY
Senior Data Engineer with six years in ad-tech and fintech. Strong builder of Airflow ETL and dbt models; collaborates with analytics on trusted metrics. Less experience leading multi-team platform architecture.

PAGE 1 — EXPERIENCE

ADPULSE — Senior Data Engineer · 2019–Present
• Maintains daily ETL jobs and dbt marts for marketing attribution; partners with analysts on metric definitions.
• Improved job retry logic; reduced failed runs 19% year over year.

PAGE 2 — SKILLS

Python, SQL, Airflow, dbt, AWS, Spark basics, Git${footer(['Seeking staff-track roles with architecture mentorship'])})`,

  'APP-STF-5003': `${header({
    name: 'Noah Bennett',
    email: 'noah.bennett@example.com',
    phone: '206-555-0503',
    location: 'Tacoma, WA',
    linkedin: 'linkedin.com/in/noahbennett',
  })}PROFESSIONAL SUMMARY
Data engineer with two years maintaining ETL scripts and troubleshooting dashboards. Comfortable with SQL; limited large-scale architecture or streaming experience.

PAGE 1 — EXPERIENCE

REGIONAL RETAIL CO — Data Engineer · 2022–Present
• Maintains nightly SQL extracts and fixes broken Tableau data sources.
• Assisted senior engineer on one-time migration project.

SKILLS
SQL, Python scripts, Tableau, basic Airflow DAG edits${footer(['Looking to grow platform engineering skills'])})`,

  'APP-DIR-6001': `${header({
    name: 'Vanessa Brooks',
    email: 'vanessa.brooks@example.com',
    phone: '415-555-0601',
    location: 'Oakland, CA',
    linkedin: 'linkedin.com/in/vanessabrooks-ta',
  })}PROFESSIONAL SUMMARY
Director of Talent Operations with twelve years scaling hiring systems in hypergrowth SaaS ($40M→$310M ARR). Built structured interviewing across 1,100 hires/year, cut time-to-fill 24%, and led Greenhouse migration with 98% adoption in six months.

PAGE 1 — EXPERIENCE

SCALEFORCE — Director, Talent Operations · San Francisco · 2019–Present
• Designed rubric-based interviewing program, interviewer certification, and audit sampling for compliance.
• Partnered with RevOps on hiring funnel analytics; reduced agency spend $1.2M annually.
• Led ATS migration workstream (Greenhouse), change management, and recruiter enablement.

ZENHIRE — Senior Manager, Recruiting Operations · 2015–2019
• Built SLA governance and capacity planning model for 40-person recruiting org.

PAGE 2 — EDUCATION & SKILLS

EDUCATION
UC Berkeley — B.A. Sociology, 2012 · SHRM-SCP (2020)

SKILLS
TA operations, ATS administration, process design, DEI partnerships, executive reporting, vendor management${footer([
    'Seeking Director+ role modernizing evidence-based hiring · Bay Area hybrid',
  ])}`,

  'APP-DIR-6002': `${header({
    name: 'Henry Walsh',
    email: 'henry.walsh@example.com',
    phone: '415-555-0602',
    location: 'San Jose, CA',
    linkedin: 'linkedin.com/in/henrywalsh',
  })}PROFESSIONAL SUMMARY
Senior Recruiting Operations Manager with eight years leading process redesign, SLA governance, and analytics for distributed recruiting teams. Built dashboard framework used by TA leadership and finance.

PAGE 1 — EXPERIENCE

NEXUS SOFTWARE — Senior Manager, Recruiting Operations · 2018–Present
• Implemented funnel dashboards in Looker; standardized stage definitions across US and EMEA.
• Ran quarterly process retros with recruiting managers; moderate enterprise ATS migration experience.

PAGE 2 — EDUCATION

San Jose State — B.S. Business Administration, 2016${footer(['Interested in Director-track talent operations roles'])})`,

  'APP-DIR-6003': `${header({
    name: 'Chloe Diaz',
    email: 'chloe.diaz@example.com',
    phone: '415-555-0603',
    location: 'Fremont, CA',
    linkedin: 'linkedin.com/in/chloediaz',
  })}PROFESSIONAL SUMMARY
Recruiting coordinator and operations specialist (three years). Strong scheduling and ATS hygiene; limited enterprise process ownership, analytics leadership, or cross-functional program design.

PAGE 1 — EXPERIENCE

LOCAL SAAS CO — Recruiting Coordinator · 2021–Present
• Schedules interviews, maintains Greenhouse stages, and supports onboarding paperwork.
• Assists recruiting ops lead with occasional reporting requests.

SKILLS
Greenhouse, Calendly, Excel, coordinator workflows${footer(['Aspiring to grow into recruiting operations management'])})}`,
};
