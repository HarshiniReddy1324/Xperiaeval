import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';

export function AuthLayout({ title, lead, children, footer, backTo, backLabel = 'Back' }) {
  return (
    <div className="authShell">
      <div className="authPanel">
        {backTo ? (
          <Link to={backTo} className="authBack" aria-label={backLabel} title={backLabel}>
            <ArrowLeft size={16} aria-hidden />
          </Link>
        ) : null}
        <div className="authBrand">
          <div className="authBrandMark" aria-hidden="true">
            <X size={20} strokeWidth={2.5} />
          </div>
          <div className="authBrandText">
            <strong>XPERIEVAL</strong>
            <span>Experience evaluation portal</span>
          </div>
        </div>

        <div className="authBody">
          <h1 className="authTitle">{title}</h1>
          {lead ? <p className="authLead">{lead}</p> : null}
          {children}
        </div>

        {footer ? <footer className="authFooter">{footer}</footer> : null}
      </div>
    </div>
  );
}
