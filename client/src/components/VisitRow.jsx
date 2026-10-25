import { Link } from "react-router-dom";
import { Check, ExternalLink, Pencil, Send, X } from "lucide-react";
import api, { errMsg } from "../api/api";
import { useToast } from "../context/ToastContext";
import { Badge, Button, Initials, StatusBadge } from "./ui";
import { when, fmtTime } from "../lib/utils";

/** One visitor line with context-aware actions. `onChanged` reloads the list after an action. */
export default function VisitRow({ v, onChanged }) {
  const toast = useToast();
  const run = async (fn, ok) => { try { await fn(); toast(ok); onChanged?.(); } catch (e) { toast(errMsg(e), "error"); } };
  const editable = v.status === "expected";
  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3.5 transition hover:shadow-lg">
      <Link to={`/visits/${v.id}`} className="flex min-w-0 flex-1 basis-60 items-center gap-3">
        <Initials name={v.visitorName} size={44} />
        <div className="min-w-0"><p className="truncate font-bold">{v.visitorName}{v.walkIn && <Badge tone="violet" className="ml-2">walk-in</Badge>}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{v.company || "—"} · {when(v)}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{(v.areas || []).join(", ")}{v.checkIn ? ` · in ${fmtTime(v.checkIn)}` : ""}{v.checkOut ? ` · out ${fmtTime(v.checkOut)}` : ""}</p></div>
      </Link>
      <StatusBadge status={v.status} />
      <div className="flex flex-wrap items-center gap-1.5">
        {v.status === "pending_approval" && (<>
          <Button size="sm" variant="success" onClick={() => run(() => api.post(`/visits/${v.id}/decision`, { decision: "approve" }), "Visitor approved")}><Check size={14} /> Approve</Button>
          <Button size="sm" variant="ghost" className="!text-rose-600" onClick={() => run(() => api.post(`/visits/${v.id}/decision`, { decision: "deny" }), "Visitor declined")}><X size={14} /> Deny</Button></>)}
        {editable && <Link to={`/visits/new?edit=${v.id}`}><Button size="sm" variant="ghost" title="Edit or reschedule"><Pencil size={14} /></Button></Link>}
        {editable && (v.email || v.phone) && <Button size="sm" variant="ghost" title="Resend the pass" onClick={() => run(() => api.post(`/visits/${v.id}/resend`), "Pass sent again")}><Send size={14} /></Button>}
        <a href={`/pass/${v.code}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" title="Open the visitor pass"><ExternalLink size={14} /></Button></a>
        {["expected", "pending_approval"].includes(v.status) && <Button size="sm" variant="ghost" className="!text-rose-600" title="Cancel visit" onClick={() => window.confirm(`Cancel the visit of ${v.visitorName}?`) && run(() => api.patch(`/visits/${v.id}`, { status: "cancelled" }), "Visit cancelled")}><X size={14} /></Button>}
      </div>
    </div>
  );
}
