import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
export default function Auth({ register }) {
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const { login } = useAuth(), nav = useNavigate();
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const d = await api('POST', register ? '/register' : '/login', f); login(d); nav(d.user.role === 'admin' ? '/admin' : '/home'); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <div className="mx-auto mt-6 max-w-md">
      <form onSubmit={submit} className="card space-y-4 p-8">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-xl font-bold text-white">V</div>
          <h1 className="text-2xl font-bold">{register ? 'Create your account' : 'Welcome back'}</h1>
          <p className="text-sm text-slate-500">{register ? 'Register to invite and manage your visitors.' : 'Log in to manage your visitors.'}</p>
        </div>
        {register && <label className="label">Full name<input className="input" value={f.name} onChange={set('name')} autoComplete="name" /></label>}
        <label className="label">Email<input className="input" type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label className="label">Password<input className="input" type="password" value={f.password} onChange={set('password')} autoComplete={register ? 'new-password' : 'current-password'} /></label>
        {err && <div className="alert-err">{err}</div>}
        <button className="btn-primary w-full py-2.5" disabled={busy}>{busy ? 'Please wait…' : register ? 'Register' : 'Log in'}</button>
        <p className="text-center text-sm text-slate-500">
          {register ? <>Already have an account? <Link className="font-medium text-indigo-600 hover:underline" to="/login">Log in</Link></>
            : <>No account yet? <Link className="font-medium text-indigo-600 hover:underline" to="/register">Register</Link></>}
        </p>
      </form>
    </div>
  );
}