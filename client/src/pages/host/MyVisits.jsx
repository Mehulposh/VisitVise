import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Search } from "lucide-react";
import api from "../../api/api.js";
import { useDebounced, useFetch } from "../../lib/hooks";
import { useLive } from "../../lib/live";
import { Button, Card, Empty, ErrorBox, Input, PageHeader, Pagination, Spinner, Tabs } from "../../components/ui";
import VisitRow from "../../components/VisitRow";

const TABS = [["", "All"], ["expected", "Expected"], ["pending_approval", "Waiting"], ["checked_in", "On site"], ["checked_out", "Left"], ["no_show", "No-show"], ["cancelled", "Cancelled"]].map(([value, label]) => ({ value, label }));

export default function MyVisits() {
  const [status, setStatus] = useState(""); const [q, setQ] = useState(""); const [page, setPage] = useState(1); const dq = useDebounced(q);
  const { data, loading, error, reload } = useFetch(() => api.get("/visits", { params: { page, limit: 12, q: dq || undefined, status: status || undefined } }), [status, dq, page]);
  useLive(() => reload(true));
  return (
    <>
      <PageHeader title="My visitors" subtitle="Search, reschedule, cancel or resend a pass" action={<Link to="/visits/new"><Button>Register a visitor</Button></Link>} />
      <div className="mb-5 flex flex-wrap items-center gap-3"><Tabs tabs={TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><Input className="pl-10" placeholder="Name, company, code…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div></div>
      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.items.length ? <Card><Empty icon={ClipboardList} title="No visitors found" text="Try another filter or register a new visitor." /></Card> : (
        <><div className="space-y-3">{data.items.map((v) => <VisitRow key={v.id} v={v} onChanged={() => reload(true)} />)}</div><Pagination pagination={data.pagination} onPage={setPage} /></>)}
    </>
  );
}
