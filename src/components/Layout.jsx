import React, { useEffect, useState } from 'react';
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
import { NotificationBell } from './NotificationBell';

const PORTAL_NAV = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/' },
  { path: '/jobs', label: 'Positions', icon: Briefcase, match: (p) => p.startsWith('/jobs') },
  { path: '/candidates', label: 'Candidates', icon: Users, match: (p) => p.startsWith('/candidates') && !p.includes('integrity') },
  { path: '/rubrics', label: 'Screening', icon: ClipboardList, match: (p) => p.startsWith('/rubrics') },
  {
    path: '/candidates?pipeline=shortlisted_interview',
    label: 'Interviews',
    icon: Video,
    match: (p) => p.includes('pipeline=shortlisted'),
  },
  {
    path: '/candidates?integrity=flagged',
    label: 'Verification',
    icon: UserCheck,
    match: (p) => p.includes('integrity=flagged'),
  },
  { path: '/reports', label: 'Analytics', icon: BarChart3, match: (p) => p.startsWith('/reports') },
  { path: '/integrations', label: 'Integrations', icon: ShieldCheck, match: (p) => p.startsWith('/integrations') },
  { path: '/trash', label: 'Trash', icon: Trash2, match: (p) => p.startsWith('/trash') },
  { path: '/help', label: 'Help', icon: HelpCircle, match: (p) => p.startsWith('/help') },
  { path: '/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') },
];

function initials(name) {
  return (name || 'U')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function navActive(match, pathname, search) {
  const full = pathname + search;
  if (match(pathname) || match(full)) return true;
  return false;
}

export function Layout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || 'Hiring Manager';
  const [navOpen, setNavOpen] = useState(false);

  const filterNav = (items) => items.filter((item) => canAccess(role, item.path.split('?')[0]));
  const visibleNav = filterNav(PORTAL_NAV);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="portalApp">
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
      <aside className={`portalSidebar${navOpen ? ' open' : ''}`} aria-label="Sidebar">
        <div className="portalBrand">
          <div className="portalBrandLogo">
            <X size={18} />
          </div>
          <div>
            <b>XPERIEVAL</b>
            <span>Experience Evaluation</span>
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
            {visibleNav.map(({ path, label, icon: Icon, match }) => {
              const active = navActive(match, location.pathname, location.search);
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={active ? 'active' : ''}
                  end={path === '/'}
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="portalSidebarBottom">
          <div className="portalPlan">
            <label>Plan</label>
            <strong>Enterprise</strong>
            <small>Full platform access</small>
            <NavLink to="/settings" className="portalPlanLink">
              Account settings
            </NavLink>
          </div>

          <div className="portalUser">
            <div className="portalAvatar">{initials(user?.name)}</div>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.role}</small>
            </div>
          </div>

          <button type="button" className="portalThemeBtn" onClick={toggleTheme} aria-label="Toggle color theme">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </aside>

      <div className="portalMain">
        <div className="portalTopBar">
          <button
            type="button"
            className="portalMenuBtn"
            aria-label="Open navigation menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <Menu size={20} />
          </button>
          <button
            type="button"
            className="portalAccountBtn"
            aria-label="Open account settings"
            onClick={() => navigate('/settings')}
          >
            {initials(user?.name)}
          </button>
          <NotificationBell />
        </div>
        <main id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
