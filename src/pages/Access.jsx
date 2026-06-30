import React, { useEffect, useMemo, useState } from 'react';
import { Shield, UserPlus, Users } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';
import { PilotUpgradeHint } from '../components/PilotProgram';
import { ROLES, roleTone } from '../lib/roles';

function RoleBadge({ role }) {
  return <span className={`accessRoleBadge accessRoleBadge--${roleTone(role)}`}>{role}</span>;
}

function formatJoined(iso) {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function Access() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState('');
  const [invite, setInvite] = useState({ name: '', email: '', role: 'Hiring Manager', password: '' });
  const isAdmin = user?.role === 'Admin';
  const pilot = user?.pilot;

  const load = async () => {
    setLoadError('');
    setLoading(true);
    try {
      setUsers(await api('/users'));
    } catch (e) {
      setLoadError(e.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const roleCounts = useMemo(() => {
    const counts = {};
    for (const u of users) counts[u.role] = (counts[u.role] || 0) + 1;
    return counts;
  }, [users]);

  const sendInvite = async (e) => {
    e?.preventDefault();
    setActionError('');
    setSuccess('');
    setBusy('invite');
    try {
      const addedName = invite.name || invite.email;
      await api('/users', { method: 'POST', body: JSON.stringify(invite) });
      setInvite({ name: '', email: '', role: 'Hiring Manager', password: '' });
      setSuccess(`${addedName} added to your team.`);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  };

  const changeRole = async (id, role) => {
    setActionError('');
    setSuccess('');
    setBusy(id);
    try {
      await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setSuccess('Role updated.');
      await load();
    } catch (err) {
      setActionError(err.message);
      await load();
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="accessPage">
      <div className="pageHead">
        <h1>Team access</h1>
        <p>
          Each person signs in with their own account. Roles are assigned here and cannot be switched after login.
        </p>
      </div>

      {loadError && (
        <p className="error" role="alert">
          {loadError}
        </p>
      )}
      {actionError && <PilotUpgradeHint message={actionError} />}
      {success && <p className="success accessSuccess">{success}</p>}

      <div className="accessSummary">
        <div className="accessStat">
          <Users size={18} aria-hidden />
          <div>
            <strong>{users.length}</strong>
            <span>Team members</span>
          </div>
        </div>
        {ROLES.filter((r) => roleCounts[r.role]).map((r) => (
          <div key={r.role} className="accessStat accessStat--compact">
            <RoleBadge role={r.role} />
            <strong>{roleCounts[r.role]}</strong>
          </div>
        ))}
      </div>

      <div className="accessLayout">
        <Card className="accessTeamCard">
          <div className="accessCardHead">
            <h2>Team members</h2>
            {isAdmin && (
              <span className="muted accessCardHint">You can change roles for anyone except yourself.</span>
            )}
          </div>

          {loading ? (
            <p className="muted">Loading team…</p>
          ) : (
            <div className="accessTableWrap">
              <table className="accessTable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={u.id === user?.id ? 'accessTableRow--you' : ''}>
                      <td>
                        <b>{u.name}</b>
                        {u.id === user?.id && <span className="accessYouTag">You</span>}
                      </td>
                      <td className="accessEmail">{u.email}</td>
                      <td>
                        {isAdmin && u.id !== user?.id ? (
                          <select
                            className="accessRoleSelect"
                            value={u.role}
                            disabled={busy === u.id}
                            onChange={(e) => changeRole(u.id, e.target.value)}
                            aria-label={`Role for ${u.name}`}
                          >
                            {ROLES.map((r) => (
                              <option key={r.role} value={r.role}>
                                {r.role}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>
                      <td className="muted">{formatJoined(u.created_at)}</td>
                    </tr>
                  ))}
                  {!users.length && !loading && (
                    <tr>
                      <td colSpan={4} className="empty">
                        No team members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="accessSideCol">
          {isAdmin && (
            <Card className="accessInviteCard">
              <div className="accessCardHead">
                <h2>
                  <UserPlus size={18} aria-hidden /> Add team member
                </h2>
              </div>
              {pilot?.is_pilot && pilot.limits && (
                <p className="muted accessPilotNote">
                  Pilot: {pilot.usage?.users ?? 0} / {pilot.limits.max_team_users} team members used.
                </p>
              )}
              <form className="accessInviteForm" onSubmit={sendInvite}>
                <label>
                  Full name
                  <input
                    required
                    value={invite.name}
                    onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                    placeholder="Alex Rivera"
                    autoComplete="name"
                  />
                </label>
                <label>
                  Work email
                  <input
                    required
                    type="email"
                    value={invite.email}
                    onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                    placeholder="alex@company.com"
                    autoComplete="off"
                  />
                </label>
                <label>
                  Role
                  <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
                    {ROLES.map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.role}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Temporary password
                  <input
                    required
                    type="password"
                    value={invite.password}
                    onChange={(e) => setInvite({ ...invite, password: e.target.value })}
                    placeholder="Share securely; they can change after first login"
                    autoComplete="new-password"
                  />
                </label>
                <Button type="submit" disabled={!!busy}>
                  {busy === 'invite' ? 'Adding…' : 'Add team member'}
                </Button>
              </form>
            </Card>
          )}

          <Card className="accessRolesCard">
            <div className="accessCardHead">
              <h2>
                <Shield size={18} aria-hidden /> Role permissions
              </h2>
              <span className="muted accessCardHint">Reference for what each role can do.</span>
            </div>
            <div className="accessRoleList">
              {ROLES.map((r) => (
                <article
                  key={r.role}
                  className={`accessRoleCard${user?.role === r.role ? ' accessRoleCard--current' : ''}`}
                >
                  <div className="accessRoleCardHead">
                    <RoleBadge role={r.role} />
                    {user?.role === r.role && <span className="accessYouTag">Your role</span>}
                  </div>
                  <p>{r.description}</p>
                  <ul>
                    {r.access.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
