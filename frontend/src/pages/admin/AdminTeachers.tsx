import { FormEvent, useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, IconButton, StatusDot } from "../../components/UI";
import EditUserModal from "../../components/EditUserModal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { IChevronDown, IChevronUp, ILock, IPencil, ISchool, ISearch, ITrash, IUnlock, IUsers } from "../../components/icons";
import type { User } from "../../lib/types";

interface Klass {
  id: number; name: string;
  course_code?: string | null; semester?: string | null;
  teacher_id: number; teacher_name?: string | null;
  student_count: number;
}
interface TeacherClass {
  id: number; name: string; course_code: string;
  semester?: string | null; student_count: number;
}

type Confirm = { type: "delete" | "lock" | "unlock"; user: User } | null;

export default function AdminTeachers() {
  const [list, setList] = useState<User[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", class_ids: [] as number[] });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, TeacherClass[]>>({});
  const [editing, setEditing] = useState<User | null>(null);
  const [confirming, setConfirming] = useState<Confirm>(null);

  const load = () => {
    api.get<User[]>("/users", { params: { role: "teacher" } }).then((r) => setList(r.data));
    api.get<Klass[]>("/classes").then((r) => setClasses(r.data));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [list, search]);

  const totalClasses = classes.length;
  const totalStudents = classes.reduce((s, c) => s + c.student_count, 0);

  const toggleClass = (cid: number) =>
    setForm((f) => ({
      ...f,
      class_ids: f.class_ids.includes(cid) ? f.class_ids.filter((x) => x !== cid) : [...f.class_ids, cid],
    }));

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await api.post("/admin/teachers", form);
    setForm({ full_name: "", email: "", password: "", class_ids: [] });
    setCreating(false);
    load();
    window.dispatchEvent(new CustomEvent("teachers:changed"));
  };

  const toggleExpand = async (tid: number) => {
    if (expanded === tid) { setExpanded(null); return; }
    if (!details[tid]) {
      const r = await api.get<TeacherClass[]>(`/admin/teachers/${tid}/classes`);
      setDetails((d) => ({ ...d, [tid]: r.data }));
    }
    setExpanded(tid);
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
      window.dispatchEvent(new CustomEvent("teachers:changed"));
    } catch (ex: any) {
      alert(ex.response?.data?.detail ?? "Thao tác thất bại");
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* === Page header === */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Giáo viên</h1>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{list.length}</span> giáo viên ·
            <span className="font-semibold text-slate-700"> {totalClasses}</span> lớp ·
            <span className="font-semibold text-slate-700"> {totalStudents}</span> sinh viên đang theo học
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
            {creating ? "Huỷ" : "+ Thêm giáo viên"}
          </Button>
        </div>
      </div>

      {/* === Create form === */}
      {creating && (
        <Card className="border-emerald-100">
          <CardHeader title="Thêm giáo viên mới" />
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
                Phân lớp giảng dạy
                <span className="text-[10px] font-normal text-slate-400 ml-2 lowercase">(chọn nhiều · 1 lớp chỉ có 1 GV)</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                {classes.map((c) => {
                  const taken = !!c.teacher_name;
                  const checked = form.class_ids.includes(c.id);
                  return (
                    <label key={c.id} className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 text-sm cursor-pointer transition ${checked ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleClass(c.id)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 truncate">{c.name}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {c.course_code} · {c.student_count} SV
                          {taken && <span className="text-amber-600"> · GV hiện tại: {c.teacher_name}</span>}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {form.class_ids.length > 0 && (
                <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  ⚠ Các lớp được chọn sẽ chuyển GV phụ trách sang giáo viên mới này.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setCreating(false)}>Huỷ</Button>
              <Button variant="primary">Tạo giáo viên</Button>
            </div>
          </form>
        </Card>
      )}

      {/* === List === */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IUsers />}
            title={search ? "Không có giáo viên nào khớp" : "Chưa có giáo viên"}
            hint={search ? `Không tìm thấy kết quả cho "${search}"` : "Bấm + Thêm giáo viên để bắt đầu"}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => {
            const myClasses = classes.filter((c) => c.teacher_id === u.id);
            const isExpanded = expanded === u.id;
            return (
              <Card key={u.id} padding={false} className="overflow-hidden hover:shadow-card transition">
                <div className="p-5 flex items-center gap-4">
                  <Avatar name={u.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 truncate">{u.full_name}</span>
                      <Badge tone="emerald">{myClasses.length} lớp</Badge>
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
                    {(details[u.id] ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500 italic">GV này chưa được phân lớp nào.</p>
                    ) : (
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(details[u.id] ?? []).map((c) => (
                          <li key={c.id} className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center gap-3 hover:border-emerald-200 transition">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center"><ISchool width={16} height={16}/></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                              <div className="text-xs text-slate-400">{c.course_code} · {c.semester ?? "—"} · {c.student_count} SV</div>
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
          confirming?.type === "delete" ? `Xoá giáo viên ${confirming.user.full_name}?`
          : confirming?.type === "lock" ? `Khoá tài khoản ${confirming?.user.full_name}?`
          : `Mở khoá tài khoản ${confirming?.user.full_name}?`
        }
        message={
          confirming?.type === "delete"
            ? "Hành động này không thể hoàn tác.\nCác lớp do GV phụ trách sẽ bị bỏ trống GV (cần admin gán lại). Tất cả cảnh báo dành cho GV cũng sẽ bị xoá."
            : confirming?.type === "lock"
            ? "Giáo viên sẽ không đăng nhập được cho đến khi admin mở khoá lại."
            : "Giáo viên có thể đăng nhập trở lại sau thao tác này."
        }
        variant={confirming?.type === "delete" ? "danger" : "warning"}
        confirmLabel={confirming?.type === "delete" ? "Xoá vĩnh viễn" : confirming?.type === "lock" ? "Khoá" : "Mở khoá"}
        onConfirm={doConfirm}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
