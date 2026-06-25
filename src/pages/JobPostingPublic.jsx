import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import '../job-posting.css';
import { JobHeader } from '../components/jobPosting/JobHeader';
import { CompanyInfo } from '../components/jobPosting/CompanyInfo';
import { JobDetails } from '../components/jobPosting/JobDetails';
import { QualificationSection } from '../components/jobPosting/QualificationSection';
import { BenefitsSection } from '../components/jobPosting/BenefitsSection';
import { ApplySidebar } from '../components/jobPosting/ApplySidebar';
import { sampleJobPosting } from '../data/sampleJobPosting';
import { apiUrl } from '../api/base.js';

export function JobPostingPublic() {
  const { slug } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl(`/api/public/careers/${slug}`))
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setJob(d);
        setError('');
      })
      .catch((e) => {
        setError(e.message);
        if (slug?.includes('sample')) setJob(sampleJobPosting);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="jp-page jp-loading publicPortal">
        <Loader2 size={32} className="spin" />
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="jp-page jp-error publicPortal">
        <AlertCircle size={40} style={{ color: '#ef4444' }} />
        <p>{error}</p>
        <Link to={`/careers/${slug || 'sample'}`}>Try again</Link>
      </div>
    );
  }

  const posting = job.posting || {};
  const applyUrl = job.applyUrl || `/apply/${job.slug}`;

  return (
    <div className="jp-page publicPortal">
      <nav className="jp-nav">
        <div className="jp-navInner">
          <div className="jp-brand">
            <Sparkles size={20} />
            {job.orgName || posting.companyName}
          </div>
          <a href={applyUrl} className="jp-mobileApply">
            Apply
          </a>
        </div>
      </nav>
      <main className="jp-main">
        <div className="jp-grid">
          <div className="jp-stack">
            <JobHeader job={job} posting={posting} />
            <CompanyInfo posting={posting} />
            <JobDetails posting={posting} />
            <QualificationSection posting={posting} />
            <BenefitsSection posting={posting} />
          </div>
          <ApplySidebar job={job} posting={posting} applyUrl={applyUrl} />
        </div>
      </main>
    </div>
  );
}
