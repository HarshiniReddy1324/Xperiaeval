import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import { AuthLayout } from '../components/AuthLayout';

export function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await register(form);
      if (res?.pending) {
        setSubmitted(res);
        return;
      }
      window.location.assign('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout
        title="Request received"
        lead="Your pilot workspace is pending approval."
        backTo="/"
        backLabel="Back to website"
        footer={
          <>
            Already approved? <Link to="/login">Sign in</Link>
          </>
        }
      >
        <div className="authSuccessPanel">
          <p>
            We received your request for <strong>{submitted.org_name}</strong>. Our team will review it and email{' '}
            <strong>{submitted.email}</strong> when your workspace is ready.
          </p>
          <p className="muted">You will not be able to sign in until approval is complete.</p>
          <Link to="/" className="authInlineLink">
            Return to website
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Request a pilot workspace"
      lead="Submit your details for review. After we approve your request, you can sign in and start your 90-day pilot as workspace Admin."
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
          <input id="reg-org" value={form.orgName} onChange={update('orgName')} placeholder="Acme Inc" required />
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
          {loading ? 'Submitting request…' : 'Request 90-day pilot'}
        </Button>
      </form>
    </AuthLayout>
  );
}
