import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/api";
import { connectLive, disconnectLive } from "../lib/live";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [meta, setMeta] = useState({ areas: [], areaDetails: [], today: "", site: null, delegate: null });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try { const { data } = await api.get("/me"); setUser(data.user); setMeta({ areas: data.areas, areaDetails: data.areaDetails || [], today: data.today, site: data.site, delegate: data.delegate }); return data.user; }
    catch { setUser(null); return null; } finally { setReady(true); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const h = () => setUser(null); window.addEventListener("auth:expired", h); return () => window.removeEventListener("auth:expired", h); }, []);
  useEffect(() => { if (user) connectLive(); else disconnectLive(); }, [user]);

  const login = async (email, password) => { await api.post("/login", { email, password }); return refresh(); };
  const register = async (body) => { await api.post("/register", body); return refresh(); };
  const logout = async () => { try { await api.post("/logout"); } finally { setUser(null); } };
  return <Ctx.Provider value={{ user, meta, ready, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}
