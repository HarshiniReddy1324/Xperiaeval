import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
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
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || 'Hiring Manager';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNav = PORTAL_NAV.filter((item) => canAccess(role, item.path.split('?')[0]));

  return (
    <div className="portalApp">
      <aside className="portalSidebar">
        <div className="portalBrand">
          <div className="portalBrandLogo">
            <X size={18} />
          </div>
          <div>
            <b>XPERIEVAL</b>
            <span>Experience Evaluation</span>
          </div>
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
            <small>Valid until Dec 31, 2025</small>
            <NavLink to="/settings" className="portalPlanLink">
              Upgrade Plan
            </NavLink>
          </div>

          <div className="portalUser">
            <div className="portalAvatar">{initials(user?.name)}</div>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.role}</small>
            </div>
          </div>

          <button type="button" className="portalThemeBtn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>

          <button
            type="button"
            className="portalThemeBtn"
            onClick={handleLogout}
            style={{ marginTop: 6 }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <div className="portalMain">
        <div className="portalTopBar">
          <button type="button" className="portalAccountBtn" onClick={() => navigate('/settings')}>
            {initials(user?.name)}
          </button>
          <NotificationBell />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
