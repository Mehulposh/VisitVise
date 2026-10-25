import { Link } from "react-router-dom";
import { CalendarCheck, Clock, DoorOpen, PlusCircle, UserCheck } from "lucide-react";
import api from "../../api/api.js";
import { useFetch } from "../../lib/hooks";
import { useLive } from "../../lib/live";
import { useAuth } from "../../context/AuthContext";
import { Button, Card, Empty, ErrorBox, PageHeader, Skeleton, Stat } from "../../components/ui";
import VisitRow from "../../components/VisitRow";
import { addDays } from "../../lib/utils";

export default function HostDashboard() {
  const { user, meta } = useAuth(); const today = meta.today;
  const { data, loading, error, reload } = useFetch(() => api.get("/visits"), []); // the plain array (latest 500)
  useLive(() => reload(true));
  const all = data || [], soon = addDays(today, 7);
  const covers = (v) => v.date <= today && (v.endDate || v.date) >= today;
  const waiting = all.filter((v) => v.status === "pending_approval");
  const onSite = all.filter((v) => v.status === "checked_in");
  const todays = all.filter((v) => ["expected", "checked_in", "checked_out"].includes(v.status) && covers(v));
  const upcoming = all.filter((v) => v.status === "expected" && v.date > today && v.date <= soon).sort((a, b) => (a.date + a.from).localeCompare(b.date + b.from));
  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]} 👋`} subtitle="Your visitors at a glance. This page updates live." action={<Link to="/visits/new"><Button><PlusCircle size={18} /> Register a visitor</Button></Link>} />
      {error ? <ErrorBox message={error} onRetry={reload} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />) : (<>
              <Stat icon={CalendarCheck} label="Today" value={todays.length} /><Stat icon={DoorOpen} label="On site now" value={onSite.length} tone="emerald" />
              <Stat icon={UserCheck} label="Waiting for you" value={waiting.length} tone="amber" /><Stat icon={Clock} label="Next 7 days" value={upcoming.length} tone="sky" /></>)}
          </div>
          {waiting.length > 0 && <section className="mt-8"><h2 className="mb-3 text-lg font-bold">Walk-ins waiting for approval</h2><div className="space-y-3">{waiting.map((v) => <VisitRow key={v.id} v={v} onChanged={() => reload(true)} />)}</div></section>}
          <section className="mt-8"><h2 className="mb-3 text-lg font-bold">Today</h2>
            {!todays.length ? <Card><Empty title="No visitors today" text="Register a visitor and they get an emailed pass with a QR code." action={<Link to="/visits/new"><Button className="mt-3">Register a visitor</Button></Link>} /></Card>
              : <div className="space-y-3">{todays.map((v) => <VisitRow key={v.id} v={v} onChanged={() => reload(true)} />)}</div>}</section>
          {upcoming.length > 0 && <section className="mt-8"><h2 className="mb-3 text-lg font-bold">Coming up</h2><div className="space-y-3">{upcoming.slice(0, 8).map((v) => <VisitRow key={v.id} v={v} onChanged={() => reload(true)} />)}</div></section>}
        </>)}
    </>
  );
}
