import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';

export default function AdminPanel({ currentUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/overview', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      setData(await r.json());
    } catch { setError('Failed to load access control data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addEmail = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const r = await fetch('/api/admin/allowed-emails', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setNewEmail(''); await load();
    } catch (e) { setError(e.message); }
    finally { setAdding(false); }
  };

  const removeEmail = async (id) => {
    try {
      await fetch(`/api/admin/allowed-emails/${id}`, { method: 'DELETE', credentials: 'include' });
      await load();
    } catch { setError('Failed to remove.'); }
  };

  const toggleAdmin = async (userId) => {
    try {
      await fetch(`/api/admin/users/${userId}/toggle-admin`, { method: 'PATCH', credentials: 'include' });
      await load();
    } catch { setError('Failed to update.'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent" />
    </div>
  );

  if (error) return <div className="text-negative text-sm p-4">{error}</div>;

  return (
    <div className="space-y-6 p-5">
      <div>
        <h2 className="text-base font-bold text-text-primary">Access Control</h2>
        <p className="text-xs text-text-tertiary mt-0.5">Invite partners by email. Only listed emails can sign in with Google.</p>
      </div>

      {/* Invite form */}
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 space-y-3">
        <h3 className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">Invite Partner</h3>
        <div className="flex gap-2">
          <input
            type="email" placeholder="partner@email.com" value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addEmail()}
            className="flex-1 bg-white border border-violet-200 rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input-focus transition-all"
          />
          <button onClick={addEmail} disabled={adding || !newEmail.trim()}
            className="px-4 py-2 text-sm font-semibold bg-gradient-brand text-white rounded-xl shadow-glow-violet hover:opacity-90 transition-all disabled:opacity-40">
            {adding ? 'Adding...' : 'Invite'}
          </button>
        </div>
        <p className="text-[10px] text-violet-500">They'll be able to sign in after you add their email. Share the app URL with them.</p>
      </div>

      {/* Allowed emails */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Allowed Emails ({data?.allowedEmails?.length || 0})</h3>
        {data?.allowedEmails?.length === 0 && (
          <p className="text-xs text-text-tertiary">No emails allowed yet.</p>
        )}
        <div className="space-y-1.5">
          {data?.allowedEmails?.map(e => (
            <div key={e.id} className="flex items-center justify-between bg-surface-1 border border-border rounded-xl px-3 py-2">
              <div>
                <p className="text-sm font-medium text-text-primary">{e.email}</p>
                <p className="text-[10px] text-text-tertiary">Added by {e.addedBy || 'admin'} · {new Date(e.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => removeEmail(e.id)}
                disabled={e.email === currentUser?.email}
                title={e.email === currentUser?.email ? "Can't remove your own email" : 'Remove access'}
                className="text-[10px] font-semibold text-negative hover:text-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded-lg hover:bg-red-50">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Users who have signed in */}
      {data?.users?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Users Who Have Signed In ({data.users.length})</h3>
          <div className="space-y-1.5">
            {data.users.map(u => (
              <div key={u.id} className="flex items-center gap-3 bg-surface-1 border border-border rounded-xl px-3 py-2">
                {u.profileImageUrl
                  ? <img src={u.profileImageUrl} className="w-7 h-7 rounded-full" alt="" />
                  : <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-[10px] font-bold">{(u.firstName?.[0] || u.email?.[0] || '?').toUpperCase()}</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                    {u.id === currentUser?.id && <span className="ml-1.5 text-[9px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded">You</span>}
                  </p>
                  <p className="text-[10px] text-text-tertiary truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {u.isAdmin && <span className="text-[9px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded uppercase tracking-wide">Admin</span>}
                  {u.id !== currentUser?.id && (
                    <button onClick={() => toggleAdmin(u.id)}
                      className="text-[10px] font-semibold text-accent hover:text-accent-dark transition-colors px-2 py-1 rounded-lg hover:bg-violet-50">
                      {u.isAdmin ? 'Demote' : 'Make Admin'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
