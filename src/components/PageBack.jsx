import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pageLabel, parentRoute } from '../lib/navigation';
import { positionFilterLabel } from '../lib/jobStages';
import { hasNonBucketFilters } from '../lib/candidateFilters';

export function PageBack({ fallback = '/', fallbackLabel = 'Dashboard', className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();

  const parent = parentRoute(location.pathname);
  const isNestedPage = parent && parent !== '/';
  const search = new URLSearchParams(location.search);
  const jobsLevel = location.pathname === '/jobs' ? search.get('level') : null;
  const jobsFilter = location.pathname === '/jobs' ? search.get('filter') : null;

  const candidatesBucket = location.pathname === '/candidates' ? search.get('bucket') : null;
  const rubricsSub = location.pathname.startsWith('/rubrics/');

  let label = isNestedPage ? pageLabel(parent) : fallbackLabel;
  if (jobsLevel) label = 'All levels';
  else if (jobsFilter) label = fallbackLabel;
  else if (candidatesBucket) label = 'All buckets';
  else if (rubricsSub) label = 'Screening';

  const handleBack = () => {
    if (location.pathname === '/candidates') {
      const candidatesBucket = search.get('bucket');
      if (candidatesBucket) {
        navigate('/candidates', { replace: true });
        return;
      }
      if (hasNonBucketFilters({
        jobId: search.get('jobId') || '',
        pipeline: search.get('pipeline') || '',
        screening: search.get('screening') || '',
        integrity: search.get('integrity') || '',
        hiddenGem: search.get('hiddenGem') || '',
      })) {
        navigate(fallback, { replace: true });
        return;
      }
      navigate(fallback);
      return;
    }
    if (location.pathname === '/jobs') {
      if (jobsLevel) {
        search.delete('level');
        const q = search.toString();
        navigate(q ? `/jobs?${q}` : '/jobs', { replace: true });
        return;
      }
      if (jobsFilter) {
        navigate(fallback, { replace: true });
        return;
      }
      navigate(fallback);
      return;
    }
    if (isNestedPage) {
      navigate(parent, { replace: true });
      return;
    }
    navigate(fallback);
  };

  const backTitle =
    jobsLevel && jobsFilter
      ? `Back to ${positionFilterLabel(jobsFilter)} (all levels)`
      : `Back to ${label}`;

  return (
    <button
      type="button"
      className={`pageBackBtn pageBackBtn--circle ${className}`.trim()}
      onClick={handleBack}
      aria-label={backTitle}
      title={backTitle}
    >
      <ArrowLeft size={16} aria-hidden />
    </button>
  );
}
