import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasHiringFeatures, hasIntelligenceFeatures } from '../lib/productMode';

export function HiringRoute({ children }) {
  const { user } = useAuth();
  if (!hasHiringFeatures(user?.productMode)) return <Navigate to="/dashboard" replace />;
  return children;
}

export function IntelligenceRoute({ children }) {
  const { user } = useAuth();
  if (!hasIntelligenceFeatures(user?.productMode)) return <Navigate to="/dashboard" replace />;
  return children;
}
