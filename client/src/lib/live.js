import { useEffect, useRef } from "react";

// One shared Server-Sent-Events connection; pages subscribe to refresh themselves instantly (no polling).
const TYPES = ["visit.created", "visit.checked_in", "visit.checked_out", "visit.denied", "visit.cancelled", "visit.no_show", "visit.overstay", "visit.walkin_pending",
  "visit.approved", "visit.rejected", "visit.declaration_flagged", "visit.declaration_cleared"];
let source = null;
const subs = new Set();

export function connectLive() {
  if (source || typeof EventSource === "undefined") return;
  source = new EventSource("/api/events", { withCredentials: true });
  TYPES.forEach((t) => source.addEventListener(t, (e) => { try { const d = JSON.parse(e.data); subs.forEach((fn) => fn(d)); } catch { /* ignore */ } }));
}
export function disconnectLive() { source?.close(); source = null; }
/** handler(eventObject). Optional `types` narrows what triggers it. */
export function useLive(handler, types) {
  const ref = useRef(handler); ref.current = handler;
  useEffect(() => { const fn = (e) => (!types || types.includes(e.type)) && ref.current(e); subs.add(fn); return () => subs.delete(fn); }, []); // eslint-disable-line
}
