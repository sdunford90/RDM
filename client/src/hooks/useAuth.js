import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/user', { credentials: 'include' })
      .then(r => {
        if (r.status === 401) return null;
        if (!r.ok) throw new Error('Auth check failed');
        return r.json();
      })
      .then(data => { setUser(data); setLoading(false); })
      .catch(() => { setUser(null); setLoading(false); });
  }, []);

  return { user, loading, isAuthenticated: !!user, isAdmin: user?.isAdmin || false };
}
