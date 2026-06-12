import { FormEvent, useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, IconButton, StatusDot } from "../../components/UI";
import EditUserModal from "../../components/EditUserModal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { IChevronDown, IChevronUp, IGraduate, ILock, IPencil, ISchool, ISearch, ITrash, IUnlock } from "../../components/icons";
import type { User } from "../../lib/types";

interface Klass {
  id: number; name: string;
  course_code?: string | null; semester?: string | null;
  teacher_name?: string | null; student_count: number;
}
interface StudentClass {
  id: number; name: string; course_code: string; teacher_name: string;
}

type Confirm = { type: "delete" | "lock" | "unlock"; user: User } | null;

export default function AdminStudents() {
  const [list, setList] = useState<User[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", class_ids: [] as number[] });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, StudentClass[]>>({});
  const [editing, setEditing] = useState<User | null>(null);
  const [confirming, setConfirming] = useState<Confirm>(null);

  const load = () => {
    api.get<User[]>("/users", { params: { role: "student" } }).then((r) => setList(r.data));
    api.get<Klass[]>("/classes").then((r) => setClasses(r.data));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [list, search]);

  const toggleClass = (cid: number) =>
    setForm((f) => ({
      ...f,
      class_ids: f.class_ids.includes(cid) ? f.class_ids.filter((x) => x !== cid) : [...f.class_ids, cid],
    }));

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await api.post("/admin/students", form);
    setForm({ full_name: "", email: "", password: "", class_ids: [] });
    setCreating(false);
    load();
  };

  const toggleExpand = async (sid: number) => {
    if (expanded === sid) { setExpanded(null); return; }
    if (!details[sid]) {
      const r = await api.get<StudentClass[]>(`/admin/students/${sid}/classes`);
      setDetails((d) => ({ ...d, [sid]: r.data }));
    }
    setExpanded(sid);
  };

  const doConfirm = async () => {
    if (!confirming) return;
    const u = confirming.user;
    try {
      if (confirming.type === "delete") {
        await api.delete(`/users/${u.id}`);
      } else {
        const next = confirming.type === "unlock";
        await api.patch(`/users/${u.id}/active?is_active=${next}`);
      }
      load();
    } catch (ex: any) {
      alert(ex.response?.data?.detail ?? "Thao tác thất bại");
    } finally {
      setConfirming(null);
    }
  };

  // group classes by course for nicer multi-môn UI
  const grouped: Record<string, Klass[]> = {};
  for (const c of classes) {
    const key = c.course_code ?? "—";
    (grouped[key] ??= []).push(c);
  }

  return (
    <div className="space-y-5">
      {/* === Page header === */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Sinh viên</h1>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{list.length}</span> sinh viên · 1 SV có thể học nhiều môn khác nhau
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ISearch width={16} height={16} /></span>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm w-64 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>
          <Button variant={creating ? "secondary" : "primary"} onClick={() => setCreating((v) => !v)}>
            {creating ? "Huỷ" : "+ Thêm sinh viên"}
          </Button>
        </div>
      </div>

      {/* === Create form === */}
      {creating && (
        <Card className="border-violet-100">
          <CardHeader title="Thêm sinh viên mới" />
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition" placeholder="Họ tên"
                     value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              <input className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition" placeholder="Email" type="email"
                     value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition" placeholder="Mật khẩu ≥ 6 ký tự" type="password"
                     value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block uppercase tracking-wide">
                Đăng ký lớp
                <span className="text-[10px] font-normal text-slate-400 ml-2 lowercase">(có thể chọn nhiều môn)</span>
              </label>
              <div className="space-y-3 max-h-72 overflow-y-auto p-1">
                {Object.entries(grouped).map(([code, items]) => (
                  <div key={code}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge tone="brand">{code}</Badge>
                      <span className="text-xs text-slate-500">{items.length} lớp</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {items.map((c) => {
                        const checked = form.class_ids.includes(c.id);
                        return (
                          <label key={c.id} className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 text-sm cursor-pointer transition ${checked ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleClass(c.id)} className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-800 truncate">{c.name}</div>
                              <div className="text-xs text-slate-400 truncate">GV: {c.teacher_name ?? "Chưa có"} · {c.student_count} SV</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setCreating(false)}>Huỷ</Button>
              <Button variant="primary">Tạo sinh viên</Button>
            </div>
          </form>
        </Card>
      )}

      {/* === List === */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IGraduate />}
            title={search ? "Không có sinh viên nào khớp" : "Chưa có sinh viên"}
            hint={search ? `Không tìm thấy kết quả cho "${search}"` : "Bấm + Thêm sinh viên để bắt đầu"}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => {
            const isExpanded = expanded === u.id;
            const stuClasses = details[u.id];
            return (
              <Card key={u.id} padding={false} className="overflow-hidden hover:shadow-card transition">
                <div className="p-5 flex items-center gap-4">
                  <Avatar name={u.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 truncate">{u.full_name}</span>
                      {!u.is_active && <Badge tone="slate">Đã khoá</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500 truncate">{u.email}</span>
                      <span className="text-slate-300">·</span>
                      <StatusDot active={u.is_active} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" size="sm" onClick={() => toggleExpand(u.id)}>
                      {isExpanded ? <><IChevronUp width={14} height={14} /> Ẩn lớp</> : <><IChevronDown width={14} height={14} /> Xem lớp</>}
                    </Button>
                    <IconButton icon={<IPencil width={16} height={16} />} label="Sửa" variant="secondary" onClick={() => setEditing(u)} />
                    {u.is_active
                      ? <IconButton icon={<ILock width={16} height={16} />} label="Khoá tài khoản" variant="secondary" onClick={() => setConfirming({ type: "lock", user: u })} />
                      : <IconButton icon={<IUnlock width={16} height={16} />} label="Mở khoá" variant="secondary" onClick={() => setConfirming({ type: "unlock", user: u })} />
                    }
                    <IconButton icon={<ITrash width={16} height={16} />} label="Xoá" variant="danger" onClick={() => setConfirming({ type: "delete", user: u })} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4 bg-slate-50/60">
                    {(stuClasses ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500 italic">SV chưa đăng ký lớp nào.</p>
                    ) : (
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(stuClasses ?? []).map((c) => (
                          <li key={c.id} className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center gap-3 hover:border-violet-200 transition">
                            <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 grid place-items-center"><ISchool width={16} height={16}/></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                              <div className="text-xs text-slate-400">{c.course_code} · GV {c.teacher_name}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onSaved={load} />}

      <ConfirmDialog
        open={!!confirming}
        title={
          confirming?.type === "delete" ? `Xoá sinh viên ${confirming.user.full_name}?`
          : confirming?.type === "lock" ? `Khoá tài khoản ${confirming?.user.full_name}?`
          : `Mở khoá tài khoản ${confirming?.user.full_name}?`
        }
        message={
          confirming?.type === "delete"
            ? "Hành động này không thể hoàn tác.\nTất cả enroll, chat sessions, learning analytics và alerts của SV sẽ bị xoá theo."
            : confirming?.type === "lock"
            ? "Sinh viên sẽ không đăng nhập được cho đến khi admin mở khoá lại."
            : "Sinh viên có thể đăng nhập trở lại sau thao tác này."
        }
        variant={confirming?.type === "delete" ? "danger" : "warning"}
        confirmLabel={confirming?.type === "delete" ? "Xoá vĩnh viễn" : confirming?.type === "lock" ? "Khoá" : "Mở khoá"}
        onConfirm={doConfirm}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
