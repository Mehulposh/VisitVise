import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, DoorOpen, ShieldAlert, UserX, Users } from "lucide-react";
import api from "../../api/api.js";
import { useFetch } from "../../lib/hooks";
import { useLive } from "../../lib/live";
import { useAuth } from "../../context/AuthContext";
import { BarChart, Card, Empty, ErrorBox, HBars, PageHeader, Select, Spinner, Stat } from "../../components/ui";
import { addDays } from "../../lib/utils";

const hr = (h) => `${String(h).padStart(2, "0")}h`;
export default function AdminOverview() {
  const { meta } = useAuth(); const [days, setDays] = useState(30);
  const to = meta.today, from = addDays(to, -(days - 1));
  const { data, loading, error, reload } = useFetch(() => api.get("/admin/data", { params: { from, to } }), [days]);
  useLive((e) => ["visit.checked_in", "visit.checked_out"].includes(e.type) && reload(true));
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const t = data.totals;
  return (
    <>
      <PageHeader title="Overview" subtitle={`Visitor activity, ${data.range.from} to ${data.range.to} (${data.range.timezone})`}
        action={<Select className="!w-40" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></Select>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat icon={Users} label="Visits" value={t.visits} /><Stat icon={DoorOpen} label="Arrived" value={t.arrived} tone="emerald" /><Stat icon={UserX} label="No-show rate" value={`${t.noShowRate}%`} tone="rose" />
        <Stat icon={Clock} label="Avg visit" value={`${t.avgVisitMinutes} min`} tone="sky" /><Stat icon={ShieldAlert} label="Refused scans" value={t.deniedScans} tone="amber" sub={`${t.onSiteNow} on site now`} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card className="lg:col-span-2"><h3 className="mb-4 font-bold">Visits per day</h3><BarChart data={data.byDay.map((d) => ({ label: d.date.slice(5), value: d.visits }))} /></Card>
        <Card><h3 className="mb-4 font-bold">Busiest hours (check-ins)</h3><BarChart color="from-sky-500 to-blue-400" data={data.peakHours.map((h) => ({ label: hr(h.hour), value: h.checkIns }))} /></Card>
        <Card><h3 className="mb-4 font-bold">Where people go</h3>{data.byArea.length ? <HBars data={data.byArea.map((a) => ({ label: a.area, value: a.entries }))} /> : <Empty title="No entries yet" />}</Card>
        <Card><h3 className="mb-4 font-bold">Purpose of visit</h3>{data.byPurpose.length ? <HBars data={data.byPurpose.map((p) => ({ label: p.purpose, value: p.n }))} /> : <Empty title="No data yet" />}</Card>
        <Card><h3 className="mb-4 font-bold">Top hosts</h3>{!data.topHosts.length ? <Empty title="No data yet" /> : <ol className="space-y-2.5">{data.topHosts.map((h, i) => <li key={h.hostId} className="flex items-center gap-3 text-sm"><span className="grid h-7 w-7 place-items-center rounded-full bg-teal-500/15 text-xs font-bold text-teal-600">{i + 1}</span><span className="flex-1 truncate font-semibold">{h.name}</span><span className="text-slate-500">{h.n} visits</span></li>)}</ol>}</Card>
      </div>
      <p className="mt-4 text-xs text-slate-500">Need the raw data? See <Link to="/admin/tools" className="font-semibold text-teal-600">Roll-call & export</Link>.</p>
    </>
  );
}
