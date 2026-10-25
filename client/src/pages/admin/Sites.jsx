import { useEffect, useState } from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import api, { errMsg } from "../../api/api.js";
import { useFetch } from "../../lib/hooks";
import { useToast } from "../../context/ToastContext";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Spinner, Switch, Textarea } from "../../components/ui";
import { Table } from "../../components/Table";
import { WEEKDAYS, cx } from "../../lib/utils";

export function Sites() {
  const toast = useToast(); const { data, loading, reload } = useFetch(() => api.get("/admin/sites"), []);
  const [id, setId] = useState(""); const [f, setF] = useState(null); const [blackout, setBlackout] = useState(""); const [open, setOpen] = useState(false); const [nf, setNf] = useState({ name: "", code: "", timezone: "Asia/Kolkata" }); const [busy, setBusy] = useState(false);
  const site = data?.find((s) => s._id === id) || data?.[0];
  useEffect(() => { if (site) { setId(site._id); setF({ name: site.name, address: site.address || "", timezone: site.timezone, workingHours: { ...site.workingHours }, workingDays: [...site.workingDays], blackoutDates: [...site.blackoutDates], requireAgreement: !!site.requireAgreement, agreementText: site.agreementText || "", requireHealthDeclaration: !!site.requireHealthDeclaration, walkinHours: site.walkinHours, graceMinutes: site.graceMinutes, retentionDays: site.retentionDays }); } }, [site?._id, data]); // eslint-disable-line
  if (loading && !data) return <Spinner />;
  if (!f) return null;
  const save = async () => { setBusy(true); try { await api.patch(`/admin/sites/${site._id}`, { ...f, walkinHours: Number(f.walkinHours), graceMinutes: Number(f.graceMinutes), retentionDays: Number(f.retentionDays) }); toast("Policy saved"); reload(true); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); } };
  const create = async (e) => { e.preventDefault(); try { await api.post("/admin/sites", nf); toast("Site created with the default areas"); setOpen(false); reload(true); } catch (er) { toast(errMsg(er), "error"); } };
  const addBlackout = () => { if (/^\d{4}-\d{2}-\d{2}$/.test(blackout) && !f.blackoutDates.includes(blackout)) { setF({ ...f, blackoutDates: [...f.blackoutDates, blackout].sort() }); setBlackout(""); } };
  return (
    <>
      <PageHeader title="Sites & policy" subtitle="Opening hours, closures, agreements, walk-ins and data retention" action={<div className="flex gap-2"><Select className="!w-48" value={id} onChange={(e) => setId(e.target.value)}>{data.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</Select><Button variant="ghost" onClick={() => setOpen(true)}><Plus size={16} /> Site</Button></div>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4"><h3 className="font-bold">Site</h3>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Timezone (IANA)"><Input value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} /></Field></div>
          <Field label="Address"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4"><Field label="Opens"><Input type="time" value={f.workingHours.from} onChange={(e) => setF({ ...f, workingHours: { ...f.workingHours, from: e.target.value } })} /></Field><Field label="Closes"><Input type="time" value={f.workingHours.to} onChange={(e) => setF({ ...f, workingHours: { ...f.workingHours, to: e.target.value } })} /></Field></div>
          <div><p className="label">Working days</p><div className="flex flex-wrap gap-1.5">{WEEKDAYS.map((d, i) => <button type="button" key={d} onClick={() => setF({ ...f, workingDays: f.workingDays.includes(i) ? f.workingDays.filter((x) => x !== i) : [...f.workingDays, i].sort() })} className={cx("rounded-lg px-3 py-1.5 text-xs font-bold", f.workingDays.includes(i) ? "bg-teal-500 text-white" : "bg-slate-500/10")}>{d}</button>)}</div></div>
          <div><p className="label">Closed dates (holidays)</p><div className="flex gap-2"><Input type="date" value={blackout} onChange={(e) => setBlackout(e.target.value)} /><Button variant="soft" onClick={addBlackout}>Add</Button></div>
            <div className="mt-2 flex flex-wrap gap-1.5">{f.blackoutDates.map((d) => <Badge key={d} tone="rose">{d}<button className="ml-1" aria-label={`Remove ${d}`} onClick={() => setF({ ...f, blackoutDates: f.blackoutDates.filter((x) => x !== d) })}>×</button></Badge>)}</div></div>
        </Card>
        <Card className="space-y-4"><h3 className="font-bold">Rules</h3>
          <Switch checked={f.requireAgreement} onChange={(v) => setF({ ...f, requireAgreement: v })} label="Visitors must sign an agreement / NDA before entry" />
          {f.requireAgreement && <Field label="Agreement text" hint="Changing the text asks every visitor to sign again."><Textarea rows={5} maxLength={5000} value={f.agreementText} onChange={(e) => setF({ ...f, agreementText: e.target.value })} /></Field>}
          <Switch checked={f.requireHealthDeclaration} onChange={(v) => setF({ ...f, requireHealthDeclaration: v })} label="Visitors must answer a health declaration" />
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Walk-in pass (hours)"><Input type="number" min="1" max="12" value={f.walkinHours} onChange={(e) => setF({ ...f, walkinHours: e.target.value })} /></Field>
            <Field label="Auto check-out after (min)" hint="past the window"><Input type="number" min="0" max="240" value={f.graceMinutes} onChange={(e) => setF({ ...f, graceMinutes: e.target.value })} /></Field>
            <Field label="Keep data (days)" hint="0 = forever"><Input type="number" min="0" max="3650" value={f.retentionDays} onChange={(e) => setF({ ...f, retentionDays: e.target.value })} /></Field></div>
          <Button loading={busy} onClick={save}>Save policy</Button></Card>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="New site"><form onSubmit={create} className="space-y-4"><Field label="Name"><Input required value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Code"><Input required maxLength={12} value={nf.code} onChange={(e) => setNf({ ...nf, code: e.target.value.toUpperCase() })} /></Field><Field label="Timezone"><Input value={nf.timezone} onChange={(e) => setNf({ ...nf, timezone: e.target.value })} /></Field></div><Button className="w-full">Create site</Button></form></Modal>
    </>
  );
}

export function Areas() {
  const toast = useToast(); const sites = useFetch(() => api.get("/admin/sites"), []); const [siteId, setSiteId] = useState("");
  const sid = siteId || sites.data?.[0]?._id;
  const { data, loading, reload } = useFetch(() => (sid ? api.get("/admin/areas", { params: { siteId: sid } }) : Promise.resolve({ data: [] })), [sid]);
  const [edit, setEdit] = useState(null);
  const save = async (e) => {
    e.preventDefault();
    try { const b = { name: edit.name, capacity: Number(edit.capacity) || 0, requiresApproval: !!edit.requiresApproval }; if (edit._id) await api.patch(`/admin/areas/${edit._id}`, { ...b, active: edit.active !== false }); else await api.post("/admin/areas", { ...b, siteId: sid }); toast("Area saved"); setEdit(null); reload(true); }
    catch (er) { toast(errMsg(er), "error"); }
  };
  return (
    <>
      <PageHeader title="Areas" subtitle="Where visitors can go. Capacity limits how many can be inside at once; sensitive areas need an admin's approval."
        action={<div className="flex gap-2">{sites.data?.length > 1 && <Select className="!w-44" value={sid} onChange={(e) => setSiteId(e.target.value)}>{sites.data.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</Select>}<Button onClick={() => setEdit({ name: "", capacity: 0, requiresApproval: false })}><Plus size={16} /> Area</Button></div>} />
      {loading && !data ? <Spinner /> : !data?.length ? <Card><Empty title="No areas yet" /></Card> : (
        <Table head={["Area", "Capacity", "Access", "Status", ""]} min={620}>{data.map((a) => (
          <tr key={a._id}><td className="p-4 font-semibold">{a.name}</td><td>{a.capacity ? a.capacity : <span className="text-slate-400">unlimited</span>}</td><td>{a.requiresApproval ? <Badge tone="amber"><Lock size={11} /> needs approval</Badge> : <Badge tone="slate">open to invited</Badge>}</td>
            <td>{a.active === false ? <Badge tone="rose">Disabled</Badge> : <Badge tone="emerald">Active</Badge>}</td>
            <td className="pr-4"><div className="flex justify-end gap-1.5"><Button size="sm" variant="ghost" onClick={() => setEdit(a)}><Pencil size={14} /></Button>{a.active !== false && <Button size="sm" variant="ghost" className="!text-rose-600" title="Disable" onClick={() => window.confirm(`Disable ${a.name}? Old visits keep it.`) && api.delete(`/admin/areas/${a._id}`).then(() => { toast("Disabled"); reload(true); }).catch((e) => toast(errMsg(e), "error"))}><Trash2 size={14} /></Button>}</div></td></tr>))}</Table>)}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? "Edit area" : "New area"}>{edit && (
        <form onSubmit={save} className="space-y-4"><Field label="Name"><Input required maxLength={50} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <Field label="Capacity (people inside at once, 0 = unlimited)"><Input type="number" min="0" value={edit.capacity} onChange={(e) => setEdit({ ...edit, capacity: e.target.value })} /></Field>
          <Switch checked={!!edit.requiresApproval} onChange={(v) => setEdit({ ...edit, requiresApproval: v })} label="Sensitive: an admin must approve each visitor" />
          {edit._id && <Switch checked={edit.active !== false} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" />}<Button className="w-full">Save</Button></form>)}</Modal>
    </>
  );
}
