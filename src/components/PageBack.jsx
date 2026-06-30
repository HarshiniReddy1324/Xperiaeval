import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeNavLabel } from '../lib/productMode';
import { pageLabel, parentRoute, candidatesListReturnPath, isCandidateSectionPath, isCandidateHubPath } from '../lib/navigation';
import { positionFilterLabel } from '../lib/jobStages';
import { hasNonBucketFilters } from '../lib/candidateFilters';

function resolveBackTarget(location, fallback) {
  const stateFrom = location.state?.from;
  if (stateFrom && typeof stateFrom === 'string' && stateFrom.startsWith('/') && !stateFrom.startsWith('//')) {
    return stateFrom;
  }
  return parentRoute(location.pathname) || fallback;
}

export function PageBack({ fallback = '/dashboard', fallbackLabel, className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const homeLabel = fallbackLabel ?? homeNavLabel(user?.productMode);

  const parent = parentRoute(location.pathname);
  const isNestedPage = parent && parent !== '/';
  const search = new URLSearchParams(location.search);
  const jobsLevel = location.pathname === '/jobs' ? search.get('level') : null;
  const jobsFilter = location.pathname === '/jobs' ? search.get('filter') : null;

  const candidatesBucket = location.pathname === '/candidates' ? search.get('bucket') : null;
  const rubricsSub = location.pathname.startsWith('/rubrics/');

  const returnLabel = location.state?.fromLabel;

  let label = isNestedPage ? pageLabel(parent) : homeLabel;
  if (returnLabel) label = returnLabel;
  else if (jobsLevel) label = 'All levels';
  else if (jobsFilter) label = homeLabel;
  else if (candidatesBucket) label = 'All buckets';
  else if (rubricsSub) label = 'Screening';

  const handleBack = () => {
    if (isCandidateSectionPath(location.pathname)) {
      const id = location.pathname.match(/^\/candidates\/([^/]+)\//)[1];
      navigate(`/candidates/${id}`, { state: location.state, replace: true });
      return;
    }
    const scorecardMatch = location.pathname.match(/^\/candidates\/([^/]+)\/scorecard$/);
    if (scorecardMatch) {
      navigate(`/candidates/${scorecardMatch[1]}`, { state: location.state, replace: true });
      return;
    }
    if (isCandidateHubPath(location.pathname) || location.pathname === '/candidates/compare') {
      navigate(candidatesListReturnPath(location.state), { replace: true });
      return;
    }
    if (location.pathname === '/candidates') {
      if (candidatesBucket) {
        navigate('/candidates', { replace: true });
        return;
      }
      navigate(resolveBackTarget(location, fallback), { replace: true });
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
        navigate(resolveBackTarget(location, fallback), { replace: true });
        return;
      }
      navigate(resolveBackTarget(location, fallback), { replace: true });
      return;
    }
    if (isNestedPage) {
      navigate(parent, { replace: true });
      return;
    }
    navigate(resolveBackTarget(location, fallback), { replace: true });
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
