import React, { useState } from 'react';
import { Button } from '../ui';

export function IntegrationCopyField({ label, value, hint }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="integrationCopyField">
      <label>{label}</label>
      {hint ? <p className="muted integrationCopyHint">{hint}</p> : null}
      <div className="integrationCopyRow">
        <code>{value}</code>
        <Button type="button" variant="outline" className="small" onClick={copy} disabled={!value}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
