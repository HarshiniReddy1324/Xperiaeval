export const EMPTY_POSTING_FIELDS = {
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
  responsibilities: '',
  requiredQualifications: '',
  preferredQualifications: '',
  techStack: '',
  benefits: '',
  hiringProcess: '',
  equalOpportunity:
    'We are an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment for all employees.',
  recruiterName: '',
  recruiterEmail: '',
};

export function listToText(arr) {
  if (!arr) return '';
  if (Array.isArray(arr)) return arr.join('\n');
  return String(arr);
}

export function textToList(text) {
  if (!text) return [];
  return String(text)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}
