import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';
import { ROLES } from '../lib/roles';

export function Access() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState({ name: '', email: '', role: 'Hiring Manager', password: '' });
  const isAdmin = user?.role === 'Admin';

  const load = () => api('/users').then(setUsers).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const sendInvite = async () => {
    setError('');
    try {
      await api('/users', { method: 'POST', body: JSON.stringify(invite) });
      setInvite({ name: '', email: '', role: 'Hiring Manager', password: '' });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const changeRole = async (id, role) => {
    await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
    load();
  };

  return (
    <>
      <div className="pageHead">
        <h1>Access & roles</h1>
        <p>Each person logs in with their own account — their role is assigned here, not switched after login.</p>
      </div>

      <section className="grid two">
        <Card>
          <h2>Team members</h2>
          {error && !users.length && <p className="error">{error}</p>}
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b>
                    {u.id === user?.id && <small> (you)</small>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    {isAdmin && u.id !== user?.id ? (
                      <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                        {ROLES.map((r) => (
                          <option key={r.role} value={r.role}>
                            {r.role}
                          </option>
                        ))}
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2>Role permissions</h2>
          {ROLES.map((r) => (
            <div key={r.role} className={`role ${user?.role === r.role ? 'selected' : ''}`}>
              <b>
                <Lock size={15} />
                {r.role}
              </b>
              <p>{r.description}</p>
            </div>
          ))}

          {isAdmin && (
            <>
              <h3 className="mt">Invite team member</h3>
              <input placeholder="Name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
              <input placeholder="Email" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
              <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.role}
                  </option>
                ))}
              </select>
              <input placeholder="Temporary password" type="password" value={invite.password} onChange={(e) => setInvite({ ...invite, password: e.target.value })} />
              {error && <p className="error">{error}</p>}
              <Button onClick={sendInvite}>Add user</Button>
            </>
          )}
        </Card>
      </section>
    </>
  );
}
