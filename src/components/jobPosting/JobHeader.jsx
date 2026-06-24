import React from 'react';
import { MapPin, Briefcase, DollarSign, Globe, Calendar, Building2 } from 'lucide-react';

function formatSalary(posting) {
  const { salaryMin, salaryMax, salaryCurrency } = posting || {};
  if (!salaryMin && !salaryMax) return null;
  const cur = salaryCurrency || 'USD';
  if (salaryMin && salaryMax) return `${cur} ${Number(salaryMin).toLocaleString()} – ${Number(salaryMax).toLocaleString()}`;
  if (salaryMin) return `From ${cur} ${Number(salaryMin).toLocaleString()}`;
  return `Up to ${cur} ${Number(salaryMax).toLocaleString()}`;
}

export function JobHeader({ job, posting }) {
  const salary = formatSalary(posting);
  const posted = job?.created_at
    ? new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <header className="jp-card jp-header">
      <div className="jp-headerTop">
        {posting?.companyLogo ? (
          <img src={posting.companyLogo} alt="" className="jp-logo" style={{ objectFit: 'cover' }} />
        ) : (
          <div className="jp-logo">{(posting?.companyName || job?.orgName || 'Co').slice(0, 2).toUpperCase()}</div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="jp-company">{posting?.companyName || job?.orgName}</p>
          <h1>{job?.title}</h1>
          <div className="jp-tags">
            {job?.location && (
              <span className="jp-tag">
                <MapPin size={14} /> {job.location}
              </span>
            )}
            {posting?.employmentType && (
              <span className="jp-tag">
                <Briefcase size={14} /> {posting.employmentType}
              </span>
            )}
            {salary && (
              <span className="jp-tag green">
                <DollarSign size={14} /> {salary}
              </span>
            )}
            {posting?.visaSponsorship && (
              <span className="jp-tag blue">
                <Globe size={14} /> {posting.visaSponsorship}
              </span>
            )}
            {posted && (
              <span className="jp-tag">
                <Calendar size={14} /> Posted {posted}
              </span>
            )}
            {(posting?.department || job?.team) && (
              <span className="jp-tag">
                <Building2 size={14} /> {posting?.department || job?.team}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
