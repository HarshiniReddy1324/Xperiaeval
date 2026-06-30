import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Moon,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Trash2,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { canAccess } from '../lib/roles';
import { filterNavByProductMode, PRODUCT_LABELS, PRODUCT_SUBTITLES, normalizeProductMode, homeNavLabel, hasHiringFeatures, hasIntelligenceFeatures } from '../lib/productMode';
import { isCandidateHubPath, isCandidateSectionPath } from '../lib/navigation';
import { NotificationBell } from './NotificationBell';
import { DashboardDatePicker } from './DashboardDatePicker';
import { PageBack } from './PageBack';

const PORTAL_NAV_BASE = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/' || p === '' },
  { path: '/jobs', label: 'Positions', icon: Briefcase, match: (p) => p.startsWith('/jobs') },
  {
    path: '/candidates?pipeline=shortlisted_interview',
    label: 'Interviews',
    icon: Video,
    match: (p) => p.includes('pipeline=shortlisted'),
  },
  {
    path: '/candidates?integrity=flagged',
    label: 'Experience Verification',
    icon: UserCheck,
    match: (p) => p.includes('integrity=flagged'),
  },
  {
    path: '/candidates',
    label: 'Candidates',
    icon: Users,
    match: (p) => {
      if (!p.startsWith('/candidates')) return false;
      if (p.includes('integrity=flagged')) return false;
      if (p.includes('pipeline=shortlisted')) return false;
      return true;
    },
  },
  { path: '/rubrics', label: 'Screening', icon: ClipboardList, match: (p) => p.startsWith('/rubrics') },
  { path: '/reports', label: 'Analytics', icon: BarChart3, match: (p) => p.startsWith('/reports') },
  { path: '/audit', label: 'Audit log', icon: Shield, match: (p) => p.startsWith('/audit') },
  { path: '/integrations', label: 'Integrations', icon: ShieldCheck, match: (p) => p.startsWith('/integrations') },
  { path: '/trash', label: 'Trash', icon: Trash2, match: (p) => p.startsWith('/trash') },
  { path: '/help', label: 'Help', icon: HelpCircle, match: (p) => p.startsWith('/help') },
  { path: '/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') },
];

function buildPortalNav(productMode, role) {
  const homeLabel = homeNavLabel(productMode);
  const items = PORTAL_NAV_BASE.map((item) =>
    item.path === '/' ? { ...item, label: homeLabel } : item,
  );
  if (role === 'Admin' || role === 'Compliance Auditor') {
    items.splice(items.length - 2, 0, {
      path: '/access',
      label: 'Team access',
      icon: Users,
      match: (p) => p.startsWith('/access'),
    });
  }
  return items;
}

function resolveActiveNav(pathname, search, items) {
  const full = pathname + search;
  const matched = items.filter((item) => item.match(full));
  if (matched.length <= 1) return matched[0]?.path ?? null;
  const sorted = [...matched].sort((a, b) => {
    const aHasQuery = a.path.includes('?') ? 1 : 0;
    const bHasQuery = b.path.includes('?') ? 1 : 0;
    if (bHasQuery !== aHasQuery) return bHasQuery - aHasQuery;
    return b.path.length - a.path.length;
  });
  return sorted[0]?.path ?? null;
}

function initials(name) {
  return (name || 'U')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Layout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || 'Hiring Manager';
  const productMode = normalizeProductMode(user?.productMode);
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('xperieval_sidebar_collapsed') === '1',
  );
  const [dashDateRange, setDashDateRange] = useState('30d');
  const isDashboard = location.pathname === '/';
  const hideGlobalPageBack =
    isCandidateHubPath(location.pathname) || isCandidateSectionPath(location.pathname);
  const brandSubtitle = PRODUCT_SUBTITLES[productMode] || PRODUCT_SUBTITLES.both;
  const dashboardTitle = productMode === 'intelligence' ? 'Intelligence' : 'Dashboard';
  const dashboardSubtitle =
    productMode === 'intelligence'
      ? 'ATS connectivity, candidate evaluation, and score writeback.'
      : productMode === 'hiring'
        ? 'Open roles, pipeline progress, and candidate activity.'
        : 'Hiring operations and experience intelligence in one workspace.';

  const outletContext = useMemo(
    () => ({ dashDateRange, setDashDateRange }),
    [dashDateRange],
  );

  const filterNav = (items) =>
    filterNavByProductMode(
      items.filter((item) => canAccess(role, item.path.split('?')[0])),
      productMode,
    );
  const portalNav = useMemo(() => buildPortalNav(productMode, role), [productMode, role]);
  const visibleNav = filterNav(portalNav);
  const activeNavPath = resolveActiveNav(location.pathname, location.search, visibleNav);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname, location.search]);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 700) {
      setNavOpen((v) => !v);
      return;
    }
    setSidebarCollapsed((v) => {
      const next = !v;
      localStorage.setItem('xperieval_sidebar_collapsed', next ? '1' : '0');
      return next;
    });
  };

  useEffect(() => {
    const p = location.pathname;
    if (
      !hasHiringFeatures(productMode) &&
      (p.startsWith('/jobs') || p.startsWith('/rubrics') || p === '/trash' || p.startsWith('/recruiter-performance'))
    ) {
      navigate('/', { replace: true });
    }
    if (!hasIntelligenceFeatures(productMode) && p.startsWith('/integrations')) {
      navigate('/', { replace: true });
    }
  }, [productMode, location.pathname, navigate]);

  return (
    <div className={`portalApp${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <a href="#main-content" className="skipLink">
        Skip to main content
      </a>
      {navOpen && (
        <button
          type="button"
          className="portalNavBackdrop"
          aria-label="Close navigation menu"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        className={`portalSidebar${navOpen ? ' open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}
        aria-label="Sidebar"
      >
        <div className="portalBrand">
          <div className="portalBrandLogo">
            <X size={18} />
          </div>
          <div className="portalBrandText">
            <b>XPERIEVAL</b>
            <span>{brandSubtitle}</span>
          </div>
          <button
            type="button"
            className="portalNavClose"
            aria-label="Close navigation menu"
            onClick={() => setNavOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="portalNavWrap">
          <nav className="portalNav" aria-label="Main navigation">
            {visibleNav.map(({ path, label, icon: Icon }) => {
              const active = activeNavPath === path;
              return (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  className={() => (active ? 'active' : '')}
                  activeClassName=""
                  aria-current={active ? 'page' : undefined}
                  title={label}
                >
                  <Icon size={17} />
                  <span className="navLabel">{label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="portalSidebarBottom">
          <div className="portalPlan">
            <label>Product</label>
            <strong>{PRODUCT_LABELS[productMode]}</strong>
            <small>
              {productMode === 'both'
                ? 'Full platform access'
                : role === 'Admin' || role === 'Recruiter'
                  ? 'Configured in Settings'
                  : 'Ask your admin to change product'}
            </small>
            {(role === 'Admin' || role === 'Recruiter') && (
            <NavLink to="/settings" className="portalPlanLink">
              Account settings
            </NavLink>
            )}
          </div>

          <div className="portalUser">
            <div className="portalAvatar">{initials(user?.name)}</div>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.role}</small>
            </div>
          </div>

          <button type="button" className="portalThemeBtn" onClick={toggleTheme} aria-label="Toggle color theme" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span className="navLabel">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </aside>

      <div className="portalMain">
        <div className={`portalTopBar${isDashboard ? ' portalTopBar--withTitle' : ''}`}>
          <button
            type="button"
            className="portalMenuBtn"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed || navOpen}
            onClick={toggleSidebar}
          >
            <Menu size={20} />
          </button>
          {isDashboard && (
            <div className="portalTopBarTitle">
              <h1>{dashboardTitle}</h1>
              <p>{dashboardSubtitle}</p>
            </div>
          )}
          <div className="portalTopBarActions">
            {isDashboard && productMode !== 'intelligence' && (
              <DashboardDatePicker value={dashDateRange} onChange={setDashDateRange} />
            )}
            <NotificationBell />
            <button
              type="button"
              className="portalAccountBtn"
              aria-label="Open account settings"
              onClick={() => navigate('/settings')}
            >
              {initials(user?.name)}
            </button>
          </div>
        </div>
        <main id="main-content">
          {!isDashboard && !hideGlobalPageBack && (
            <div className="pageBackBar">
              <PageBack />
            </div>
          )}
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
