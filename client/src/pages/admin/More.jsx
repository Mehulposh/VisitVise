import { useState } from "react";
import { Copy, Download, Plus, Printer, Send, Trash2 } from "lucide-react";
import api, { errMsg } from "../../api/api.js";
import { useFetch } from "../../lib/hooks";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Badge, Button, Card, Empty, ErrorBox, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, Switch, Tabs } from "../../components/ui";
import { Table } from "../../components/Table";
import { addDays, cx, fmtDT } from "../../lib/utils";

export function Blocklist() {
  const toast = useToast(); const { data, loading, error, reload } = useFetch(() => api.get("/admin/blocklist"), []);
  const [f, setF] = useState({ name: "", email: "", phone: "", reason: "" });
  const add = async (e) => { e.preventDefault(); try { await api.post("/admin/blocklist", f); toast("Added to the blocklist"); setF({ name: "", email: "", phone: "", reason: "" }); reload(true); } catch (er) { toast(errMsg(er), "error"); } };
  const act = async (fn, ok) => { try { await fn(); toast(ok); reload(true); } catch (e) { toast(errMsg(e), "error"); } };
  return (
    <>
      <PageHeader title="Blocklist" subtitle="People who may not be registered or let in. Email or phone matches are safest; a name alone only matches entries without either." />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="h-fit"><form onSubmit={add} className="space-y-3"><h3 className="font-bold">Add an entry</h3><Field label="Name"><Input maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field><Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field><Field label="Reason"><Input maxLength={300} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field><Button className="w-full" disabled={!f.name && !f.email && !f.phone}><Plus size={16} /> Add</Button></form></Card>
        <div className="space-y-3 lg:col-span-2">{loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? <Card><Empty title="Nobody is blocked" /></Card> : data.map((b) => (
          <Card key={b._id} className="flex flex-wrap items-center justify-between gap-3 !p-4"><div className="min-w-0"><p className="font-bold">{b.name || b.email || b.phone}</p><p className="text-sm text-slate-500">{[b.email, b.phone].filter(Boolean).join(" · ")}{b.reason ? ` · ${b.reason}` : ""}</p></div>
            <div className="flex items-center gap-2"><Badge tone={b.active ? "rose" : "slate"}>{b.active ? "Blocked" : "Inactive"}</Badge><Button size="sm" variant="ghost" onClick={() => act(() => api.patch(`/admin/blocklist/${b._id}`, { active: !b.active }), b.active ? "Unblocked" : "Blocked again")}>{b.active ? "Unblock" : "Block"}</Button><Button size="sm" variant="ghost" className="!text-rose-600" onClick={() => window.confirm("Delete this entry?") && act(() => api.delete(`/admin/blocklist/${b._id}`), "Deleted")}><Trash2 size={14} /></Button></div></Card>))}</div>
      </div>
    </>
  );
}

const EVENTS = ["visit.created", "visit.checked_in", "visit.checked_out", "visit.denied", "visit.cancelled", "visit.no_show", "visit.overstay", "visit.walkin_pending", "visit.approved", "visit.rejected", "visit.declaration_flagged"];
export function Webhooks() {
  const toast = useToast(); const { data, loading, error, reload } = useFetch(() => api.get("/admin/webhooks"), []);
  const [open, setOpen] = useState(false); const [f, setF] = useState({ url: "", format: "json", events: ["visit.checked_in", "visit.denied"] }); const [secret, setSecret] = useState(""); const [busy, setBusy] = useState(false);
  const create = async (e) => { e.preventDefault(); setBusy(true); try { const { data: d } = await api.post("/admin/webhooks", f); setSecret(d.secret); setOpen(false); reload(true); } catch (er) { toast(errMsg(er), "error"); } finally { setBusy(false); } };
  const act = async (fn, ok) => { try { await fn(); toast(ok); reload(true); } catch (e) { toast(errMsg(e), "error"); } };
  return (
    <>
      <PageHeader title="Webhooks" subtitle="Send events to Slack, Teams or your own systems. Requests are signed (HMAC-SHA256) and only public https addresses are allowed." action={<Button onClick={() => setOpen(true)}><Plus size={16} /> New webhook</Button>} />
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? <Card><Empty title="No webhooks yet" text="Add a Slack incoming-webhook URL to get arrival alerts in a channel." /></Card> : (
        <div className="space-y-3">{data.map((h) => (
          <Card key={h.id} className="space-y-2 !p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="min-w-0 truncate font-mono text-sm font-semibold">{h.url}</p>
            <div className="flex items-center gap-2"><Badge tone={h.active ? "emerald" : "slate"}>{h.active ? "Active" : "Paused"}</Badge><Badge tone="sky">{h.format}</Badge>
              <Button size="sm" variant="ghost" title="Send a test event" onClick={() => act(() => api.post(`/admin/webhooks/${h.id}/test`), "Test sent")}><Send size={14} /></Button><Button size="sm" variant="ghost" onClick={() => act(() => api.patch(`/admin/webhooks/${h.id}`, { active: !h.active }), h.active ? "Paused" : "Resumed")}>{h.active ? "Pause" : "Resume"}</Button>
              <Button size="sm" variant="ghost" className="!text-rose-600" onClick={() => window.confirm("Delete this webhook?") && act(() => api.delete(`/admin/webhooks/${h.id}`), "Deleted")}><Trash2 size={14} /></Button></div></div>
            <div className="flex flex-wrap gap-1.5">{h.events.map((e) => <Badge key={e} tone="slate">{e.replace("visit.", "")}</Badge>)}</div>
            {h.lastAt && <p className="text-xs text-slate-500">Last delivery {fmtDT(h.lastAt)} · HTTP {h.lastStatus || "error"}</p>}</Card>))}</div>)}
      <Modal open={open} onClose={() => setOpen(false)} wide title="New webhook">
        <form onSubmit={create} className="space-y-4"><Field label="URL (https only)"><Input type="url" required placeholder="https://hooks.slack.com/services/…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
          <Field label="Format"><Select value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })}><option value="json">JSON (signed)</option><option value="slack">Slack / Teams text message</option></Select></Field>
          <div><p className="label">Events</p><div className="flex flex-wrap gap-1.5">{EVENTS.map((ev) => <button type="button" key={ev} onClick={() => setF({ ...f, events: f.events.includes(ev) ? f.events.filter((x) => x !== ev) : [...f.events, ev] })} className={cx("rounded-full border px-3 py-1 text-xs font-semibold", f.events.includes(ev) ? "border-teal-400 bg-teal-500/15 text-teal-700 dark:text-teal-300" : "border-slate-300/60 dark:border-white/10")}>{ev.replace("visit.", "")}</button>)}</div></div>
          <Button className="w-full" loading={busy} disabled={!f.events.length}>Create webhook</Button></form>
      </Modal>
      <Modal open={!!secret} onClose={() => setSecret("")} title="Signing secret">
        <div className="space-y-3"><p className="text-sm text-slate-600 dark:text-slate-300">Copy it now. It is shown only once. Verify requests with the <code>x-visitvise-signature</code> header.</p>
          <div className="flex gap-2"><Input readOnly value={secret} className="font-mono text-xs" onFocus={(e) => e.target.select()} /><Button variant="ghost" onClick={() => { navigator.clipboard.writeText(secret); toast("Copied"); }}><Copy size={15} /></Button></div><Button className="w-full" onClick={() => setSecret("")}>Done</Button></div>
      </Modal>
    </>
  );
}

function Scans() {
  const [f, setF] = useState({ ok: "", area: "", code: "", from: "", to: "" }); const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => api.get("/admin/scans", { params: { page, limit: 25, ok: f.ok || undefined, area: f.area || undefined, code: f.code || undefined, from: f.from || undefined, to: f.to || undefined } }), [page, f.ok, f.area, f.code, f.from, f.to]);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  return (<>
    <Card className="mb-5 grid gap-3 !p-4 sm:grid-cols-2 lg:grid-cols-5"><Select value={f.ok} onChange={set("ok")}><option value="">Allowed and refused</option><option value="true">Allowed only</option><option value="false">Refused only</option></Select><Input placeholder="Area" value={f.area} onChange={set("area")} /><Input placeholder="Pass code" className="font-mono uppercase" value={f.code} onChange={set("code")} /><Input type="date" value={f.from} onChange={set("from")} /><Input type="date" value={f.to} onChange={set("to")} /></Card>
    {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.items.length ? <Card><Empty title="No scans in this view" /></Card> : (
      <Table head={["Time", "Visitor", "Where", "Result", "Guard"]} min={760}>{data.items.map((s) => (
        <tr key={s._id}><td className="p-4 text-slate-500">{fmtDT(s.at)}</td><td className="font-semibold">{s.visitorName || <span className="text-slate-400">unknown pass</span>}<p className="font-mono text-xs font-normal text-slate-500">{s.code}</p></td><td>{s.mode === "checkout" ? "check-out" : s.area || s.mode}</td>
          <td><Badge tone={s.ok ? "emerald" : "rose"}>{s.ok ? "Allowed" : "Refused"}</Badge><p className="mt-0.5 text-xs text-slate-500">{s.reason}</p></td><td className="text-slate-500">{s.byName}</td></tr>))}</Table>)}
    <Pagination pagination={data?.pagination} onPage={setPage} /></>);
}
function Audit() {
  const [action, setAction] = useState(""); const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => api.get("/admin/audit", { params: { page, limit: 30, action: action || undefined } }), [page, action]);
  return (<>
    <Card className="mb-5 max-w-sm !p-4"><Input placeholder="Filter by action, e.g. user. or site." value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} /></Card>
    {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.items.length ? <Card><Empty title="Nothing recorded" /></Card> : (
      <Table head={["Time", "Who", "Action", "Target", "Details"]} min={760}>{data.items.map((a) => (
        <tr key={a._id}><td className="p-4 text-slate-500">{fmtDT(a.at)}</td><td className="font-semibold">{a.actorName}</td><td><Badge tone="violet">{a.action}</Badge></td><td className="font-mono text-xs text-slate-500">{a.target}</td><td className="max-w-[260px] truncate text-xs text-slate-500">{a.meta ? JSON.stringify(a.meta) : ""}</td></tr>))}</Table>)}
    <Pagination pagination={data?.pagination} onPage={setPage} /></>);
}
export function Logs() {
  const [tab, setTab] = useState("scans");
  return <><PageHeader title="Logs" subtitle="Every scan at the gate and every administrative change" /><div className="mb-5"><Tabs value={tab} onChange={setTab} tabs={[{ value: "scans", label: "Gate scans" }, { value: "audit", label: "Audit trail" }]} /></div>{tab === "scans" ? <Scans /> : <Audit />}</>;
}

export function Tools() {
  const { meta } = useAuth(); const { data, loading, reload } = useFetch(() => api.get("/admin/rollcall"), []);
  const [from, setFrom] = useState(addDays(meta.today, -29)); const [to, setTo] = useState(meta.today); const [contact, setContact] = useState(false);
  const qs = `from=${from}&to=${to}${contact ? "&includeContact=true" : ""}`;
  return (
    <>
      <PageHeader title="Roll-call & export" subtitle="Who is inside right now, and your data as spreadsheets" action={<div className="flex gap-2"><Button variant="ghost" onClick={() => reload(true)}>Refresh</Button><Button onClick={() => window.print()}><Printer size={16} /> Print roll-call</Button></div>} />
      <div className="print-area print-wide">
        <h2 className="mb-3 text-lg font-bold">On site now{data ? ` · ${data.count}` : ""}</h2>
        {loading && !data ? <Spinner /> : !data.visitors.length ? <Card><Empty title="Nobody is on site" /></Card> : (
          <Table head={["Visitor", "Company", "Phone", "Where", "Since", "Host", "Host phone", "Vehicle"]} min={900}>{data.visitors.map((v) => (
            <tr key={v.id}><td className="p-4 font-semibold">{v.visitorName}</td><td>{v.company}</td><td>{v.phone}</td><td>{v.area ? <Badge tone="emerald">{v.area}</Badge> : "—"}</td><td className="text-slate-500">{fmtDT(v.checkIn)}</td><td>{v.hostName}</td><td>{v.hostPhone}</td><td>{v.vehicle}</td></tr>))}</Table>)}
        <p className="mt-2 text-xs text-slate-500">Generated {data ? fmtDT(data.at) : ""}. Viewing this list is recorded in the audit trail.</p>
      </div>
      <Card className="mt-8 space-y-4"><h3 className="flex items-center gap-2 font-bold"><Download size={18} className="text-teal-500" /> Export CSV</h3>
        <div className="grid gap-4 sm:grid-cols-3"><Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
        <Switch checked={contact} onChange={setContact} label="Include visitors' email and phone (recorded in the audit trail)" />
        <div className="flex flex-wrap gap-2"><a href={`/api/admin/export/visits?${qs}`}><Button variant="soft">Visits.csv</Button></a><a href={`/api/admin/export/scans?from=${from}&to=${to}`}><Button variant="soft">Gate scans.csv</Button></a></div></Card>
    </>
  );
}
