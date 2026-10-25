import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, IdCard, UserCheck, XCircle } from "lucide-react";
import api, { errMsg } from "../api/api";
import { useFetch } from "../lib/hooks";
import { Badge, Button, Card, ErrorBox, Spinner } from "../components/ui";
import ThemeToggle from "../components/ThemeToggle";

/** Opened from the host's email: approve or deny a walk-in with one tap (the long random token in the URL is the credential). */
export default function Approve() {
  const { id, token } = useParams(); const [sp] = useSearchParams(); const pre = sp.get("d");
  const { data: v, loading, error, reload } = useFetch(() => api.get(`/approvals/${id}/${token}`), [id, token]);
  const [done, setDone] = useState(""); const [busy, setBusy] = useState(""); const [err, setErr] = useState("");
  const decide = async (decision) => { setBusy(decision); setErr(""); try { await api.post(`/approvals/${id}/${token}`, { decision }); setDone(decision); } catch (e) { setErr(errMsg(e)); reload(true); } finally { setBusy(""); } };
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <header className="mb-6 flex items-center justify-between"><Link to="/" className="flex items-center gap-2 font-extrabold"><IdCard className="text-teal-500" /> Visit<span className="gradient-text">Pass</span></Link><ThemeToggle /></header>
      {loading ? <Spinner /> : error ? <ErrorBox message="This link is invalid or has expired." /> : done ? (
        <Card className="space-y-3 text-center">{done === "approve" ? <CheckCircle2 size={48} className="mx-auto text-emerald-500" /> : <XCircle size={48} className="mx-auto text-rose-500" />}
          <h1 className="text-xl font-extrabold">{done === "approve" ? "Visitor approved" : "Visitor declined"}</h1><p className="text-sm text-slate-500">{v.visitorName} has been {done === "approve" ? "told they can enter" : "asked to speak to reception"}.</p></Card>
      ) : (
        <Card className="space-y-5"><div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-500/15 text-teal-600"><UserCheck size={30} /></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Waiting at reception</p><h1 className="text-xl font-extrabold">{v.visitorName}</h1><p className="text-sm text-slate-500">{v.company || "No company given"} · {v.purpose}</p></div></div>
          {v.status !== "pending_approval" ? <Badge tone="slate">This request was already handled ({v.status.replace("_", " ")})</Badge> : (<>
            {err && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-600">{err}</p>}
            <div className="grid grid-cols-2 gap-3"><Button variant="danger" size="lg" loading={busy === "deny"} className={pre === "deny" ? "ring-4 ring-rose-400/40" : ""} onClick={() => decide("deny")}>Deny</Button>
              <Button variant="success" size="lg" loading={busy === "approve"} className={pre === "approve" ? "ring-4 ring-emerald-400/40" : ""} onClick={() => decide("approve")}>Approve</Button></div></>)}
        </Card>)}
    </div>
  );
}
