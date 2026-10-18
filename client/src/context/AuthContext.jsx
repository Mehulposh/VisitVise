import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setToken } from '../api/api.js';
const Ctx = createContext();
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('me') || 'null'));
  const login = d => { setToken(d.token); localStorage.setItem('me', JSON.stringify(d.user)); setUser(d.user); };
  const logout = useCallback(() => { setToken(''); localStorage.removeItem('me'); setUser(null); }, []);
  useEffect(() => { window.addEventListener('unauth', logout); return () => window.removeEventListener('unauth', logout); }, [logout]);
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}