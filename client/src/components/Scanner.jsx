import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

/** Camera QR scanner (html5-qrcode works on iOS, Android and desktop). onScan(text) fires for every decoded QR. */
export default function Scanner({ onScan, active = true }) {
  const id = useRef("qr-" + Math.random().toString(36).slice(2));
  const cb = useRef(onScan); cb.current = onScan;
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!active) return undefined;
    let scanner, stopped = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode(id.current);
        await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => cb.current(text), () => {});
        if (stopped) await scanner.stop();
      } catch { setErr("Camera not available. Allow camera access (HTTPS or localhost is required) or type the code."); }
    })();
    return () => { stopped = true; if (scanner?.isScanning) scanner.stop().then(() => scanner.clear()).catch(() => {}); };
  }, [active]);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-slate-900/90 ring-1 ring-white/10">
      <div id={id.current} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
      {!err && active && <div className="pointer-events-none absolute inset-x-[12%] animate-scanline">
        <div className="h-0.5 rounded-full bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_14px_2px_rgba(45,212,191,.8)]" /></div>}
      {(err || !active) && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/80"><div><CameraOff className="mx-auto mb-2" />{err || "Scanner paused"}</div></div>}
    </div>
  );
}
