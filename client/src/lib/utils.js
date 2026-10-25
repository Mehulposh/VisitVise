export const cx = (...a) => a.filter(Boolean).join(" ");
export const fmtDate = (d) => (!d ? "—" : new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }));
export const fmtDT = (d) => (!d ? "—" : new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
export const fmtTime = (d) => (!d ? "—" : new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
export const timeAgo = (d) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  for (const [l, v] of [["y", 31536000], ["mo", 2592000], ["d", 86400], ["h", 3600], ["m", 60]]) if (s >= v) return `${Math.floor(s / v)}${l} ago`;
  return "just now";
};
export const when = (v) => `${fmtDate(v.date)}${v.endDate && v.endDate !== v.date ? ` to ${fmtDate(v.endDate)}` : ""} · ${v.from}–${v.to}`;
export const minutesBetween = (a, b) => Math.max(0, Math.round((new Date(b || Date.now()) - new Date(a)) / 60000));
export const STATUS = {
  pending_approval: ["Waiting for host", "amber"], expected: ["Expected", "sky"], checked_in: ["On site", "emerald"], checked_out: ["Left", "slate"],
  cancelled: ["Cancelled", "slate"], no_show: ["No-show", "rose"], denied: ["Denied", "rose"],
};
export const PURPOSES = ["Meeting", "Interview", "Vendor visit", "Maintenance", "Training", "Personal", "Other"];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const todayStr = () => new Date().toLocaleDateString("en-CA");
export const nowHHMM = () => new Date().toTimeString().slice(0, 5);
export const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
