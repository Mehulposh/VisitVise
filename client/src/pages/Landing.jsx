import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, BellRing, IdCard, MapPin, QrCode, ShieldCheck, UserCheck } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { Button, Card } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const HOME = { user: "/dashboard", security: "/gate", admin: "/admin" };
const FEATURES = [
  [QrCode, "QR passes in seconds", "Hosts invite visitors; each gets an emailed pass with a QR code and a calendar invite."],
  [ShieldCheck, "A gate that decides", "Scan at the door: dates, time windows, areas, capacity, blocklist and agreements are all checked for you."],
  [UserCheck, "Walk-ins, approved by the host", "Visitors without an invite use the kiosk. The host approves from an email link in one tap."],
  [MapPin, "Area-level access", "Lobby, lab, server room: sensitive areas need an admin to approve first."],
  [BellRing, "Live alerts", "Arrivals, refusals, no-shows and overstays reach hosts and security the moment they happen."],
  [BarChart3, "Insight and compliance", "Peak hours, no-show rate, audit trail, roll-call lists for emergencies, data retention."],
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="glass sticky top-3 z-30 mt-3 flex items-center justify-between rounded-2xl px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 text-white"><IdCard size={18} /></span><span className="text-lg font-extrabold">Visit<span className="gradient-text">Pass</span></span></Link>
        <div className="flex items-center gap-2"><ThemeToggle />
          {user ? <Link to={HOME[user.role]}><Button size="sm">Open app</Button></Link> : <><Link to="/login" className="hidden sm:block"><Button variant="ghost" size="sm">Log in</Button></Link><Link to="/register"><Button size="sm">Get started</Button></Link></>}</div>
      </header>
      <section className="grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
        <div className="animate-rise">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold"><ShieldCheck size={14} className="text-teal-500" /> Secure, private, audited</span>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">Welcome visitors <span className="gradient-text">without the paperwork</span></h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">Pre-register guests, scan them in at the gate, handle walk-ins and deliveries, and always know who is on site.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to={user ? HOME[user.role] : "/register"}><Button size="lg">Register a visitor <ArrowRight size={18} /></Button></Link><Link to="/kiosk"><Button size="lg" variant="ghost">I am a walk-in visitor</Button></Link></div>
        </div>
        <div className="relative animate-rise [animation-delay:150ms]">
          <Card className="mx-auto max-w-sm space-y-4 !p-0 overflow-hidden"><div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white">Visitor</div>
            <div className="space-y-3 p-5"><div className="flex items-center gap-3"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-500/15 text-2xl font-black text-teal-600">VR</div><div><p className="text-lg font-extrabold">Vera Rao</p><p className="text-sm text-slate-500">Northwind Traders</p></div></div>
              <p className="text-sm">Host: <b>Hari Menon</b> · 10:00–13:00 · Lobby, Meeting Rooms</p>
              <div className="grid h-28 w-28 grid-cols-6 gap-0.5 rounded-xl bg-white p-2">{Array.from({ length: 36 }).map((_, i) => <span key={i} className={[0, 1, 5, 6, 11, 14, 17, 20, 23, 24, 29, 30, 34, 35, 3, 9, 26].includes(i) ? "rounded-[1px] bg-slate-900" : ""} />)}</div></div></Card>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(([Icon, t, d]) => <Card key={t} className="transition hover:-translate-y-1"><div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-300"><Icon size={22} /></div><h3 className="font-bold">{t}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{d}</p></Card>)}
      </section>
    </div>
  );
}
