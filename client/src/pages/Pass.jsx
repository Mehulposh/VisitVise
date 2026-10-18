import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/api.js';
import StatusPill from '../components/statusPill.jsx';
import Badge, { downloadBadge } from '../components/Badge.jsx';
export default function Pass() {
  const { code } = useParams(), nav = useNavigate();
  const [input, setInput] = useState(code || ''), [v, setV] = useState(null), [err, setErr] = useState('');
  useEffect(() => {
    setV(null); setErr('');
    if (code) api('GET', '/pass/' + code).then(setV).catch(e => setErr(e.message));
  }, [code]);
  const active = v && (v.status === 'expected' || v.status === 'checked_in');
  const find = e => { e.preventDefault(); if (input.trim()) nav('/pass/' + input.trim()); };
  return (
    <div className="mx-auto max-w-md space-y-5">
      <form onSubmit={find} className="card space-y-3 print:hidden">
        <h1 className="text-2xl font-bold">Visitor pass</h1>
        <label className="label">Enter your pass code
          <input className="input text-center font-mono text-lg uppercase tracking-widest" value={input} onChange={e => setInput(e.target.value)} placeholder="e.g. 4UCDM6LV" />
        </label>
        {err && <div className="alert-err">{err}</div>}
        <button className="btn-primary w-full">View my pass</button>
      </form>
      {v && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <StatusPill s={v.status} />
            <span className="text-sm font-medium">{v.date} · {v.from}–{v.to}</span>
          </div>
          <p className="text-sm text-slate-500 print:hidden"><span className="font-medium text-slate-700">Access granted to:</span> {v.areas.join(', ')}</p>
          {!active && <div className="alert-err print:hidden">This pass is no longer active.</div>}
          <div className="flex justify-center"><Badge v={v} /></div>
          <div className="flex justify-center gap-2 print:hidden">
            <button className="btn-primary" onClick={downloadBadge}>Download badge</button>
            <button className="btn-ghost" onClick={() => window.print()}>Print</button>
          </div>
          <p className="text-center text-xs text-slate-400 print:hidden">Show this badge to security or scan it at the facility.</p>
        </div>
      )}
    </div>
  );
}