import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Plus, Repeat, Trash2, Users } from "lucide-react";
import api, { errMsg } from "../../api/api.js";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDebounced } from "../../lib/hooks";
import { Button, Card, Field, Input, PageHeader, Select, Spinner, Switch, Textarea } from "../../components/ui";
import { PURPOSES, WEEKDAYS, addDays, cx, todayStr } from "../../lib/utils";

const blankPerson = { visitorName: "", company: "", email: "", phone: "" };

export default function NewVisit() {
  const { meta } = useAuth(); const toast = useToast(); const nav = useNavigate(); const [sp] = useSearchParams(); const editId = sp.get("edit");
  const today = meta.today || todayStr(); const site = meta.site;
  const [people, setPeople] = useState([{ ...blankPerson }]);
  const [f, setF] = useState({ purpose: "Meeting", date: today, endDate: "", from: "09:00", to: "18:00", areas: ["Lobby"], notes: "", plate: "", vehicleType: "", via: ["email"] });
  const [multiDay, setMultiDay] = useState(false); const [repeat, setRepeat] = useState({ on: false, weekdays: [1, 2, 3, 4, 5], until: addDays(today, 28) });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [loading, setLoading] = useState(!!editId);
  const [sug, setSug] = useState([]); const q = useDebounced(people[0].visitorName, 350);

  useEffect(() => { // edit mode: load the visit
    if (!editId) return;
    api.get(`/visits/${editId}`).then(({ data: v }) => {
      setPeople([{ visitorName: v.visitorName, company: v.company || "", email: v.email || "", phone: v.phone || "" }]);
      setF({ purpose: v.purpose, date: v.date, endDate: v.endDate || "", from: v.from, to: v.to, areas: v.areas, notes: v.notes || "", plate: v.vehicle?.plate || "", vehicleType: v.vehicle?.type || "", via: v.notifyVia?.length ? v.notifyVia : ["email"] });
      setMultiDay(!!v.endDate);
    }).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false));
  }, [editId]);
  useEffect(() => { if (editId || people.length > 1 || q.trim().length < 2 || sug.some((s) => s.visitorName === q)) { if (q.trim().length < 2) setSug([]); return; } api.get("/visitors/suggest", { params: { q: q.trim() } }).then((r) => setSug(r.data)).catch(() => setSug([])); }, [q]); // eslint-disable-line

  const setP = (i, k, v) => setPeople((a) => a.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const hours = site?.workingHours, closed = site?.blackoutDates || [];
  const restricted = (meta.areaDetails || []).filter((a) => a.requiresApproval && f.areas.includes(a.name));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const shared = { purpose: f.purpose, date: f.date, from: f.from, to: f.to, areas: f.areas, notes: f.notes, notifyVia: f.via, ...(f.plate && { vehicle: { plate: f.plate, type: f.vehicleType } }) };
      if (editId) {
        const p = people[0]; await api.patch(`/visits/${editId}`, { ...p, ...shared, endDate: multiDay && f.endDate ? f.endDate : f.date, vehicle: { plate: f.plate, type: f.vehicleType } });
        toast("Visit updated. The visitor was notified."); return nav(`/visits/${editId}`);
      }
      if (multiDay && f.endDate) shared.endDate = f.endDate;
      if (people.length > 1) { const { data } = await api.post("/visits/group", { ...shared, visitors: people }); toast(`${data.count} visitors registered`); }
      else {
        const body = { ...people[0], ...shared }; if (repeat.on) body.repeat = { weekdays: repeat.weekdays, until: repeat.until };
        const { data } = await api.post("/visits", body); toast(data.count > 1 ? `${data.count} visits scheduled` : "Visitor registered. The pass was sent.");
      }
      nav("/visits");
    } catch (er) { setErr(errMsg(er)); } finally { setBusy(false); }
  };
  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title={editId ? "Edit visit" : "Register a visitor"} subtitle={editId ? "Changes are emailed to the visitor." : "The visitor receives a pass with a QR code and a calendar invite."} />
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="space-y-5">
            <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold"><Users size={18} className="text-teal-500" /> {people.length > 1 ? `Visitors (${people.length})` : "Visitor"}</h3>
              {!editId && <Button type="button" variant="soft" size="sm" disabled={people.length >= 50 || repeat.on} onClick={() => setPeople([...people, { ...blankPerson }])}><Plus size={14} /> Add another visitor</Button>}</div>
            {people.map((p, i) => (
              <div key={i} className={cx("relative grid gap-3 sm:grid-cols-2", i > 0 && "border-t border-slate-500/15 pt-4")}>
                <div className="relative"><Field label="Full name"><Input required maxLength={80} value={p.visitorName} onChange={(e) => setP(i, "visitorName", e.target.value)} autoComplete="off" /></Field>
                  {i === 0 && sug.length > 0 && <div className="glass-strong absolute left-0 right-0 top-full z-20 mt-1 rounded-xl p-1">{sug.map((s, k) => <button type="button" key={k} onClick={() => { setPeople((a) => a.map((x, j) => (j === 0 ? { visitorName: s.visitorName, company: s.company || "", email: s.email || "", phone: s.phone || "" } : x))); setSug([]); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-teal-500/10"><b>{s.visitorName}</b> <span className="text-xs text-slate-500">{s.company} {s.email}</span></button>)}</div>}</div>
                <Field label="Company"><Input maxLength={80} value={p.company} onChange={(e) => setP(i, "company", e.target.value)} /></Field>
                <Field label="Email (pass is sent here)"><Input type="email" value={p.email} onChange={(e) => setP(i, "email", e.target.value)} /></Field>
                <Field label="Mobile"><Input inputMode="tel" value={p.phone} onChange={(e) => setP(i, "phone", e.target.value)} /></Field>
                {i > 0 && <button type="button" aria-label="Remove visitor" onClick={() => setPeople(people.filter((_, j) => j !== i))} className="absolute right-0 top-3 text-rose-500"><Trash2 size={16} /></button>}
              </div>))}
          </Card>
          <Card className="space-y-4">
            <h3 className="font-bold">Where can they go?</h3>
            <div className="flex flex-wrap gap-2">{(meta.areaDetails || []).map((a) => (
              <button type="button" key={a.name} onClick={() => setF({ ...f, areas: toggle(f.areas, a.name) })} className={cx("flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition", f.areas.includes(a.name) ? "border-teal-400 bg-teal-500/15 text-teal-700 dark:text-teal-300" : "border-slate-300/60 dark:border-white/10")}>
                {a.requiresApproval && <Lock size={12} />}{a.name}</button>))}</div>
            {restricted.length > 0 && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"><Lock size={13} className="mr-1 inline" /> {restricted.map((a) => a.name).join(", ")} need an admin&apos;s approval. Entry is refused there until it is granted.</p>}
            <Field label="Notes for yourself (not shown to the visitor)"><Textarea rows={2} maxLength={500} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="space-y-4">
            <h3 className="font-bold">When?</h3>
            <Field label="Purpose"><Select value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>{PURPOSES.map((p) => <option key={p}>{p}</option>)}</Select></Field>
            <Field label={multiDay ? "First day" : "Date"}><Input type="date" required min={today} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Switch checked={multiDay} onChange={setMultiDay} label="Multi-day pass" />
            {multiDay && <Field label="Last day" hint="The same daily time window applies on every day."><Input type="date" required min={f.date} max={addDays(f.date, 30)} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>}
            <div className="grid grid-cols-2 gap-3"><Field label="From"><Input type="time" required value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field><Field label="To"><Input type="time" required value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field></div>
            {hours && <p className="text-xs text-slate-500">Site hours {hours.from}–{hours.to}{closed.length ? ` · closed on ${closed.slice(0, 3).join(", ")}${closed.length > 3 ? "…" : ""}` : ""}. A window that ends before it starts runs overnight.</p>}
            {!editId && people.length === 1 && (<>
              <Switch checked={repeat.on} onChange={(v) => setRepeat({ ...repeat, on: v })} label="Repeat weekly" />
              {repeat.on && <div className="space-y-3 rounded-xl bg-teal-500/5 p-3"><p className="flex items-center gap-2 text-xs font-semibold"><Repeat size={13} /> On these days</p>
                <div className="flex flex-wrap gap-1.5">{WEEKDAYS.map((d, i) => <button type="button" key={d} onClick={() => setRepeat({ ...repeat, weekdays: toggle(repeat.weekdays, i) })} className={cx("rounded-lg px-2.5 py-1 text-xs font-bold", repeat.weekdays.includes(i) ? "bg-teal-500 text-white" : "bg-slate-500/10")}>{d}</button>)}</div>
                <Field label="Until"><Input type="date" required min={addDays(f.date, 1)} value={repeat.until} onChange={(e) => setRepeat({ ...repeat, until: e.target.value })} /></Field></div>}</>)}
          </Card>
          <Card className="space-y-3">
            <h3 className="font-bold">Extras</h3>
            <div className="grid grid-cols-2 gap-3"><Field label="Vehicle plate"><Input maxLength={15} value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value.toUpperCase() })} /></Field><Field label="Type"><Input maxLength={20} placeholder="Car, bike…" value={f.vehicleType} onChange={(e) => setF({ ...f, vehicleType: e.target.value })} /></Field></div>
            <div><p className="label">Send the pass by</p><div className="flex gap-2">{[["email", "Email"], ["sms", "SMS"], ["whatsapp", "WhatsApp"]].map(([k, l]) => <button type="button" key={k} onClick={() => setF({ ...f, via: f.via.includes(k) ? (f.via.length > 1 ? f.via.filter((x) => x !== k) : f.via) : [...f.via, k] })} className={cx("rounded-full border px-3 py-1 text-xs font-bold", f.via.includes(k) ? "border-teal-400 bg-teal-500/15 text-teal-700 dark:text-teal-300" : "border-slate-300/60 dark:border-white/10")}>{l}</button>)}</div></div>
          </Card>
          {err && <p className="rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300">{err}</p>}
          <Button size="lg" className="w-full" loading={busy} disabled={!f.areas.length}>{editId ? "Save changes" : people.length > 1 ? `Register ${people.length} visitors` : repeat.on ? "Schedule series" : "Register visitor"}</Button>
        </div>
      </form>
    </>
  );
}
