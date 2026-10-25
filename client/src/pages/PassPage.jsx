import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarPlus, Copy, FileSignature, HeartPulse, IdCard, Printer, Trash2 } from "lucide-react";
import api, { errMsg } from "../api/api";
import { useFetch, useInterval } from "../lib/hooks";
import { useToast } from "../context/ToastContext";
import { Button, Card, ErrorBox, Input, Spinner, Switch } from "../components/ui";
import PassBadge from "../components/PassBadge";
import ThemeToggle from "../components/ThemeToggle";

const MESSAGE = {
  pending_approval: ["amber", "Waiting for your host to approve this visit. This page updates by itself."],
  expected: ["sky", "You are expected. Show this badge (the QR code) at the gate."],
  checked_in: ["emerald", "You are checked in. Welcome!"],
  checked_out: ["slate", "Thanks for visiting. This pass is no longer valid."],
  cancelled: ["slate", "This visit was cancelled by the host."], denied: ["rose", "This visit was not approved. Please speak to reception."], no_show: ["rose", "This pass has expired."],
};
const TONE = { amber: "border-amber-400/50 bg-amber-500/10", sky: "border-sky-400/50 bg-sky-500/10", emerald: "border-emerald-400/50 bg-emerald-500/10", slate: "border-slate-400/40 bg-slate-500/10", rose: "border-rose-400/50 bg-rose-500/10" };
const QUESTIONS = [["fever", "Do you have a fever?"], ["cough", "Do you have a new cough or breathing difficulty?"], ["closeContact", "Were you in close contact with an infected person?"], ["recentTravel", "Have you travelled to a high-risk area recently?"]];

export default function PassPage() {
  const { code } = useParams(); const toast = useToast();
  const { data: p, loading, error, reload } = useFetch(() => api.get(`/pass/${code}`), [code]);
  const [name, setName] = useState(""); const [ans, setAns] = useState({ fever: false, cough: false, closeContact: false, recentTravel: false }); const [busy, setBusy] = useState(""); const [erased, setErased] = useState(false);
  useInterval(() => { if (p && ["pending_approval", "expected", "checked_in"].includes(p.status) && !document.hidden) reload(true); }, 5000);

  const run = async (key, fn, ok) => { setBusy(key); try { await fn(); if (ok) toast(ok); reload(true); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(""); } };
  const forget = async () => { if (!window.confirm("Erase your personal data from this visit? This cannot be undone.")) return; setBusy("f"); try { await api.post(`/pass/${code}/forget`); setErased(true); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(""); } };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="no-print mb-6 flex items-center justify-between"><Link to="/" className="flex items-center gap-2 font-extrabold"><IdCard className="text-teal-500" /> Visit<span className="gradient-text">Pass</span></Link><ThemeToggle /></header>
      {erased ? <Card className="text-center"><h1 className="text-xl font-extrabold">Your data was erased</h1><p className="mt-2 text-sm text-slate-500">This pass no longer exists. You can close this page.</p></Card>
        : loading && !p ? <Spinner /> : error ? <ErrorBox message="This pass was not found. Check the link or ask your host." /> : (
          <div className="space-y-5">
            <div className={`no-print rounded-2xl border p-4 text-sm font-medium ${TONE[MESSAGE[p.status][0]]}`}>{MESSAGE[p.status][1]}</div>
            <div className="flex justify-center"><PassBadge pass={p} /></div>
            <div className="no-print flex flex-wrap justify-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => window.print()}><Printer size={15} /> Print badge</Button>
              <a href={`/api/pass/${code}/ics`}><Button variant="ghost" size="sm"><CalendarPlus size={15} /> Add to calendar</Button></a>
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(p.link); toast("Link copied"); }}><Copy size={15} /> Copy link</Button>
            </div>
            {p.requireAgreement && !p.agreementAccepted && ["expected", "pending_approval", "checked_in"].includes(p.status) && (
              <Card className="no-print space-y-3"><h3 className="flex items-center gap-2 font-bold"><FileSignature size={18} className="text-teal-500" /> Site agreement</h3>
                <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-500/10 p-3 text-sm">{p.agreementText || "Please follow the site safety rules and keep information you see confidential."}</div>
                <Input placeholder="Type your full name to sign" value={name} onChange={(e) => setName(e.target.value)} />
                <Button loading={busy === "a"} disabled={name.trim().length < 2} onClick={() => run("a", () => api.post(`/pass/${code}/agreement`, { name }), "Thank you, agreement signed")}>I agree and sign</Button></Card>)}
            {p.requireHealthDeclaration && !p.declarationDone && ["expected", "pending_approval", "checked_in"].includes(p.status) && (
              <Card className="no-print space-y-4"><h3 className="flex items-center gap-2 font-bold"><HeartPulse size={18} className="text-rose-500" /> Health declaration</h3>
                {QUESTIONS.map(([k, q]) => <Switch key={k} checked={ans[k]} onChange={(v) => setAns({ ...ans, [k]: v })} label={q} />)}
                <Button loading={busy === "d"} onClick={() => run("d", () => api.post(`/pass/${code}/declaration`, { answers: ans }), "Declaration submitted")}>Submit declaration</Button></Card>)}
            {p.declarationFlagged && <div className="no-print rounded-2xl border border-amber-400/50 bg-amber-500/10 p-4 text-sm">Your declaration needs a quick review by security before you can enter.</div>}
            <div className="no-print text-center"><button onClick={forget} disabled={busy === "f" || p.status === "checked_in"} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-500 disabled:opacity-40"><Trash2 size={13} /> Erase my personal data</button></div>
          </div>)}
    </div>
  );
}
