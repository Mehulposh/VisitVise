import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api", withCredentials: true });
api.interceptors.response.use((r) => r, (err) => {
  const url = err.config?.url || "";
  if (err.response?.status === 401 && !/^\/(login|me|register)/.test(url) && !url.startsWith("/auth/")) window.dispatchEvent(new Event("auth:expired"));
  return Promise.reject(err);
});
export const errMsg = (e) => e?.response?.data?.error || e?.response?.data?.message || e?.message || "Something went wrong";
// photo and QR are served by pass code (the code is the secret, same as the badge link)
export const photoUrl = (code) => `/api/pass/${code}/photo`;
export const qrUrl = (code) => `/api/pass/${code}/qr.svg`;
export default api;
