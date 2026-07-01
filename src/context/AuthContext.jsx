import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);
const TOKEN_KEY = 'xperieval_token';

async function restoreSession() {
  const token = getToken();
  if (!token) return null;
  try {
    return await auth.me();
  } catch {
    setToken(null);
    return null;
  }
}

export function isSessionActive(user) {
  return Boolean(user && getToken());
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    restoreSession()
      .then((u) => {
        setUser(u);
        setAuthError('');
      })
      .catch((err) => {
        setUser(null);
        setAuthError(err.message || 'Check that the API is running and reachable.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === TOKEN_KEY && !event.newValue) {
        setUser(null);
        setLoading(false);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = async (email, password) => {
    const { token, user: u } = await auth.login(email, password);
    setToken(token);
    const full = await auth.me().catch(() => u);
    setUser(full);
    return full;
  };

  const register = async (data) => {
    const res = await auth.register(data);
    if (res.pending) return res;
    const { token, user: u } = res;
    setToken(token);
    const full = await auth.me().catch(() => u);
    setUser(full);
    return full;
  };

  const refreshUser = async () => {
    const full = await auth.me();
    setUser(full);
    return full;
  };

  const value = useMemo(
    () => ({ user, loading, authError, login, register, logout, refreshUser, isSessionActive: () => isSessionActive(user) }),
    [user, loading, authError, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
