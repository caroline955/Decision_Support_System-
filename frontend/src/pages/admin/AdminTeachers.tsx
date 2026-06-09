import { FormEvent, useEffect, useState } from "react";
import api from "../../lib/api";
import { Badge, Button, Card, CardHeader, EmptyState } from "../../components/UI";
import { ICheck, ISchool, IUsers } from "../../components/icons";
import type { User } from "../../lib/types";

interface Klass {
  id: number;
  name: string;
  course_code?: string | null;
  semester?: string | null;
  teacher_id: number;
  teacher_name?: string | null;
  student_count: number;
}

interface TeacherClass {
  id: number;
  name: string;
  course_code: string;
  semester?: string | null;
  student_count: number;
}

export default function AdminTeachers() {
  const [list, setList] = useState<User[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", class_ids: [] as number[],
  });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, TeacherClass[]>>({});

  const load = () => {
    api.get<User[]>("/users", { params: { role: "teacher" } }).then((r) => setList(r.data));
    api.get<Klass[]>("/classes").then((r) => setClasses(r.data));
  };
  useEffect(load, []);

  const toggleClass = (cid: number) => {
    setForm((f) => ({
      ...f,
      class_ids: f.class_ids.includes(cid)
        ? f.class_ids.filter((x) => x !== cid)
        : [...f.class_ids, cid],
    }));
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await api.post("/admin/teachers", form);
    setForm({ full_name: "", email: "", password: "", class_ids: [] });
    setCreating(false);
    load();
    window.dispatchEvent(new CustomEvent("teachers:changed"));
  };

  const toggleExpand = async (tid: number) => {
    if (expanded === tid) {
      setExpanded(null);
      return;
    }
    if (!details[tid]) {
      const r = await api.get<TeacherClass[]>(`/admin/teachers/${tid}/classes`);
      setDetails((d) => ({ ...d, [tid]: r.data }));
    }
    setExpanded(tid);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Giáo viên</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng {list.length} giáo viên · {classes.length} lớp
          </p>
        </div>
        <Button variant={creating ? "secondary" : "primary"} onClick={() => setCreating((v) => !v)}>
          {creating ? "Huỷ" : "+ Thêm giáo viên"}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader title="Thông tin giáo viên mới" />
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Họ tên"
                     value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Email" type="email"
                     value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Mật khẩu (≥6)" type="password"
                     value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Phân lớp giảng dạy
                <span className="text-xs text-slate-400 ml-2">(chọn nhiều, mỗi lớp chỉ có 1 GV)</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                {classes.map((c) => {
                  const taken = !!c.teacher_name;
                  return (
                    <label key={c.id}
                           className={`flex items-center gap-3 border rounded-lg px-3 py-2 text-sm cursor-pointer ${
                             form.class_ids.includes(c.id)
                               ? "border-rose-400 bg-rose-50"
                               : "border-slate-200 hover:border-slate-300"
                           }`}>
                      <input type="checkbox" checked={form.class_ids.includes(c.id)}
                             onChange={() => toggleClass(c.id)}
                             className="rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 truncate">{c.name}</div>
                        <div className="text-xs text-slate-400">
                          {c.course_code} · {c.student_count} SV
                          {taken && <span className="text-amber-600"> · Đang: {c.teacher_name}</span>}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {form.class_ids.length > 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠ Các lớp được chọn sẽ chuyển GV phụ trách sang giáo viên mới này.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setCreating(false)}>Huỷ</Button>
              <Button variant="danger">Tạo giáo viên</Button>
            </div>
          </form>
        </Card>
      )}

      {list.length === 0 ? (
        <Card><EmptyState icon={<IUsers />} title="Chưa có giáo viên" /></Card>
      ) : (
        <div className="space-y-3">
          {list.map((u) => {
            const myClasses = classes.filter((c) => c.teacher_id === u.id);
            return (
              <Card key={u.id} padding={false}>
                <div className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center font-bold">
                    {u.full_name.split(" ").slice(-1)[0]?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800">{u.full_name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <Badge tone="emerald">{myClasses.length} lớp</Badge>
                    <Badge tone={u.is_active ? "emerald" : "slate"}>
                      {u.is_active ? "Active" : "Blocked"}
                    </Badge>
                  </div>
                  <Button variant="secondary" onClick={() => toggleExpand(u.id)}>
                    {expanded === u.id ? "Ẩn lớp" : "Xem lớp"}
                  </Button>
                </div>
                {expanded === u.id && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4 bg-slate-50/60">
                    {(details[u.id] ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500">GV này chưa được phân lớp nào.</p>
                    ) : (
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(details[u.id] ?? []).map((c) => (
                          <li key={c.id} className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center"><ISchool width={16} height={16}/></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                              <div className="text-xs text-slate-400">
                                {c.course_code} · {c.semester ?? "—"} · {c.student_count} SV
                              </div>
                            </div>
                            <ICheck width={14} height={14} className="text-emerald-500" />
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
    </div>
  );
}
