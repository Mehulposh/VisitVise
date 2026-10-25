import { useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, Clock, DoorOpen, LogOut, ScanLine, Truck, UserRound, XCircle } from "lucide-react";
import api, { errMsg, photoUrl } from "../../api/api.js";
import { useFetch, useInterval } from "../../lib/hooks";
import { useLive } from "../../lib/live";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Badge, Button, Card, Empty, Field, Initials, Input, LiveDot, PageHeader, Select, Spinner, StatusBadge, Tabs, Textarea } from "../../components/ui";
import Scanner from "../../components/Scanner";
import VisitActions from "../../components/VisitActions";
import { cx, fmtTime, minutesBetween, when } from "../../lib/utils";

function ScanTab() {
  const { meta } = useAuth(); const toast = useToast();
  const [area, setArea] = useState(meta.areas?.[0] || "Lobby"); const [mode, setMode] = useState("access"); const [camera, setCamera] = useState(true);
  const [manual, setManual] = useState(""); const [busy, setBusy] = useState(false); const [result, setResult] = useState(null); const [recent, setRecent] = useState([]); const [panel, setPanel] = useState(null);
  const last = useRef({ key: "", at: 0 });

  const handle = async (text) => {
    const now = Date.now(); if (last.current.key === text && now - last.current.at < 4000) return; last.current = { key: text, at: now };
    setBusy(true);
    try {
      const { data } = await api.post("/gate/scan", { code: text, area: mode === "access" ? area : undefined, mode });
      setResult(data); setRecent((r) => [{ ...data, at: new Date(), mode, area }, ...r].slice(0, 12)); navigator.vibrate?.(data.ok ? 60 : [120, 60, 120]);
    } catch (e) { setResult({ ok: false, reason: errMsg(e) }); } finally { setBusy(false); }
  };
  const v = result?.visit;
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-2 gap-2">{[["access", "Check in / access", DoorOpen], ["checkout", "Check out", LogOut]].map(([k, l, I]) => <button key={k} onClick={() => setMode(k)} className={cx("flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition", mode === k ? "border-teal-400 bg-teal-500/15 text-teal-700 dark:text-teal-300" : "border-slate-300/60 dark:border-white/10")}><I size={16} />{l}</button>)}</div>
        {mode === "access" && <Field label="Entering area"><Select value={area} onChange={(e) => setArea(e.target.value)}>{(meta.areas || []).map((a) => <option key={a}>{a}</option>)}</Select></Field>}
        <Scanner active={camera} onScan={handle} />
        <div className="flex justify-center"><Button variant="ghost" size="sm" onClick={() => setCamera(!camera)}>{camera ? <><CameraOff size={14} /> Pause camera</> : <><Camera size={14} /> Start camera</>}</Button></div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { handle(manual.trim()); setManual(""); } }}><Input placeholder="…or type the pass code" value={manual} onChange={(e) => setManual(e.target.value)} className="font-mono uppercase tracking-widest" /><Button loading={busy}>Go</Button></form>
      </Card>
      <div className="space-y-5 lg:col-span-3">
        {result ? (
          <Card className={cx("animate-pop space-y-4 border-2", result.ok ? "!border-emerald-400/60 !bg-emerald-500/10" : "!border-rose-400/60 !bg-rose-500/10")}>
            <div className="flex items-center gap-4">
              {result.ok ? <CheckCircle2 size={56} className="shrink-0 text-emerald-500" /> : <XCircle size={56} className="shrink-0 text-rose-500" />}
              <div><h2 className="text-2xl font-black">{result.ok ? (result.checkedIn ? "Checked in" : result.reason) : "Access refused"}</h2>{!result.ok && <p className="text-lg font-semibold text-rose-600 dark:text-rose-300">{result.reason}</p>}</div>
            </div>
            {v && (<div className="flex items-center gap-4 rounded-2xl bg-white/50 p-4 dark:bg-white/5">
              {v.hasPhoto ? <img src={photoUrl(v.code)} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <Initials name={v.visitorName} size={80} />}
              <div className="min-w-0"><p className="truncate text-xl font-extrabold">{v.visitorName}</p><p className="truncate text-sm text-slate-500">{v.company || "—"}</p><p className="text-sm">Host: <b>{v.hostName}</b> · {when(v)}</p><div className="mt-1 flex flex-wrap gap-1.5">{(v.areas || []).map((a) => <Badge key={a} tone="slate">{a}</Badge>)}</div></div></div>)}
            {v && <div className="flex flex-wrap gap-2"><Button variant="soft" size="sm" onClick={() => setPanel(v)}><Camera size={14} /> Photo, ID, vehicle</Button>
              {/declaration needs review/i.test(result.reason) && <Button size="sm" onClick={async () => { try { await api.post(`/gate/visits/${v.id}/clear-declaration`); toast("Cleared. Scan again to let them in."); } catch (e) { toast(errMsg(e), "error"); } }}>Clear health flag</Button>}</div>}
          </Card>
        ) : <Card><Empty icon={ScanLine} title="Ready to scan" text="Point the camera at a visitor's QR code, or type the pass code." /></Card>}
        <Card><h3 className="mb-3 font-bold">This session</h3>
          {!recent.length ? <p className="text-sm text-slate-500">No scans yet.</p> : <ul className="space-y-2">{recent.map((r, i) => (
            <li key={i} className="flex items-center gap-3 text-sm"><span className={cx("h-2.5 w-2.5 shrink-0 rounded-full", r.ok ? "bg-emerald-500" : "bg-rose-500")} /><span className="w-14 shrink-0 text-slate-500">{fmtTime(r.at)}</span><span className="min-w-0 flex-1 truncate font-semibold">{r.visit?.visitorName || "Unknown pass"}</span><span className="shrink-0 text-xs text-slate-500">{r.mode === "checkout" ? "out" : r.area} · {r.reason}</span></li>))}</ul>}</Card>
      </div>
      <VisitActions visit={panel} open={!!panel} onClose={() => setPanel(null)} onChanged={() => {}} />
    </div>
  );
}

function ExpectedTab() {
  const { data, loading, reload } = useFetch(() => api.get("/gate/expected"), []); useLive(() => reload(true));
  if (loading && !data) return <Spinner />;
  return !data.visitors.length ? <Card><Empty icon={Clock} title="Nobody else is expected today" /></Card> : (
    <div className="space-y-3">{data.visitors.map((v) => (
      <Card key={v.id} className="flex flex-wrap items-center gap-3 !p-3.5"><Initials name={v.visitorName} size={44} /><div className="min-w-0 flex-1 basis-56"><p className="font-bold">{v.visitorName} <span className="font-normal text-slate-500">· {v.company}</span></p><p className="text-xs text-slate-500">Host {v.hostName} · {v.from}–{v.to} · {(v.areas || []).join(", ")}</p></div>
        <span className="font-mono text-sm font-bold tracking-widest">{v.code}</span><StatusBadge status={v.status} /></Card>))}</div>
  );
}
function OnSiteTab() {
  const { data, loading, reload } = useFetch(() => api.get("/gate/onsite"), []); const toast = useToast(); const [panel, setPanel] = useState(null);
  useLive(() => reload(true)); useInterval(() => reload(true), 60000);
  const out = async (v) => { try { await api.post(`/gate/visits/${v.id}/checkout`); toast(`${v.visitorName} checked out`); reload(true); } catch (e) { toast(errMsg(e), "error"); } };
  if (loading && !data) return <Spinner />;
  return (<>
    <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><LiveDot /> {data.count} on site now</p>
    {!data.visitors.length ? <Card><Empty icon={UserRound} title="No visitors inside" /></Card> : (
      <div className="grid gap-3 md:grid-cols-2">{data.visitors.map((v) => (
        <Card key={v.id} className="flex items-center gap-3 !p-3.5">{v.hasPhoto ? <img src={photoUrl(v.code)} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <Initials name={v.visitorName} size={56} />}
          <div className="min-w-0 flex-1"><p className="truncate font-bold">{v.visitorName}</p><p className="truncate text-xs text-slate-500">{v.company || "—"} · host {v.hostName}</p><p className="text-xs"><Badge tone="emerald">{v.currentArea || "inside"}</Badge> <span className="text-slate-500">in since {fmtTime(v.checkIn)} · {minutesBetween(v.checkIn)} min</span></p></div>
          <div className="flex flex-col gap-1.5"><Button size="sm" variant="ghost" onClick={() => setPanel(v)}>Details</Button><Button size="sm" variant="danger" onClick={() => out(v)}>Check out</Button></div></Card>))}</div>)}
    <VisitActions visit={panel} open={!!panel} onClose={() => setPanel(null)} onChanged={() => { reload(true); setPanel(null); }} />
  </>);
}
function DeliveryTab() {
  const toast = useToast(); const [f, setF] = useState({ courier: "", company: "", note: "" }); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null);
  const submit = async (e) => { e.preventDefault(); setBusy(true); try { const b = { ...f }; Object.keys(b).forEach((k) => !b[k] && delete b[k]); const { data } = await api.post("/gate/delivery", b); setDone(data); setF({ courier: "", company: "", note: "" }); toast("Delivery logged"); } catch (er) { toast(errMsg(er), "error"); } finally { setBusy(false); } };
  return (
    <Card className="max-w-xl space-y-4"><h3 className="flex items-center gap-2 font-bold"><Truck size={18} className="text-teal-500" /> Courier fast lane</h3><p className="text-sm text-slate-600 dark:text-slate-300">No pass needed: the courier is logged straight into the lobby for one hour.</p>
      <form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Courier name"><Input required maxLength={80} value={f.courier} onChange={(e) => setF({ ...f, courier: e.target.value })} /></Field><Field label="Company"><Input maxLength={80} value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field></div>
        <Field label="Note / recipient"><Textarea rows={2} maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Parcel for Finance, 2nd floor" /></Field><Button loading={busy}>Log delivery</Button></form>
      {done && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">Logged: {done.visitorName}. They appear under “On site” until checked out (or automatically after an hour).</p>}</Card>
  );
}

export default function Gate() {
  const [tab, setTab] = useState("scan");
  return (
    <>
      <PageHeader title="Gate desk" subtitle="Scan passes, watch who is inside, log deliveries" />
      <div className="mb-5"><Tabs value={tab} onChange={setTab} tabs={[{ value: "scan", label: "Scan" }, { value: "expected", label: "Expected today" }, { value: "onsite", label: "On site now" }, { value: "delivery", label: "Delivery" }]} /></div>
      {tab === "scan" ? <ScanTab /> : tab === "expected" ? <ExpectedTab /> : tab === "onsite" ? <OnSiteTab /> : <DeliveryTab />}
    </>
  );
}
