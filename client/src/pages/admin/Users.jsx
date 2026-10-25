import { useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import api, { errMsg } from "../../api/api.js";
import { useDebounced, useFetch } from "../../lib/hooks";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Badge, Button, Card, Empty, ErrorBox, Field, Initials, Input, Modal, PageHeader, Pagination, Select, Spinner } from "../../components/ui";
import { Table } from "../../components/Table";
import { fmtDate } from "../../lib/utils";

const ROLES = [["user", "Host"], ["security", "Security guard"], ["admin", "Admin"]];
export default function Users() {
  const { user: me } = useAuth(); const toast = useToast(); const [q, setQ] = useState(""); const [role, setRole] = useState(""); const [page, setPage] = useState(1); const dq = useDebounced(q);
  const [open, setOpen] = useState(false); const [f, setF] = useState({ name: "", email: "", role: "security", department: "" }); const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useFetch(() => api.get("/admin/users", { params: { q: dq || undefined, role: role || undefined, page, limit: 20 } }), [dq, role, page]);
  const act = async (fn, ok) => { try { await fn(); toast(ok); reload(true); } catch (e) { toast(errMsg(e), "error"); } };
  const create = async (e) => { e.preventDefault(); setBusy(true); try { const b = { ...f }; if (!b.department) delete b.department; await api.post("/admin/users", b); toast("Account created. An email lets them set a password."); setOpen(false); setF({ name: "", email: "", role: "security", department: "" }); reload(true); } catch (er) { toast(errMsg(er), "error"); } finally { setBusy(false); } };
  return (
    <>
      <PageHeader title="Users" subtitle="Create guards and admins, change roles, disable accounts" action={<Button onClick={() => setOpen(true)}><Plus size={16} /> New user</Button>} />
      <Card className="mb-5 grid gap-3 !p-4 sm:grid-cols-3"><Input placeholder="Search name or email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Card>
      {loading && !data ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.items.length ? <Card><Empty title="No users found" /></Card> : (
        <Table head={["User", "Role", "Joined", "Status", ""]}>{data.items.map((u) => { const self = u.id === me.id; return (
          <tr key={u.id}><td className="p-4"><div className="flex items-center gap-3"><Initials name={u.name} size={36} /><div><p className="font-semibold">{u.name}{self && <span className="ml-1 text-xs text-teal-600">(you)</span>}</p><p className="text-xs text-slate-500">{u.email}</p></div></div></td>
            <td><Select className="!w-36 !py-1.5" value={u.role} disabled={self} onChange={(e) => act(() => api.patch(`/admin/users/${u.id}`, { role: e.target.value }), "Role updated")}>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></td>
            <td className="text-slate-500">{fmtDate(u.created)}</td><td>{u.isActive === false ? <Badge tone="rose">Disabled</Badge> : <Badge tone="emerald">Active</Badge>}</td>
            <td className="pr-4"><div className="flex justify-end gap-1.5"><Button size="sm" variant="ghost" title="Send a password reset email" onClick={() => act(() => api.post(`/admin/users/${u.id}/reset-password`), "Reset email sent")}><KeyRound size={14} /></Button>
              {!self && <Button size="sm" variant="ghost" onClick={() => act(() => api.patch(`/admin/users/${u.id}`, { isActive: u.isActive === false }), u.isActive === false ? "Enabled" : "Disabled")}>{u.isActive === false ? "Enable" : "Disable"}</Button>}
              {!self && <Button size="sm" variant="ghost" className="!text-rose-600" title="Delete (only possible without visit history)" onClick={() => window.confirm(`Delete ${u.name}?`) && act(() => api.delete(`/admin/users/${u.id}`), "User deleted")}><Trash2 size={14} /></Button>}</div></td></tr>); })}</Table>)}
      <Pagination pagination={data?.pagination} onPage={setPage} />
      <Modal open={open} onClose={() => setOpen(false)} title="New user">
        <form onSubmit={create} className="space-y-4"><Field label="Full name"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Email"><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Role"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field><Field label="Department"><Input value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></Field></div>
          <p className="text-xs text-slate-500">No password is ever emailed: the new user receives a link to choose their own.</p><Button className="w-full" loading={busy}>Create account</Button></form>
      </Modal>
    </>
  );
}
