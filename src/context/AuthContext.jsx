import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

const DEMO_EMAIL = 'demo@xperieval.com';
const DEMO_PASSWORD = 'demo1234';

/** Set VITE_REQUIRE_LOGIN=1 on Vercel to restore the login screen. */
const autoLoginEnabled = import.meta.env.VITE_REQUIRE_LOGIN !== '1';

async function restoreSession() {
  const token = getToken();
  if (token) {
    try {
      return await auth.me();
    } catch {
      setToken(null);
    }
  }
  if (!autoLoginEnabled) return null;
  const { token: nextToken, user } = await auth.login(DEMO_EMAIL, DEMO_PASSWORD);
  setToken(nextToken);
  try {
    return await auth.me();
  } catch {
    return user;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    restoreSession()
      .then((u) => {
        setUser(u);
        setAuthError(u ? '' : 'Check that the API is running and reachable.');
      })
      .catch((err) => {
        setUser(null);
        setAuthError(err.message || 'Check that the API is running and reachable.');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { token, user: u } = await auth.login(email, password);
    setToken(token);
    const full = await auth.me().catch(() => u);
    setUser(full);
    return full;
  };

  const register = async (data) => {
    const { token, user: u } = await auth.register(data);
    setToken(token);
    const full = await auth.me().catch(() => u);
    setUser(full);
    return full;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const full = await auth.me();
    setUser(full);
    return full;
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
