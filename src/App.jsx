import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Jobs } from './pages/Jobs';
import { JobDetail } from './pages/JobDetail';
import { JobForm } from './pages/JobForm';
import { JobPostingPublic } from './pages/JobPostingPublic';
import { Candidates } from './pages/Candidates';
import { CandidateDetail } from './pages/CandidateDetail';
import { Rubrics } from './pages/Rubrics';
import { Audit } from './pages/Audit';
import { Apply } from './pages/Apply';
import { CandidateSchedule } from './pages/CandidateSchedule';
import { Settings } from './pages/Settings';
import { Access } from './pages/Access';
import { Reports } from './pages/Reports';
import { Help } from './pages/Help';
import { Integrations } from './pages/Integrations';
import { Trash } from './pages/Trash';
import { CandidateCompare } from './pages/CandidateCompare';
import { CandidateScorecard } from './pages/CandidateScorecard';

function PrivateRoute({ children }) {
  const { user, loading, authError } = useAuth();
  if (loading) return <div className="authPage">Loading workspace…</div>;
  if (!user) {
    return (
      <div className="authPage">
        <div className="authCard card">
          <h1>Unable to load workspace</h1>
          <p className="error">{authError || 'Check that the API is running and reachable.'}</p>
        </div>
      </div>
    );
  }
  return children;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/apply/:slug" element={<Apply />} />
          <Route path="/careers/:slug" element={<JobPostingPublic />} />
          <Route path="/schedule/:token" element={<CandidateSchedule />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/new" element={<JobForm />} />
            <Route path="jobs/:id/edit" element={<JobForm />} />
            <Route path="jobs/:id" element={<JobDetail />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="candidates/compare" element={<CandidateCompare />} />
            <Route path="candidates/:id/scorecard" element={<CandidateScorecard />} />
            <Route path="candidates/:id" element={<CandidateDetail />} />
            <Route path="trash" element={<Trash />} />
            <Route path="rubrics" element={<Rubrics />} />
            <Route path="audit" element={<Audit />} />
            <Route path="reports" element={<Reports />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="access" element={<Access />} />
            <Route path="help" element={<Help />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
