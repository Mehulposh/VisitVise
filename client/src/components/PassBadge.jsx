import { CalendarClock, MapPin, User } from "lucide-react";
import { photoUrl, qrUrl } from "../api/api";
import { Badge, StatusBadge } from "./ui";
import { when } from "../lib/utils";

/** The visitor badge (also what gets printed: everything else is hidden by the print stylesheet). `pass` = GET /api/pass/:code */
export default function PassBadge({ pass, className = "" }) {
  return (
    <div className={`print-area glass-strong w-full max-w-sm overflow-hidden rounded-3xl ${className}`}>
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-3 text-white">
        <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.2em]">Visitor</span><span className="text-xs opacity-90">{pass.siteName}</span></div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-4">
          {pass.hasPhoto ? <img src={photoUrl(pass.code)} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-teal-400/50" />
            : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-300"><User size={34} /></div>}
          <div className="min-w-0"><h2 className="truncate text-xl font-extrabold">{pass.visitorName}</h2>{pass.company && <p className="truncate text-sm text-slate-500 dark:text-slate-400">{pass.company}</p>}<div className="mt-1.5"><StatusBadge status={pass.status} /></div></div>
        </div>
        <div className="space-y-1.5 text-sm">
          <p className="flex items-center gap-2"><User size={15} className="text-teal-500" /> Host: <b>{pass.hostName}</b></p>
          <p className="flex items-center gap-2"><CalendarClock size={15} className="text-teal-500" /> {when(pass)}</p>
          <p className="flex flex-wrap items-center gap-1.5"><MapPin size={15} className="text-teal-500" />{(pass.areas || []).map((a) => <Badge key={a} tone="slate">{a}</Badge>)}</p>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-black/5">
          <img src={qrUrl(pass.code)} alt="QR code of this pass" className="h-28 w-28" />
          <div className="min-w-0 text-slate-800"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pass code</p><p className="break-all font-mono text-xl font-black tracking-widest">{pass.code}</p><p className="mt-1 text-xs text-slate-500">Show this at the gate</p></div>
        </div>
      </div>
    </div>
  );
}
