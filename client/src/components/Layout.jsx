import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Ban, Bell, Building2, ClipboardList, IdCard, LayoutDashboard, LogOut, MapPin, Menu, PlusCircle, ScanLine, ScrollText, Settings, ShieldCheck, Siren, UserCog, Users, Webhook, X } from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useFetch, useInterval } from "../lib/hooks";
import { useLive } from "../lib/live";
import { Initials, LiveDot } from "./ui";
import ThemeToggle from "./ThemeToggle";
import { cx } from "../lib/utils";

const NAV = {
  user: [["/dashboard", "Dashboard", LayoutDashboard], ["/visits/new", "New visit", PlusCircle], ["/visits", "My visitors", ClipboardList]],
  security: [["/gate", "Gate desk", ScanLine]],
  admin: [["/admin", "Overview", LayoutDashboard], ["/gate", "Gate desk", ScanLine], ["/visits/new", "New visit", PlusCircle], ["/visits", "My visitors", ClipboardList], ["/admin/visits", "All visits", ClipboardList],
    ["/admin/approvals", "Approvals", ShieldCheck], ["/admin/users", "Users", Users], ["/admin/sites", "Sites & policy", Building2], ["/admin/areas", "Areas", MapPin], ["/admin/blocklist", "Blocklist", Ban],
    ["/admin/logs", "Logs", ScrollText], ["/admin/webhooks", "Webhooks", Webhook], ["/admin/tools", "Roll-call & export", Siren]],
};
const ROLE = { user: "Host", security: "Security", admin: "Admin" };

export default function Layout() {
  const { user, meta, logout } = useAuth(); const nav = useNavigate(); const toast = useToast();
  const [open, setOpen] = useState(false);
  const bell = useFetch(() => api.get("/notifications/unread-count"), []);
  useInterval(() => bell.reload(true), 60000);
  useEffect(() => { document.title = `${meta.site?.name || "VisitPass"} · VisitPass`; }, [meta.site]);

  // Live toasts from the server (host: own visitors; staff: whole site)
  useLive((e) => {
    const n = e.visitorName;
    if (e.type === "visit.checked_in") toast(`${n} has arrived${e.area ? ` (${e.area})` : ""}`);
    else if (e.type === "visit.denied") toast(`${n}: access refused${e.reason ? ` · ${e.reason}` : ""}`, "error");
    else if (e.type === "visit.walkin_pending") toast(`${n} is waiting at reception`, "info");
    else if (e.type === "visit.overstay") toast(`${n} is still on site after the visit window`, "error");
    else if (e.type === "visit.no_show") toast(`${n} did not arrive`, "info");
    else if (e.type === "visit.declaration_flagged") toast(`${n}: health declaration flagged`, "error");
    if (["visit.walkin_pending", "visit.checked_in", "visit.denied", "visit.overstay", "visit.no_show", "visit.declaration_flagged"].includes(e.type)) bell.reload(true);
  });

  const items = NAV[user.role] || NAV.user;
  const links = (
    <nav className="space-y-1">
      {items.map(([to, label, Icon]) => (
        <NavLink key={to} to={to} end onClick={() => setOpen(false)} className={({ isActive }) => cx("flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition", isActive ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/30" : "text-slate-600 hover:bg-slate-500/10 dark:text-slate-300")}><Icon size={18} /> {label}</NavLink>))}
    </nav>
  );
  const brand = (
    <Link to="/" className="flex items-center gap-2.5 px-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-lg shadow-teal-500/40"><IdCard size={20} /></span>
      <span className="text-lg font-extrabold tracking-tight">Visit<span className="gradient-text">Pass</span></span></Link>
  );
  const out = async () => { await logout(); nav("/"); };

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-5 p-3 sm:p-5">
      <aside className="glass sticky top-5 hidden h-[calc(100vh-2.5rem)] w-64 shrink-0 flex-col rounded-3xl p-4 lg:flex">
        {brand}<div className="mt-8 flex-1 overflow-y-auto">{links}</div>
        <Link to="/settings" className="mb-2 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-500/10 dark:text-slate-300"><Settings size={18} /> Settings</Link>
        <button onClick={out} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"><LogOut size={18} /> Log out</button>
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}><div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <aside onClick={(e) => e.stopPropagation()} className="glass-strong absolute bottom-3 left-3 top-3 w-72 animate-rise overflow-y-auto rounded-3xl p-4">
            <div className="mb-6 flex items-center justify-between">{brand}<button onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button></div>{links}
            <Link to="/settings" onClick={() => setOpen(false)} className="mt-3 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold"><Settings size={18} /> Settings</Link>
            <button onClick={out} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-rose-600"><LogOut size={18} /> Log out</button></aside></div>)}
      <div className="min-w-0 flex-1">
        <header className="glass sticky top-3 z-30 mb-5 flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:top-5 sm:px-4">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-500/10 lg:hidden"><Menu size={20} /></button>
          <p className="hidden items-center gap-2 text-sm text-slate-500 dark:text-slate-400 sm:flex"><LiveDot /> Live · {meta.site?.name || "Site"} · <b className="text-slate-800 dark:text-white">{ROLE[user.role]}</b></p>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link to="/notifications" aria-label="Notifications" className="glass relative grid h-10 w-10 place-items-center rounded-xl transition hover:scale-105"><Bell size={18} />
              {bell.data?.unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{bell.data.unread > 9 ? "9+" : bell.data.unread}</span>}</Link>
            <Link to="/settings" className="glass flex items-center gap-2 rounded-xl py-1 pl-1 pr-3 transition hover:scale-[1.02]"><Initials name={user.name} size={32} /><span className="hidden text-sm font-semibold sm:block">{user.name.split(" ")[0]}</span><UserCog size={14} className="hidden text-teal-500 sm:block" /></Link>
          </div>
        </header>
        <main className="animate-rise pb-10"><Outlet /></main>
      </div>
    </div>
  );
}
