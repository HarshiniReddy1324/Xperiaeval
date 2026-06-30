/** Who sees Integrations nav, which tabs, and what they can configure. */

export function canAccessIntegrations(user) {
  return ['Admin', 'Recruiter'].includes(user?.role || '');
}

export function canManageIntegrations(user) {
  return canAccessIntegrations(user);
}

export function isUpgradeIntegrationsBlocked(user) {
  const pilot = user?.pilot;
  if (!pilot?.is_pilot) return false;
  return !pilot.features?.integrations || !pilot.features?.api_keys;
}

export function integrationAccess(user) {
  const role = user?.role || '';
  const isAdmin = role === 'Admin';
  const isRecruiter = role === 'Recruiter';
  const upgradeBlocked = isUpgradeIntegrationsBlocked(user);

  const tabs = [{ id: 'workflow', label: 'Jira' }];

  if (!upgradeBlocked) {
    tabs.push({ id: 'ats', label: 'ATS' });
    tabs.push({ id: 'api', label: 'Evaluate API' });
  }

  tabs.push({ id: 'activity', label: 'Activity' });

  return {
    tabs,
    upgradeBlocked,
    canManage: isAdmin || isRecruiter,
    canCreateAts: isAdmin,
    canConfigureApiKeys: isAdmin || isRecruiter,
    isAdmin,
    isRecruiter,
  };
}

export function normalizeIntegrationTab(tabId, access) {
  const allowed = access.tabs.map((t) => t.id);
  if (allowed.includes(tabId)) return tabId;
  return 'workflow';
}
