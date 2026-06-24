/**
 * Role-tier domain validation matrix — expandable checklists (100+ signals across tiers).
 * Returns the subset relevant to the job department / title.
 */

import { parseKeywords, keywordMatchScore } from './screening.js';

const MATRIX = {
  Engineering: {
    Entry: [
      'version_control_git',
      'basic_debugging',
      'unit_testing',
      'code_review_participation',
      'agile_ceremonies',
      'api_consumption',
      'sql_basics',
      'documentation',
    ],
    Mid: [
      'system_design_basics',
      'api_design',
      'ci_cd_pipelines',
      'observability_logging',
      'database_modeling',
      'cloud_services',
      'incident_debugging',
      'code_ownership',
      'security_basics',
      'performance_tuning',
    ],
    Senior: [
      'architecture_decisions',
      'distributed_systems',
      'scalability_patterns',
      'technical_mentorship',
      'production_incidents',
      'cross_team_design',
      'reliability_slo',
      'security_review',
      'cost_optimization',
      'technical_roadmap',
    ],
    Lead: [
      'engineering_strategy',
      'org_wide_standards',
      'hiring_bar',
      'budget_planning',
      'vendor_evaluation',
      'executive_communication',
    ],
  },
  Product: {
    Mid: [
      'roadmap_prioritization',
      'user_research',
      'metrics_definition',
      'stakeholder_alignment',
      'prd_authoring',
      'experimentation',
      'go_to_market',
    ],
    Senior: [
      'portfolio_strategy',
      'business_case',
      'pricing_positioning',
      'executive_presentations',
      'platform_thinking',
      'org_influence',
    ],
  },
  HR: {
    All: [
      'employee_relations',
      'policy_compliance',
      'recruiting_process',
      'onboarding_programs',
      'performance_cycles',
      'dei_initiatives',
      'hris_systems',
      'conflict_mediation',
    ],
  },
  Sales: {
    Mid: [
      'pipeline_management',
      'discovery_calls',
      'objection_handling',
      'crm_hygiene',
      'forecasting',
      'demo_delivery',
    ],
    Senior: [
      'enterprise_deals',
      'executive_selling',
      'team_coaching',
      'territory_planning',
      'contract_negotiation',
    ],
  },
  Operations: {
    Mid: [
      'process_improvement',
      'vendor_management',
      'sla_tracking',
      'inventory_planning',
      'kpi_dashboards',
      'cross_functional_ops',
    ],
  },
  General: {
    All: [
      'communication',
      'stakeholder_management',
      'problem_solving',
      'project_delivery',
      'data_literacy',
      'customer_focus',
      'adaptability',
      'ownership',
    ],
  },
};

const SIGNAL_PATTERNS = {
  version_control_git: /\b(git|github|gitlab|bitbucket|version control)\b/i,
  basic_debugging: /\b(debug|breakpoint|stack trace|logging)\b/i,
  unit_testing: /\b(unit test|jest|pytest|junit|test coverage)\b/i,
  system_design_basics: /\b(system design|microservice|load balanc|cache)\b/i,
  api_design: /\b(rest|graphql|api design|openapi|swagger)\b/i,
  ci_cd_pipelines: /\b(ci\/cd|jenkins|github actions|pipeline|deploy)\b/i,
  observability_logging: /\b(datadog|prometheus|grafana|observability|apm)\b/i,
  database_modeling: /\b(sql|postgres|mysql|schema|normaliz)\b/i,
  cloud_services: /\b(aws|azure|gcp|cloud|ec2|lambda|s3)\b/i,
  architecture_decisions: /\b(architecture|trade-?off|adr|design doc)\b/i,
  distributed_systems: /\b(distributed|kafka|redis|consistency|partition)\b/i,
  scalability_patterns: /\b(scale|sharding|replicat|horizontal)\b/i,
  technical_mentorship: /\b(mentor|coach|review|onboard)\b/i,
  production_incidents: /\b(incident|on-?call|postmortem|sev[0-9])\b/i,
  roadmap_prioritization: /\b(roadmap|priorit|backlog|rice|okr)\b/i,
  user_research: /\b(user research|interview|usability|persona)\b/i,
  metrics_definition: /\b(kpi|metric|north star|conversion)\b/i,
  employee_relations: /\b(employee relations|hr case|grievance)\b/i,
  recruiting_process: /\b(recruit|sourcing|interview|offer)\b/i,
  pipeline_management: /\b(pipeline|quota|forecast|crm)\b/i,
  discovery_calls: /\b(discovery|qualify|prospect|needs analysis)\b/i,
  process_improvement: /\b(process improvement|lean|six sigma|efficiency)\b/i,
  communication: /\b(communicat|present|stakeholder|write)\b/i,
  ownership: /\b(owned|led|delivered|shipped|accountable)\b/i,
};

function inferDepartment(jobTitle = '', team = '') {
  const t = `${jobTitle} ${team}`.toLowerCase();
  if (/engineer|developer|devops|sre|software|backend|frontend/.test(t)) return 'Engineering';
  if (/product|pm\b/.test(t)) return 'Product';
  if (/hr|human resources|people/.test(t)) return 'HR';
  if (/sales|account executive|ae\b|bdr|sdr/.test(t)) return 'Sales';
  if (/operations|ops\b|supply/.test(t)) return 'Operations';
  return 'General';
}

function inferTier(jobTitle = '', minYears = null) {
  const t = jobTitle.toLowerCase();
  if (/director|vp|chief|head of/.test(t)) return 'Lead';
  if (/senior|staff|principal|lead/.test(t)) return 'Senior';
  if (/junior|entry|intern|graduate/.test(t)) return 'Entry';
  if (minYears != null) {
    if (minYears >= 10) return 'Senior';
    if (minYears >= 5) return 'Mid';
    if (minYears <= 2) return 'Entry';
  }
  return 'Mid';
}

function humanizeSignal(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Run domain matrix against resume for the job context.
 */
export function runDomainValidationMatrix({ resumeText = '', jobTitle = '', team = '', minYears = null, jobKeywords = [] }) {
  const department = inferDepartment(jobTitle, team);
  const tier = inferTier(jobTitle, minYears);
  const deptMatrix = MATRIX[department] || MATRIX.General;
  const tierKeys = deptMatrix[tier] ? [tier] : deptMatrix.All ? ['All'] : Object.keys(deptMatrix);
  const signals = [...new Set(tierKeys.flatMap((k) => deptMatrix[k] || []))];

  const general = MATRIX.General.All || [];
  const allSignals = [...new Set([...signals, ...general])];

  const hits = [];
  const misses = [];
  for (const sig of allSignals) {
    const pattern = SIGNAL_PATTERNS[sig];
    const hit = pattern ? pattern.test(resumeText) : resumeText.toLowerCase().includes(sig.replace(/_/g, ' '));
    if (hit) hits.push(sig);
    else misses.push(sig);
  }

  const keywordScore = keywordMatchScore(resumeText, parseKeywords(jobKeywords));
  const coverage = allSignals.length ? Math.round((hits.length / allSignals.length) * 100) : keywordScore.score;

  return {
    department,
    tier,
    total_signals: allSignals.length,
    hits_count: hits.length,
    coverage_score: coverage,
    hits: hits.map(humanizeSignal),
    gaps: misses.slice(0, 8).map(humanizeSignal),
    matrix_version: 'domain-v1',
  };
}
