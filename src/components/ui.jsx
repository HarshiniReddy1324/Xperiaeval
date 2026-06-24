import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export function bucketClass(b) {
  return b === 'Green' ? 'green' : b === 'Amber' ? 'amber' : 'red';
}

export function BucketIcon({ bucket, size = 16 }) {
  if (bucket === 'Green') return <CheckCircle2 size={size} />;
  if (bucket === 'Amber') return <AlertTriangle size={size} />;
  return <XCircle size={size} />;
}

export function Button({ children, variant = '', className = '', onClick, type = 'button', disabled }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`btn ${variant} ${className}`.trim()}>
      {children}
    </button>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function BucketBadge({ bucket }) {
  return (
    <span className={`bucket ${bucketClass(bucket)}`}>
      <BucketIcon bucket={bucket} />
      {bucket}
    </span>
  );
}
