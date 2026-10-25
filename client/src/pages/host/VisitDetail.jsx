import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarPlus, CheckCircle2, ExternalLink, Pencil, XCircle } from "lucide-react";
import api, { errMsg } from "../../api/api.js";
import { useFetch } from "../../lib/hooks";
import { useLive } from "../../lib/live";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Badge, Button, Card, ErrorBox, Spinner, StatusBadge } from "../../components/ui";
import PassBadge from "../../components/PassBadge";
import { fmtDT, when } from "../../lib/utils";

const Row = ({ k, children }) => children ? <div className="flex justify-between gap-4 border-b border-slate-500/10 py-2 text-sm last:border-0"><span className="text-slate-500 dark:text-slate-400">{k}</span><span className="text-right font-semibold">{children}</span></div> : null;

export default function VisitDetail() {
  const { id } = useParams(); const nav = useNavigate(); const toast = useToast(); const { meta } = useAuth();
  const { data: v, loading, error, reload } = useFetch(() => api.get(`/visits/${id}`), [id]);
  useLive((e) => e.visitId === id && reload(true));
  const run = async (fn, ok) => { try { await fn(); toast(ok); reload(true); } catch (e) { toast(errMsg(e), "error"); } };
  if (loading && !v) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  const editable = v.status === "expected", cancellable = ["expected", "pending_approval"].includes(v.status);
  return (
    <>
      <button onClick={() => nav(-1)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 dark:text-teal-300"><ArrowLeft size={16} /> Back</button>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold">{v.visitorName}</h1><StatusBadge status={v.status} /></div>
            <Row k="Company">{v.company}</Row><Row k="When">{when(v)}</Row><Row k="Host">{v.hostName}</Row><Row k="Purpose">{v.purpose}</Row><Row k="Areas">{(v.areas || []).join(", ")}</Row>
            <Row k="Needs admin approval">{(v.areas || []).filter((a) => (meta.areaDetails || []).some((x) => x.name === a && x.requiresApproval && !(v.approvedAreas || []).includes(a))).join(", ")}</Row>
            <Row k="Email">{v.email}</Row><Row k="Phone">{v.phone}</Row><Row k="Vehicle">{v.vehicle?.plate && `${v.vehicle.plate}${v.vehicle.type ? ` (${v.vehicle.type})` : ""}${v.vehicle.slot ? ` · slot ${v.vehicle.slot}` : ""}`}</Row>
            <Row k="Checked in">{v.checkIn && fmtDT(v.checkIn)}</Row><Row k="Checked out">{v.checkOut && `${fmtDT(v.checkOut)}${v.autoCheckout ? " (automatic)" : ""}`}</Row>
            <Row k="Agreement">{v.agreement?.accepted ? <Badge tone="emerald">signed by {v.agreement.name}</Badge> : null}</Row><Row k="Health declaration">{v.declaration?.at ? <Badge tone={v.declaration.flagged ? "rose" : "emerald"}>{v.declaration.flagged ? "flagged" : "clear"}</Badge> : null}</Row>
            <Row k="ID provided">{v.idDoc?.provided ? `${v.idDoc.type}${v.idDoc.last4 ? ` ····${v.idDoc.last4}` : ""}` : null}</Row><Row k="Notes">{v.notes}</Row>
            <div className="mt-4 flex flex-wrap gap-2">
              {editable && <Link to={`/visits/new?edit=${v.id}`}><Button variant="soft" size="sm"><Pencil size={14} /> Edit / reschedule</Button></Link>}
              {v.status === "pending_approval" && <><Button size="sm" variant="success" onClick={() => run(() => api.post(`/visits/${v.id}/decision`, { decision: "approve" }), "Approved")}><CheckCircle2 size={14} /> Approve</Button><Button size="sm" variant="ghost" className="!text-rose-600" onClick={() => run(() => api.post(`/visits/${v.id}/decision`, { decision: "deny" }), "Declined")}><XCircle size={14} /> Deny</Button></>}
              {editable && (v.email || v.phone) && <Button size="sm" variant="ghost" onClick={() => run(() => api.post(`/visits/${v.id}/resend`), "Pass sent again")}>Resend pass</Button>}
              <a href={`/api/visits/${v.id}/ics`}><Button size="sm" variant="ghost"><CalendarPlus size={14} /> Calendar</Button></a>
              <a href={`/pass/${v.code}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost"><ExternalLink size={14} /> Visitor page</Button></a>
              {cancellable && <Button size="sm" variant="ghost" className="!text-rose-600" onClick={() => window.confirm("Cancel this visit?") && run(() => api.patch(`/visits/${v.id}`, { status: "cancelled" }), "Cancelled")}>Cancel visit</Button>}
            </div>
          </Card>
          <Card><h3 className="mb-3 font-bold">Gate activity</h3>
            {!v.scans?.length ? <p className="text-sm text-slate-500">No scans yet.</p> : (
              <ol className="space-y-2.5">{v.scans.map((s, i) => <li key={i} className="flex items-center gap-3 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${s.ok ? "bg-emerald-500" : "bg-rose-500"}`} /><span className="w-40 shrink-0 text-slate-500">{fmtDT(s.at)}</span><span className="font-semibold">{s.area || s.mode}</span><span className="text-slate-500">· {s.reason}</span></li>)}</ol>)}
          </Card>
        </div>
        <div className="flex justify-center lg:justify-start"><PassBadge pass={{ ...v, siteName: meta.site?.name }} /></div>
      </div>
    </>
  );
}
