import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

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
