import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => { tokenStore.clear(); setMe(null); }, []);

  const loadMe = useCallback(async () => {
    try { setMe(await api('/auth/me')); } catch { logout(); } finally { setLoading(false); }
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (tokenStore.get()) loadMe();
  }, [loadMe, logout]);

  const login = async (email, password) => {
    const { token } = await api('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(token);
    await loadMe();
  };

  const register = async (companyName, email, password) => {
    const { token } = await api('/auth/register', { method: 'POST', body: { companyName, email, password } });
    tokenStore.set(token);
    await loadMe();
  };

  return (
    <AuthContext.Provider value={{ me, loading, login, register, logout, reload: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
