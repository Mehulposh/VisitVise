import { useState } from "react";
import { Camera, IdCard, LogOut, ShieldCheck } from "lucide-react";
import api, { errMsg, photoUrl } from "../api/api";
import { useToast } from "../context/ToastContext";
import { Badge, Button, Field, Input, Modal, Select, StatusBadge } from "./ui";
import PhotoCapture from "./PhotoCapture";
import { when } from "../lib/utils";

const ID_TYPES = [["aadhaar", "Aadhaar"], ["pan", "PAN"], ["driving_licence", "Driving licence"], ["passport", "Passport"], ["voter_id", "Voter ID"], ["other", "Other"]];

/** Guard-desk panel for one visitor: badge photo, ID image (deleted at check-out), vehicle, check-out, health review. */
export default function VisitActions({ visit: v, open, onClose, onChanged }) {
  const toast = useToast(); const [photo, setPhoto] = useState(null); const [doc, setDoc] = useState(null); const [idType, setIdType] = useState("aadhaar"); const [last4, setLast4] = useState("");
  const [veh, setVeh] = useState({ plate: v?.vehicle?.plate || "", type: v?.vehicle?.type || "", slot: v?.vehicle?.slot || "" }); const [busy, setBusy] = useState("");
  if (!v) return null;
  const run = async (key, fn, ok) => { setBusy(key); try { await fn(); toast(ok); onChanged?.(); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(""); } };
  const form = (field, file, extra = {}) => { const fd = new FormData(); fd.append(field, file); Object.entries(extra).forEach(([k, x]) => x && fd.append(k, x)); return fd; };
  return (
    <Modal open={open} onClose={onClose} wide title={v.visitorName}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3"><StatusBadge status={v.status} /><span className="text-sm text-slate-500">{v.company} · host {v.hostName} · {when(v)}</span>{v.currentArea && <Badge tone="emerald">in {v.currentArea}</Badge>}</div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3 rounded-2xl bg-slate-500/5 p-4"><h4 className="flex items-center gap-2 font-bold"><Camera size={16} className="text-teal-500" /> Badge photo</h4>
            {v.hasPhoto && !photo && <img src={`${photoUrl(v.code)}?t=${Date.now() % 1e6}`} alt="" className="h-24 w-24 rounded-2xl object-cover" />}
            <PhotoCapture onFile={setPhoto} />
            <Button size="sm" disabled={!photo} loading={busy === "p"} onClick={() => run("p", () => api.post(`/gate/visits/${v.id}/photo`, form("photo", photo)), "Photo saved")}>Save photo</Button></div>
          <div className="space-y-3 rounded-2xl bg-slate-500/5 p-4"><h4 className="flex items-center gap-2 font-bold"><IdCard size={16} className="text-teal-500" /> ID document {v.idDoc?.provided && <Badge tone="emerald">on file</Badge>}</h4>
            <div className="grid grid-cols-2 gap-2"><Select value={idType} onChange={(e) => setIdType(e.target.value)}>{ID_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select><Input placeholder="Last 4 digits" maxLength={4} inputMode="numeric" value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))} /></div>
            <PhotoCapture onFile={setDoc} label="Scan ID" facing="environment" />
            <Button size="sm" disabled={!doc} loading={busy === "i"} onClick={() => run("i", () => api.post(`/gate/visits/${v.id}/id-document`, form("document", doc, { idType, idLast4: last4.length === 4 ? last4 : "" })), "ID saved (deleted at check-out)")}>Save ID</Button></div>
        </div>
        <div className="rounded-2xl bg-slate-500/5 p-4"><h4 className="mb-3 font-bold">Vehicle and parking</h4>
          <div className="grid gap-2 sm:grid-cols-4"><Input placeholder="Plate" maxLength={15} value={veh.plate} onChange={(e) => setVeh({ ...veh, plate: e.target.value.toUpperCase() })} /><Input placeholder="Type" maxLength={20} value={veh.type} onChange={(e) => setVeh({ ...veh, type: e.target.value })} /><Input placeholder="Parking slot" maxLength={12} value={veh.slot} onChange={(e) => setVeh({ ...veh, slot: e.target.value })} />
            <Button variant="soft" loading={busy === "v"} onClick={() => run("v", () => api.patch(`/gate/visits/${v.id}/vehicle`, veh), "Vehicle saved")}>Save</Button></div></div>
        <div className="flex flex-wrap justify-end gap-2">
          {v.declaration?.flagged && <Button variant="ghost" loading={busy === "c"} onClick={() => run("c", () => api.post(`/gate/visits/${v.id}/clear-declaration`), "Health declaration cleared")}><ShieldCheck size={15} /> Clear health flag</Button>}
          {v.status === "checked_in" && <Button variant="danger" loading={busy === "o"} onClick={() => run("o", () => api.post(`/gate/visits/${v.id}/checkout`).then(onClose), "Checked out")}><LogOut size={15} /> Check out</Button>}
          <Button variant="ghost" onClick={onClose}>Close</Button></div>
      </div>
    </Modal>
  );
}
