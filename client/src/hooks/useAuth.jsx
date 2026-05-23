import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchMe, signInWithGoogle, signOut as signOutApi } from '../utils/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('dev');
  const [googleClientId, setGoogleClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me.user);
      setMode(me.mode);
      setGoogleClientId(me.google_client_id);
    } catch (e) {
      console.error('Auth fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signIn = useCallback(async (credential) => {
    setError(null);
    try {
      const { user } = await signInWithGoogle(credential);
      setUser(user);
    } catch (e) {
      setError(e.body?.error || e.message);
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutApi();
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, mode, googleClientId, loading, error, signIn, signOut, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be inside <AuthProvider>');
  return v;
}
