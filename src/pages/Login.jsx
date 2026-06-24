import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';

const DEMO_ACCOUNTS = [
  { email: 'demo@xperieval.com', role: 'Admin' },
  { email: 'hiring@xperieval.com', role: 'Hiring Manager' },
  { email: 'recruiter@xperieval.com', role: 'Recruiter' },
  { email: 'auditor@xperieval.com', role: 'Compliance Auditor' },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@xperieval.com');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
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
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage">
      <div className="authCard wide">
        <div className="brand center">
          <div className="logo">
            <Sparkles size={24} />
          </div>
          <div>
            <b>Xperieval</b>
            <span>Experience Evaluation Portal</span>
          </div>
        </div>
        <h1>Sign in</h1>
        <p className="muted">Your role is tied to your account — sign in with the email assigned to your role.</p>
        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="error">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <div className="demoAccounts">
          <p className="muted">Demo accounts (password: demo1234)</p>
          <div className="demoGrid">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} type="button" className="demoBtn" onClick={() => quickLogin(a.email)} disabled={loading}>
                <strong>{a.role}</strong>
                <small>{a.email}</small>
              </button>
            ))}
          </div>
        </div>
        <p className="authFooter">
          New workspace? <Link to="/register">Create account</Link> (first user becomes Admin)
        </p>
      </div>
    </div>
  );
}
