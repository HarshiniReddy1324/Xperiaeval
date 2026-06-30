import React, { useState } from 'react';
import { ExternalLink, Bookmark, Share2, Mail, User } from 'lucide-react';

export function ApplySidebar({ job, posting, applyUrl }) {
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('savedJobs') || '[]').includes(job?.slug);
    } catch {
      return false;
    }
  });

  const toggleSave = () => {
    const key = 'savedJobs';
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      list = [];
    }
    if (saved) list = list.filter((s) => s !== job.slug);
    else list.push(job.slug);
    localStorage.setItem(key, JSON.stringify(list));
    setSaved(!saved);
  };

  const shareJob = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: job?.title, url });
    else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    }
  };

  const goApply = () => {
    if (applyUrl) window.location.href = applyUrl;
  };

  return (
    <aside className="jp-sticky">
      <div className="jp-sidebar">
        <button type="button" className="jp-btnPrimary" onClick={goApply}>
          Apply now <ExternalLink size={16} />
        </button>
        <div className="jp-btnRow">
          <button type="button" className={`jp-btnSecondary ${saved ? 'saved' : ''}`} onClick={toggleSave}>
            <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Saved' : 'Save position'}
          </button>
          <button type="button" className="jp-btnSecondary" onClick={shareJob}>
            <Share2 size={16} /> Share
          </button>
        </div>
        {(posting?.recruiterName || posting?.recruiterEmail) && (
          <div className="jp-contact">
            <p className="jp-contactLabel">Recruiter contact</p>
            {posting.recruiterName && (
              <p className="jp-contactRow">
                <User size={16} style={{ color: '#94a3b8' }} />
                {posting.recruiterName}
              </p>
            )}
            {posting.recruiterEmail && (
              <a href={`mailto:${posting.recruiterEmail}`} className="jp-contactRow">
                <Mail size={16} style={{ color: '#94a3b8' }} />
                {posting.recruiterEmail}
              </a>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
