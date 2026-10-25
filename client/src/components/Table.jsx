import { Card } from "./ui";
export const Table = ({ head, children, min = 720 }) => (
  <Card className="overflow-x-auto !p-0"><table className="w-full text-left text-sm" style={{ minWidth: min }}>
    <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400"><tr>{head.map((h, i) => <th key={i} className="p-4 font-semibold">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-500/10">{children}</tbody></table></Card>
);
