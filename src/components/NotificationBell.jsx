import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../api/client';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ unread: 0, items: [] });
  const [flash, setFlash] = useState(null);
  const seenIds = useRef(new Set());
  const bootstrapped = useRef(false);

  const load = () =>
    api('/notifications')
      .then((d) => {
        if (bootstrapped.current) {
          const fresh = d.items.filter((n) => !n.read && !seenIds.current.has(n.id));
          if (fresh.length) {
            const latest = fresh[0];
            setFlash(latest);
            setTimeout(() => setFlash(null), 8000);
          }
        } else {
          bootstrapped.current = true;
        }
        d.items.forEach((n) => seenIds.current.add(n.id));
        setData(d);
      })
      .catch(() => {});

  useEffect(() => {
    load();
    const pollMs = () => (document.hidden ? 15000 : 5000);
    let id = setInterval(load, pollMs());

    const onFocus = () => load();
    const onVis = () => {
      clearInterval(id);
      id = setInterval(load, pollMs());
      if (!document.hidden) load();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const markAllRead = async () => {
    await api('/notifications/read-all', { method: 'PATCH' });
    load();
  };

  return (
    <>
      {flash && (
        <div className="notifToast">
          <Bell size={16} />
          <div>
            <b>{flash.title}</b>
            <p>{flash.body}</p>
            {flash.link && (
              <Link to={flash.link} onClick={() => setFlash(null)}>
                Open candidate →
              </Link>
            )}
          </div>
          <button type="button" onClick={() => setFlash(null)}>
            ×
          </button>
        </div>
      )}
      <div className="notifBell">
        <button type="button" className="notifBtn" onClick={() => setOpen(!open)} aria-label="Notifications" aria-expanded={open}>
          <Bell size={18} />
          {data.unread > 0 && <span className="notifBadge">{data.unread}</span>}
        </button>
        {open && (
          <div className="notifDropdown">
            <div className="notifHead">
              <b>Notifications ({data.unread} unread)</b>
              <button type="button" onClick={markAllRead}>
                Mark all read
              </button>
            </div>
            {data.items.slice(0, 15).map((n) => (
              <Link
                key={n.id}
                to={n.link || '#'}
                className={`notifItem ${n.read ? '' : 'unread'} ${n.type === 'scheduling' ? 'scheduling' : ''}`}
                onClick={() => {
                  api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
                  setOpen(false);
                }}
              >
                <span className="notifType">{n.type}</span>
                <b>{n.title}</b>
                <p>{n.body}</p>
                <small>{n.created_at}</small>
              </Link>
            ))}
            {!data.items.length && <p className="muted notifEmpty">No notifications yet</p>}
          </div>
        )}
      </div>
    </>
  );
}
