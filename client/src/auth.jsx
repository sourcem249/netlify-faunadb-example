import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  async function refresh() {
    const data = await api('/api/auth/me');
    setUser(data.user);
    return data.user;
  }

  useEffect(() => {
    refresh().catch(() => setUser(null));
  }, []);

  const value = useMemo(() => ({
    user,
    refresh,
    async login(username, password) {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setUser(data.user);
      return data.user;
    },
    async register(payload) {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setUser(data.user);
      return data.user;
    },
    async logout() {
      await api('/api/auth/logout', { method: 'POST' });
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
