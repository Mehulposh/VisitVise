import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, IdCard, Search, UserRound, XCircle } from "lucide-react";
import api, { errMsg } from "../api/api";
import { useDebounced, useInterval } from "../lib/hooks";
import { Button, Card, Field, Input, Select, Spinner } from "../components/ui";
import PassBadge from "../components/PassBadge";
import PhotoCapture from "../components/PhotoCapture";
import ThemeToggle from "../components/ThemeToggle";
import { PURPOSES, cx } from "../lib/utils";

/** Reception kiosk for visitors without an invitation: pick a host, give your details, wait for approval, get your badge. */
export default function Kiosk() {
  const [sp] = useSearchParams();
  const key = sp.get("key") || sessionStorage.getItem("vv-kiosk-key") || "";
  useEffect(() => { if (sp.get("key")) sessionStorage.setItem("vv-kiosk-key", sp.get("key")); }, [sp]);
  const hdr = key ? { "x-kiosk-key": key } : {};

  const [step, setStep] = useState("host"); const [q, setQ] = useState(""); const dq = useDebounced(q); const [hosts, setHosts] = useState([]); const [host, setHost] = useState(null);
  const [f, setF] = useState({ visitorName: "", company: "", phone: "", email: "", purpose: "Meeting", consent: false }); const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [code, setCode] = useState(""); const [pass, setPass] = useState(null);

  useEffect(() => { if (dq.trim().length < 2) { setHosts([]); return; } api.get("/walkin/hosts", { params: { q: dq.trim() }, headers: hdr }).then((r) => setHosts(r.data)).catch((e) => setErr(errMsg(e))); }, [dq]); // eslint-disable-line
  useInterval(() => { if (step === "wait" && code) api.get(`/pass/${code}`).then((r) => setPass(r.data)).catch(() => {}); }, 3000);

  const reset = () => { setStep("host"); setQ(""); setHosts([]); setHost(null); setF({ visitorName: "", company: "", phone: "", email: "", purpose: "Meeting", consent: false }); setPhoto(null); setCode(""); setPass(null); setErr(""); };
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const fd = new FormData();
      Object.entries({ ...f, hostId: host.id }).forEach(([k, v]) => v !== "" && fd.append(k, v)); if (photo) fd.append("photo", photo);
      const { data } = await api.post("/walkin", fd, { headers: hdr }); setCode(data.code); setStep("wait");
    } catch (er) { setErr(errMsg(er)); } finally { setBusy(false); }
  };
  const st = pass?.status;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
      <header className="mb-6 flex items-center justify-between"><Link to="/" className="flex items-center gap-2 font-extrabold"><IdCard className="text-teal-500" /> Visit<span className="gradient-text">Pass</span> <span className="ml-2 rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-bold text-teal-600 dark:text-teal-300">Reception</span></Link><ThemeToggle /></header>
      <main className="flex flex-1 items-center justify-center">
        <div className="w-full animate-rise">
          {step === "host" && (
            <Card className="space-y-5 !p-7"><h1 className="text-3xl font-black">Welcome 👋 <span className="gradient-text">Who are you here to see?</span></h1>
              <div className="relative"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><Input autoFocus className="!py-3.5 pl-10 text-base" placeholder="Type your host's name…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              {err && <p className="text-sm text-rose-500">{err}</p>}
              <div className="grid gap-2 sm:grid-cols-2">{hosts.map((h) => <button key={h.id} onClick={() => { setHost(h); setStep("details"); setErr(""); }} className="glass flex items-center gap-3 rounded-2xl p-4 text-left transition hover:scale-[1.02]"><span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-blue-600 font-bold text-white">{h.name[0]}</span><span><b>{h.name}</b>{h.department && <span className="block text-xs text-slate-500">{h.department}</span>}</span></button>)}</div>
              {dq.trim().length >= 2 && !hosts.length && <p className="text-sm text-slate-500">No match. Try another spelling, or ask reception.</p>}
            </Card>)}
          {step === "details" && (
            <Card className="!p-7"><button onClick={() => setStep("host")} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-600 dark:text-teal-300"><ArrowLeft size={15} /> Change host</button>
              <h1 className="text-2xl font-black">Visiting <span className="gradient-text">{host.name}</span></h1>
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2"><Field label="Your name"><Input required maxLength={80} value={f.visitorName} onChange={(e) => setF({ ...f, visitorName: e.target.value })} /></Field><Field label="Company"><Input maxLength={80} value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
                  <Field label="Mobile"><Input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field><Field label="Email (optional, for your pass)"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field></div>
                <Field label="Purpose"><Select value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })}>{PURPOSES.map((p) => <option key={p}>{p}</option>)}</Select></Field>
                <PhotoCapture onFile={setPhoto} label="Take your photo" />
                <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1 h-4 w-4 accent-teal-600" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /><span>I agree that my details and photo are stored for this visit and used only for site security.</span></label>
                {err && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300">{err}</p>}
                <Button size="lg" className="w-full" loading={busy}>Notify {host.name.split(" ")[0]}</Button></form></Card>)}
          {step === "wait" && (
            <div className="space-y-5 text-center">
              {(!st || st === "pending_approval") && <Card className="space-y-4 !p-8"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-amber-500/15 text-amber-500"><Clock size={38} className="animate-pulse" /></div><h1 className="text-2xl font-black">Waiting for {host?.name}…</h1><p className="text-slate-600 dark:text-slate-300">We have notified them. This screen updates automatically.</p><Spinner className="!py-2" /></Card>}
              {st && st !== "pending_approval" && st !== "expected" && <Card className="space-y-4 !p-8"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-rose-500/15 text-rose-500"><XCircle size={38} /></div><h1 className="text-2xl font-black">Not approved this time</h1><p className="text-slate-600 dark:text-slate-300">Please speak to the reception desk.</p><Button onClick={reset}>Start over</Button></Card>}
              {st === "expected" && <><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"><CheckCircle2 size={34} /></div><h1 className="text-2xl font-black">You are approved</h1><p className="text-slate-600 dark:text-slate-300">Show this badge to the guard.</p><div className="flex justify-center"><PassBadge pass={pass} /></div><Button variant="ghost" onClick={reset}>Next visitor</Button></>}
            </div>)}
        </div>
      </main>
    </div>
  );
}
