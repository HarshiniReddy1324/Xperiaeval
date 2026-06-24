import React from 'react';

export function FormSection({ title, description, children, icon: Icon }) {
  return (
    <section className="formSection">
      <div className="formSectionHead">
        {Icon && (
          <span className="formSectionIcon">
            <Icon size={20} />
          </span>
        )}
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="formSectionBody">{children}</div>
    </section>
  );
}

export function FormField({ label, hint, required, children, className = '' }) {
  return (
    <label className={`formField ${className}`}>
      <span className="formLabel">
        {label}
        {required && <em> *</em>}
      </span>
      {hint && <span className="formHint">{hint}</span>}
      {children}
    </label>
  );
}

export function FormGrid({ children, cols = 2 }) {
  return <div className={`formGrid cols${cols}`}>{children}</div>;
}
