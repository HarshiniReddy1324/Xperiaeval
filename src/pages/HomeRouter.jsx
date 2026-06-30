import React from 'react';
import { useAuth } from '../context/AuthContext';
import { normalizeProductMode } from '../lib/productMode';
import { Dashboard } from './Dashboard';
import { IntelligenceDashboard } from './IntelligenceDashboard';

/** Route home dashboard by org product mode. */
export function HomeRouter() {
  const { user } = useAuth();
  const mode = normalizeProductMode(user?.productMode);
  if (mode === 'intelligence') return <IntelligenceDashboard />;
  return <Dashboard />;
}
