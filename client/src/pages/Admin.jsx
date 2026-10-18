import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/api.js';
import StatusPill from '../components/statusPill.jsx';

const Head = ({ cols }) => <thead className="bg-slate-50"><tr>{cols.map(h => <th key={h} className="th">{h}</th>)}</tr></thead>;
const Empty = () => <p className="p-8 text-center text-slate-400">Nothing to show.</p>;

function VisitTable({ list, onOut }) {
  if (!list.length) return <Empty />;
  return (
    <table className="min-w-full divide-y divide-slate-200">
      <Head cols={['Visitor', 'Host', 'Date / time', 'Areas', 'Status', 'Code', '']} />
      <tbody className="divide-y divide-slate-100">
        {list.map(v => (
          <tr key={v.id} className="hover:bg-slate-50">
            <td className="td"><div className="font-medium">{v.visitorName}</div><div className="text-xs text-slate-400">{v.company}</div></td>
            <td className="td">{v.hostName}</td>
            <td className="td">{v.date}<div className="text-xs text-slate-400">{v.from}–{v.to}</div></td>
            <td className="td max-w-xs text-slate-600">{v.areas.join(', ')}</td>
            <td className="td"><StatusPill s={v.status} /></td>
            <td className="td font-mono">{v.code}</td>
            <td className="td text-right">{v.status === 'checked_in' && <button className="btn-ghost btn-sm" onClick={() => onOut(v.id)}>Check out</button>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function Users({ users, visits }) {
  return (
    <table className="min-w-full divide-y divide-slate-200">
      <Head cols={['Name', 'Email', 'Role', 'Joined', 'Visitors']} />
      <tbody className="divide-y divide-slate-100">
        {users.map(u => (
          <tr key={u.id} className="hover:bg-slate-50">
            <td className="td font-medium">{u.name}</td><td className="td">{u.email}</td>
            <td className="td"><span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + (u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600')}>{u.role}</span></td>
            <td className="td">{(u.created || '').slice(0, 10)}</td>
            <td className="td">{visits.filter(v => v.hostId === u.id).length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function Gate({ areas }) {
  const [code, setCode] = useState(''), [area, setArea] = useState(areas[0]), [res, setRes] = useState(null), [err, setErr] = useState('');
  const verify = async e => {
    e.preventDefault(); setErr('');
    try { setRes(await api('POST', '/scan', { code: code.trim(), area })); } catch (x) { setErr(x.message); }
  };
  return (
    <form onSubmit={verify} className="max-w-xl space-y-4 p-5">
      <p className="text-sm text-slate-500">Enter the pass code from the badge and the area the visitor is trying to enter.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">Pass code<input className="input font-mono uppercase tracking-widest" value={code} onChange={e => setCode(e.target.value)} /></label>
        <label className="label">Area<select className="input" value={area} onChange={e => setArea(e.target.value)}>{areas.map(a => <option key={a}>{a}</option>)}</select></label>
      </div>
      <button className="btn-primary">Verify access</button>
      {err && <div className="alert-err">{err}</div>}
      {res && (
        <div className={'rounded-xl p-4 text-lg font-semibold ' + (res.ok ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200')}>
          {res.ok ? '✔' : '✖'} {res.reason}
          {res.visit && <div className="mt-1 text-sm font-normal">{res.visit.visitorName} · host {res.visit.host}</div>}
        </div>
      )}
    </form>
  );
}
const TABS = { daily: 'Daily visitors', expected: 'Expected', history: 'History', users: 'Registered users', gate: 'Gate check' };
const ACCENT = ['border-indigo-500', 'border-emerald-500', 'border-amber-500', 'border-violet-500'];
export default function Admin() {
  const [d, setD] = useState(null), [areas, setAreas] = useState([]), [tab, setTab] = useState('daily'), [err, setErr] = useState('');
  const load = useCallback(async () => {
    const [data, me] = await Promise.all([api('GET', '/admin/data'), api('GET', '/me')]);
    setD(data); setAreas(me.areas);
  }, []);
  useEffect(() => { load().catch(e => setErr(e.message)); }, [load]);
  if (!d) return err ? <div className="alert-err">{err}</div> : <p className="text-slate-500">Loading…</p>;
  const V = d.visits, daily = V.filter(v => v.date === d.today);
  const exp = V.filter(v => v.status === 'expected' && v.date >= d.today);
  const out = async id => { await api('PATCH', '/visits/' + id, { status: 'checked_out' }); load(); };
  const stats = [[daily.length, 'Visitors today'], [V.filter(v => v.status === 'checked_in').length, 'On site now'], [exp.length, 'Expected'], [d.users.filter(u => u.role === 'user').length, 'Registered users']];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([n, l], i) => (
          <div key={l} className={`card border-l-4 ${ACCENT[i]}`}><div className="text-3xl font-extrabold">{n}</div><div className="text-sm text-slate-500">{l}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(TABS).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={'rounded-full px-4 py-1.5 text-sm font-medium transition ' + (tab === k ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')}>{l}</button>
        ))}
      </div>
      <div className="card overflow-x-auto p-0">
        {tab === 'daily' && <VisitTable list={daily} onOut={out} />}
        {tab === 'expected' && <VisitTable list={exp} onOut={out} />}
        {tab === 'history' && <VisitTable list={V} onOut={out} />}
        {tab === 'users' && <Users users={d.users} visits={V} />}
        {tab === 'gate' && <Gate areas={areas} />}
      </div>
    </div>
  );
}