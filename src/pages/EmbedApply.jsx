import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Apply } from './Apply';
import { apiUrl } from '../api/base.js';

/** Minimal-chrome apply flow for ATS embeds and iframe widgets. */
export function EmbedApply() {
  const { slug } = useParams();
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(apiUrl(`/api/public/embed-config/${slug}`))
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Embed not available');
        setConfig(d);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) {
    return (
      <div className="embedApplyPage">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="embedApplyPage">
      {config && (
        <header className="embedApplyHeader">
          <span>{config.orgName}</span>
          <strong>{config.job?.title}</strong>
        </header>
      )}
      <Apply />
    </div>
  );
}
