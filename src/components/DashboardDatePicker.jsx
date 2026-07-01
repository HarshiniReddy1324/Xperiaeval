import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, ChevronDown } from 'lucide-react';

function formatDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const fmt = (d) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} to ${fmt(end)}`;
}

export function DashboardDatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const rangeDays = value === '7d' ? 7 : value === '90d' ? 90 : 30;

  const dateLabel = useMemo(() => {
    if (value === '7d') return 'Last 7 days';
    if (value === '90d') return 'Last 90 days';
    return 'Last 30 days';
  }, [value]);

  const pick = (range) => {
    onChange(range);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="headActionWrap portalDatePicker" ref={wrapRef}>
      <button type="button" className="headPill headPillBtn" onClick={() => setOpen((s) => !s)} aria-label={dateLabel}>
        <CalendarClock size={14} aria-hidden />
        <span className="portalDatePickerLabel">{dateLabel}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div className="headDropdown">
          <button type="button" className={value === '7d' ? 'active' : ''} onClick={() => pick('7d')}>
            Last 7 days
          </button>
          <button type="button" className={value === '30d' ? 'active' : ''} onClick={() => pick('30d')}>
            Last 30 days
          </button>
          <button type="button" className={value === '90d' ? 'active' : ''} onClick={() => pick('90d')}>
            Last 90 days
          </button>
          <small>{formatDateRange(rangeDays)}</small>
        </div>
      )}
    </div>
  );
}
