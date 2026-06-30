import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { HiringRoute, IntelligenceRoute } from './components/ProductModeRoute';
import { HomeRouter } from './pages/HomeRouter';
import { EmbedApply } from './pages/EmbedApply';
import { Jobs } from './pages/Jobs';
import { JobDetail } from './pages/JobDetail';
import { JobForm } from './pages/JobForm';
import { JobPostingPublic } from './pages/JobPostingPublic';
import { Candidates } from './pages/Candidates';
import { CandidateDetail } from './pages/CandidateDetail';
import { Rubrics } from './pages/Rubrics';
import { RubricBuilder } from './pages/RubricBuilder';
import { RubricTemplates } from './pages/RubricTemplates';
import { RubricTemplateDetail } from './pages/RubricTemplateDetail';
import { RubricLibrary } from './pages/RubricLibrary';
import { RubricJobs } from './pages/RubricJobs';
import { Audit } from './pages/Audit';
import { Apply } from './pages/Apply';
import { CandidateSchedule } from './pages/CandidateSchedule';
import { Settings } from './pages/Settings';
import { Access } from './pages/Access';
import { Reports } from './pages/Reports';
import { RecruiterPerformance } from './pages/RecruiterPerformance';
import { Help } from './pages/Help';
import { Integrations } from './pages/Integrations';
import { Trash } from './pages/Trash';
import { CandidateCompare } from './pages/CandidateCompare';
import { CandidateScorecard } from './pages/CandidateScorecard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Landing } from './pages/Landing';
import { NotFound } from './pages/NotFound';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="authPage">Loading workspace…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicAuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="authPage">Loading…</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function H({ children }) {
  return <HiringRoute>{children}</HiringRoute>;
}

function I({ children }) {
  return <IntelligenceRoute>{children}</IntelligenceRoute>;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicAuthRoute>
                <Login />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicAuthRoute>
                <Register />
              </PublicAuthRoute>
            }
          />
          <Route path="/" element={<Landing />} />
          <Route path="/apply/:slug" element={<Apply />} />
          <Route path="/embed/apply/:slug" element={<EmbedApply />} />
          <Route path="/careers/:slug" element={<JobPostingPublic />} />
          <Route path="/schedule/:token" element={<CandidateSchedule />} />
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="dashboard" element={<HomeRouter />} />
            <Route path="jobs" element={<H><Jobs /></H>} />
            <Route path="jobs/new" element={<H><JobForm /></H>} />
            <Route path="jobs/:id/edit" element={<H><JobForm /></H>} />
            <Route path="jobs/:id" element={<H><JobDetail /></H>} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="candidates/compare" element={<CandidateCompare />} />
            <Route path="candidates/:id/scorecard" element={<CandidateScorecard />} />
            <Route path="candidates/:id/:section" element={<CandidateDetail />} />
            <Route path="candidates/:id" element={<CandidateDetail />} />
            <Route path="trash" element={<H><Trash /></H>} />
            <Route path="rubrics" element={<H><Rubrics /></H>} />
            <Route path="rubrics/new" element={<H><RubricBuilder /></H>} />
            <Route path="rubrics/templates" element={<H><RubricTemplates /></H>} />
            <Route path="rubrics/templates/:id" element={<H><RubricTemplateDetail /></H>} />
            <Route path="rubrics/library" element={<H><RubricLibrary /></H>} />
            <Route path="rubrics/jobs" element={<H><RubricJobs /></H>} />
            <Route path="audit" element={<Audit />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/:section" element={<Reports />} />
            <Route path="recruiter-performance" element={<H><RecruiterPerformance /></H>} />
            <Route path="integrations" element={<I><Integrations /></I>} />
            <Route path="access" element={<Access />} />
            <Route path="help" element={<Help />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/:section" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
