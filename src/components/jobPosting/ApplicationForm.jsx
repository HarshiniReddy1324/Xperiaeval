import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

/**
 * Optional quick-apply on careers page: full screening lives at /apply/:slug
 */
export function ApplicationForm({ applyUrl, onApplyClick }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    if (onApplyClick) onApplyClick();
    else if (applyUrl) window.location.href = applyUrl;
    setTimeout(() => setSubmitting(false), 400);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Continue to our full application with screening questions and resume upload.
      </p>
      <label className="block text-xs font-semibold text-slate-500">Full name</label>
      <input
        required
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        placeholder="Jane Doe"
        onFocus={() => {}}
      />
      <label className="block text-xs font-semibold text-slate-500">Email</label>
      <input
        type="email"
        required
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        placeholder="you@email.com"
      />
      <label className="block text-xs font-semibold text-slate-500">Phone</label>
      <input
        type="tel"
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        placeholder="+1 (555) 000-0000"
      />
      <label className="block text-xs font-semibold text-slate-500">LinkedIn URL</label>
      <input
        type="url"
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        placeholder="https://linkedin.com/in/..."
      />
      <label className="block text-xs font-semibold text-slate-500">Portfolio / GitHub</label>
      <input
        type="url"
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        placeholder="https://github.com/..."
      />
      <label className="block text-xs font-semibold text-slate-500">Resume</label>
      <input type="file" accept=".pdf,.doc,.docx,.txt" className="w-full text-sm text-slate-600" />
      <label className="block text-xs font-semibold text-slate-500">Cover letter (optional)</label>
      <textarea rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        Continue to full application
      </button>
    </form>
  );
}
