import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import { AuthLayout } from '../components/AuthLayout';

const DEMO_ACCOUNTS = [
  { email: 'demo@xperieval.com', role: 'Admin' },
  { email: 'hiring@xperieval.com', role: 'Hiring Manager' },
  { email: 'recruiter@xperieval.com', role: 'Recruiter' },
  { email: 'auditor@xperieval.com', role: 'Compliance Auditor' },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (accountEmail) => {
    setEmail(accountEmail);
    setPassword('demo1234');
    setError('');
    setLoading(true);
    try {
      await login(accountEmail, 'demo1234');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      lead="Use the email and password assigned to your role."
      footer={
        <>
          New workspace? <Link to="/register">Create account</Link>
          <span className="authFooterSep"> · </span>
          <Link to="/">About Xperieval</Link>
        </>
      }
    >
      <form className="authForm" onSubmit={submit}>
        <div className="authField">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <div className="authField">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
        {error ? <p className="authError">{error}</p> : null}
        <Button type="submit" className="authSubmit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <details className="authDemo">
        <summary>Try a demo account</summary>
        {import.meta.env.DEV && (
          <p className="authDemoHint">Demo accounts use the local seed password configured for this environment.</p>
        )}
        <div className="authDemoGrid">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              className="authDemoTile"
              onClick={() => quickLogin(a.email)}
              disabled={loading}
            >
              <strong>{a.role}</strong>
              <small>{a.email}</small>
            </button>
          ))}
        </div>
      </details>
    </AuthLayout>
  );
}
