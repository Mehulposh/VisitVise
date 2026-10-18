import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api.js';
import StatusPill from '../components/statusPill.jsx';
const PURPOSES = ['Meeting', 'Interview', 'Delivery', 'Maintenance', 'Audit'];
export default function Home() {
  const [meta, setMeta] = useState(null), [list, setList] = useState([]), [err, setErr] = useState('');
  const [mode, setMode] = useState('today');
  const blank = { visitorName: '', company: '', email: '', phone: '', purpose: 'Meeting', date: '', from: '09:00', to: '17:00', areas: ['Lobby'] };
  const [f, setF] = useState(blank);
  const load = useCallback(async () => {
    const [m, l] = await Promise.all([api('GET', '/me'), api('GET', '/visits')]);
    setMeta(m); setList(l);
  }, []);
  useEffect(() => { load().catch(e => setErr(e.message)); }, [load]);
  if (!meta) return err ? <div className="alert-err">{err}</div> : <p className="text-slate-500">Loading…</p>;
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const toggle = a => setF({ ...f, areas: f.areas.includes(a) ? f.areas.filter(x => x !== a) : [...f.areas, a] });
  const submit = async () => {
    setErr('');
    try { await api('POST', '/visits', { ...f, date: mode === 'today' ? meta.today : f.date }); setF(blank); await load(); }
    catch (e) { setErr(e.message); }
  };
  const cancel = async id => { if (confirm('Cancel this visit?')) { await api('PATCH', '/visits/' + id, { status: 'cancelled' }); load(); } };
  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-2xl font-bold">Register a visitor</h1>
        <div className="card space-y-5">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {[['today', "Today's visitor"], ['pre', 'Pre-register']].map(([k, l]) => (
              <button key={k} onClick={() => setMode(k)}
                className={'rounded-md px-4 py-1.5 text-sm font-medium transition ' + (mode === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>{l}</button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="label">Visitor name *<input className="input" value={f.visitorName} onChange={set('visitorName')} /></label>
            <label className="label">Company<input className="input" value={f.company} onChange={set('company')} /></label>
            <label className="label">Email (pass &amp; alerts)<input className="input" type="email" value={f.email} onChange={set('email')} /></label>
            <label className="label">Phone<input className="input" value={f.phone} onChange={set('phone')} /></label>
            <label className="label">Purpose<select className="input" value={f.purpose} onChange={set('purpose')}>{PURPOSES.map(p => <option key={p}>{p}</option>)}</select></label>
            <label className="label">Date *<input className="input" type="date" min={meta.today} disabled={mode === 'today'} value={mode === 'today' ? meta.today : f.date} onChange={set('date')} /></label>
            <label className="label">From *<input className="input" type="time" value={f.from} onChange={set('from')} /></label>
            <label className="label">To *<input className="input" type="time" value={f.to} onChange={set('to')} /></label>
          </div>
          <div>
            <p className="label">Authorised areas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {meta.areas.map(a => {
                const on = f.areas.includes(a);
                return (
                  <label key={a} className={'flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition ' + (on ? 'border-indigo-600 bg-indigo-50 font-medium text-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50')}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(a)} />{on ? '✓ ' : ''}{a}
                  </label>
                );
              })}
            </div>
          </div>
          {err && <div className="alert-err">{err}</div>}
          <button className="btn-primary" onClick={submit}>Register visitor</button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">My visitors</h2>
        <div className="card overflow-x-auto p-0">
          {list.length ? (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50"><tr>{['Visitor', 'Date / time', 'Areas', 'Status', 'Pass code', ''].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="td"><div className="font-medium">{v.visitorName}</div><div className="text-xs text-slate-400">{v.company}</div></td>
                    <td className="td">{v.date}<div className="text-xs text-slate-400">{v.from}–{v.to}</div></td>
                    <td className="td max-w-xs text-slate-600">{v.areas.join(', ')}</td>
                    <td className="td"><StatusPill s={v.status} /></td>
                    <td className="td"><Link className="font-mono font-semibold text-indigo-600 hover:underline" to={`/pass/${v.code}`}>{v.code}</Link></td>
                    <td className="td text-right">{v.status === 'expected' && <button className="btn-ghost btn-sm" onClick={() => cancel(v.id)}>Cancel</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="p-8 text-center text-slate-400">No visitors yet. Register your first one above.</p>}
        </div>
        <p className="mt-3 text-sm text-slate-500">Share the pass code (or link) with your visitor so they can see and download their badge.</p>
      </section>
    </div>
  );
}