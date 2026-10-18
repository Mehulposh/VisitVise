const COLORS = {
  expected: 'bg-amber-100 text-amber-800 ring-amber-200',
  checked_in: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  checked_out: 'bg-slate-100 text-slate-600 ring-slate-200',
  cancelled: 'bg-rose-100 text-rose-700 ring-rose-200'
};
export default function StatusPill({ s }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${COLORS[s] || COLORS.checked_out}`}>
      {s.replace('_', ' ')}
    </span>
  );
}