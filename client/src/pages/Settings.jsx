import { useState } from "react";
import { UserCheck } from "lucide-react";
import api, { errMsg } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { Badge, Button, Card, Field, Initials, Input, PageHeader, Switch } from "../components/ui";

export default function Settings() {
  const { user, meta, refresh } = useAuth(); const { theme, toggle } = useTheme(); const toast = useToast();
  const [f, setF] = useState({ name: user.name, phone: user.phone || "", department: user.department || "", notifyEmail: user.notifyEmail !== false });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" }); const [del, setDel] = useState(""); const [busy, setBusy] = useState("");
  const run = async (key, fn, ok) => { setBusy(key); try { await fn(); toast(ok); await refresh(); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(""); } };
  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile, notifications and security" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center gap-4"><Initials name={user.name} size={64} /><div><p className="text-lg font-bold">{user.name}</p><p className="text-sm text-slate-500">{user.email}</p><div className="mt-1 flex gap-1.5"><Badge tone="violet">{user.role}</Badge><Badge tone={user.emailVerified ? "emerald" : "amber"}>{user.emailVerified ? "verified" : "not verified"}</Badge></div></div></div>
          {!user.emailVerified && <Button variant="soft" size="sm" loading={busy === "v"} onClick={() => run("v", () => api.post("/auth/resend-verification"), "Verification email sent")}>Resend verification email</Button>}
          <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field><Field label="Department"><Input value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></Field></div>
          <Switch checked={f.notifyEmail} onChange={(v) => setF({ ...f, notifyEmail: v })} label="Email me about arrivals, refusals and overstays" />
          <Switch checked={theme === "dark"} onChange={toggle} label="Dark theme" />
          <Button loading={busy === "s"} onClick={() => run("s", () => api.patch("/auth/settings", f), "Settings saved")}>Save changes</Button>
        </Card>
        <div className="space-y-5">
          <Card className="space-y-3"><h3 className="flex items-center gap-2 font-bold"><UserCheck size={18} className="text-teal-500" /> Cover for me</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">A colleague who is also notified about your visitors and can approve walk-ins while you are away.</p>
            {meta.delegate ? <div className="flex items-center justify-between rounded-xl bg-teal-500/10 p-3 text-sm"><span><b>{meta.delegate.name}</b> · {meta.delegate.email}</span><Button size="sm" variant="ghost" onClick={() => run("d0", () => api.put("/me/delegate", { email: null }), "Delegate removed")}>Remove</Button></div> : null}
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run("d", () => api.put("/me/delegate", { email: del }), "Delegate saved").then(() => setDel("")); }}><Input type="email" required placeholder="colleague@company.com" value={del} onChange={(e) => setDel(e.target.value)} /><Button loading={busy === "d"}>Set</Button></form></Card>
          <Card className="space-y-4"><h3 className="font-bold">Change password</h3>
            <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
            <Field label="New password" hint="8+ characters with a letter and a number"><Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
            <Button variant="soft" loading={busy === "p"} onClick={() => run("p", async () => { await api.post("/auth/change-password", pw); setPw({ currentPassword: "", newPassword: "" }); }, "Password changed")}>Update password</Button></Card>
        </div>
      </div>
    </>
  );
}
