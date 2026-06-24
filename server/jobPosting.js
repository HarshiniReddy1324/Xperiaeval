/** Rich ATS job posting payload stored in jobs.posting_json */

export const EMPTY_POSTING = {
  companyName: '',
  companyLogo: '',
  employmentType: 'Full-time',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'USD',
  visaSponsorship: 'Not specified',
  department: '',
  aboutCompany: '',
  summary: '',
  responsibilities: [],
  requiredQualifications: [],
  preferredQualifications: [],
  techStack: [],
  benefits: [],
  hiringProcess: [],
  equalOpportunity:
    'We are an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment for all employees.',
  recruiterName: '',
  recruiterEmail: '',
};

export function parsePostingJson(raw) {
  if (!raw) return { ...EMPTY_POSTING };
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { ...EMPTY_POSTING, ...p };
  } catch {
    return { ...EMPTY_POSTING };
  }
}

export function normalizeListField(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function serializePosting(body) {
  const p = body.posting || body;
  return {
    ...EMPTY_POSTING,
    companyName: p.companyName || body.companyName || '',
    companyLogo: p.companyLogo || '',
    employmentType: p.employmentType || 'Full-time',
    salaryMin: p.salaryMin ?? '',
    salaryMax: p.salaryMax ?? '',
    salaryCurrency: p.salaryCurrency || 'USD',
    visaSponsorship: p.visaSponsorship || 'Not specified',
    department: p.department || body.team || '',
    aboutCompany: p.aboutCompany || '',
    summary: p.summary || body.description || '',
    responsibilities: normalizeListField(p.responsibilities),
    requiredQualifications: normalizeListField(p.requiredQualifications),
    preferredQualifications: normalizeListField(p.preferredQualifications),
    techStack: normalizeListField(p.techStack),
    benefits: normalizeListField(p.benefits),
    hiringProcess: normalizeListField(p.hiringProcess),
    equalOpportunity: p.equalOpportunity || EMPTY_POSTING.equalOpportunity,
    recruiterName: p.recruiterName || '',
    recruiterEmail: p.recruiterEmail || '',
  };
}

export function buildPublicJobPayload(job, org, baseUrl = 'http://localhost:5173') {
  const posting = parsePostingJson(job.posting_json);
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    location: job.location,
    team: job.team,
    department: posting.department || job.team,
    stage: job.stage,
    created_at: job.created_at,
    orgName: org?.name || posting.companyName,
    applyUrl: `${baseUrl}/apply/${job.slug}`,
    careersUrl: `${baseUrl}/careers/${job.slug}`,
    posting,
  };
}
