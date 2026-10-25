import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Lock, ShieldCheck, Trash2, X } from "lucide-react";
import api, { errMsg } from "../../api/api.js";
import { useDebounced, useFetch } from "../../lib/hooks";
import { useToast } from "../../context/ToastContext";
import { Badge, Button, Card, Empty, ErrorBox, Input, PageHeader, Pagination, Select, Spinner, StatusBadge } from "../../components/ui";
import { Table } from "../../components/Table";
import { STATUS, fmtDate } from "../../lib/utils";

export function AdminVisits() {
  const toast = useToast(); const [f, setF] = useState({ q: "", status: "", from: "", to: "" }); const [page, setPage] = useState(1); const dq = useDebounced(f.q);
  const { data, loading, error, reload } = useFetch(() => api.get("/admin/visits", { params: { page, limit: 20, q: dq || undefined, status: f.status || undefined, from: f.from || undefined, to: f.to || undefined } }), [dq, f.status, f.from, f.to, page]);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  const erase = async (v) => { if (!window.confirm(`Erase personal data of ${v.visitorName}? Counts and dates are kept.`)) return; try { await api.post(`/admin/visits/${v.id}/anonymise`); toast("Anonymised"); reload(true); } catch (e) { toast(errMsg(e), "error"); } };
  return (
    <>
      <PageHeader title="All visits" subtitle="Every visit on every site" />
      <Card className="mb-5 grid gap-3 !p-4 sm:grid-cols-2 lg:grid-cols-4"><Input placeholder="Search visitor, host, code…" value={f.q} onChange={set("q")} />
        <Select value={f.status} onChange={set("status")}><option value="">All statuses</option>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</Select><Input type="date" value={f.from} onChange={set("from")} /><Input type="date" value={f.to} onChange={set("to")} /></Card>
      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.items.length ? <Card><Empty title="No visits found" /></Card> : (
        <Table head={["Date", "Visitor", "Host", "Areas", "Status", ""]} min={820}>{data.items.map((v) => (
          <tr key={v.id}><td className="p-4 text-slate-500">{fmtDate(v.date)}<br /><span className="text-xs">{v.from}–{v.to}</span></td>
            <td><Link to={`/admin/visits/${v.id}`} className="font-semibold text-teal-700 hover:underline dark:text-teal-300">{v.visitorName}</Link><p className="text-xs text-slate-500">{v.company}</p></td><td>{v.hostName}</td><td className="max-w-[200px] truncate text-slate-500">{(v.areas || []).join(", ")}</td>
            <td><StatusBadge status={v.status} />{v.walkIn && <Badge tone="violet" className="ml-1">walk-in</Badge>}</td>
            <td className="pr-4 text-right">{!v.anonymised && v.status !== "checked_in" && <Button size="sm" variant="ghost" className="!text-rose-600" title="Erase personal data" onClick={() => erase(v)}><Trash2 size={14} /></Button>}</td></tr>))}</Table>)}
      <Pagination pagination={data?.pagination} onPage={setPage} />
    </>
  );
}

export function Approvals() {
  const toast = useToast(); const { data, loading, error, reload } = useFetch(() => api.get("/admin/approvals"), []);
  const act = async (v, approve) => { try { await api.post(`/admin/visits/${v.id}/approve-areas`, { areas: v.pendingAreas, approve }); toast(approve ? "Access approved" : "Access declined"); reload(true); } catch (e) { toast(errMsg(e), "error"); } };
  return (
    <>
      <PageHeader title="Restricted-area approvals" subtitle="Visitors whose pass includes a sensitive area that nobody has approved yet" />
      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? <Card><Empty icon={ShieldCheck} title="Nothing to approve" text="You are all caught up." /></Card> : (
        <div className="space-y-3">{data.map((v) => (
          <Card key={v.id} className="flex flex-wrap items-center gap-4 !p-4"><div className="min-w-0 flex-1 basis-60"><p className="font-bold">{v.visitorName} <span className="font-normal text-slate-500">· {v.company || "—"}</span></p><p className="text-sm text-slate-500">Host {v.hostName} · {fmtDate(v.date)} {v.from}–{v.to}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm"><Lock size={13} className="text-amber-500" />{v.pendingAreas.map((a) => <Badge key={a} tone="amber">{a}</Badge>)}</p></div>
            <div className="flex gap-2"><Button variant="success" size="sm" onClick={() => act(v, true)}><Check size={14} /> Approve</Button><Button variant="ghost" size="sm" className="!text-rose-600" onClick={() => act(v, false)}><X size={14} /> Decline</Button></div></Card>))}</div>)}
    </>
  );
}
