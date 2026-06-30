import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import { AuthLayout } from '../components/AuthLayout';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create workspace"
      lead="Start your 90-day pilot. The first user becomes Admin. Upgrade anytime from Settings."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form className="authForm" onSubmit={submit}>
        <div className="authField">
          <label htmlFor="reg-name">Your name</label>
          <input id="reg-name" value={form.name} onChange={update('name')} placeholder="Alex Rivera" required />
        </div>
        <div className="authField">
          <label htmlFor="reg-org">Organization</label>
          <input id="reg-org" value={form.orgName} onChange={update('orgName')} placeholder="Acme Inc" />
        </div>
        <div className="authField">
          <label htmlFor="reg-email">Work email</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            placeholder="you@company.com"
            required
          />
        </div>
        <div className="authField">
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            placeholder="At least 6 characters"
            required
            minLength={6}
          />
        </div>
        {error ? <p className="authError">{error}</p> : null}
        <Button type="submit" className="authSubmit" disabled={loading}>
          {loading ? 'Creating workspace…' : 'Start 90-day pilot'}
        </Button>
      </form>
    </AuthLayout>
  );
}
