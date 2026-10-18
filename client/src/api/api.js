let token = localStorage.getItem('tok') || '';
export const setToken = t => { token = t; t ? localStorage.setItem('tok', t) : localStorage.removeItem('tok'); };
export async function api(method, url, body) {
  const r = await fetch('/api' + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && token && url !== '/login') window.dispatchEvent(new Event('unauth'));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}