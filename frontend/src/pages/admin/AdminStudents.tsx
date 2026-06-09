import { FormEvent, useEffect, useState } from "react";
import api from "../../lib/api";
import { Badge, Button, Card, CardHeader, EmptyState } from "../../components/UI";
import { ICheck, IGraduate, ISchool } from "../../components/icons";
import type { User } from "../../lib/types";

interface Klass {
  id: number;
  name: string;
  course_code?: string | null;
  semester?: string | null;
  teacher_name?: string | null;
  student_count: number;
}
interface StudentClass {
  id: number;
  name: string;
  course_code: string;
  teacher_name: string;
}

export default function AdminStudents() {
  const [list, setList] = useState<User[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", class_ids: [] as number[],
  });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, StudentClass[]>>({});

  const load = () => {
    api.get<User[]>("/users", { params: { role: "student" } }).then((r) => setList(r.data));
    api.get<Klass[]>("/classes").then((r) => setClasses(r.data));
  };
  useEffect(load, []);

  const toggleClass = (cid: number) =>
    setForm((f) => ({
      ...f,
      class_ids: f.class_ids.includes(cid)
        ? f.class_ids.filter((x) => x !== cid)
        : [...f.class_ids, cid],
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

  // group classes by course_code for nicer multi-môn UI
  const grouped: Record<string, Klass[]> = {};
  for (const c of classes) {
    const key = c.course_code ?? "—";
    (grouped[key] ??= []).push(c);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sinh viên</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng {list.length} sinh viên · 1 SV có thể học nhiều môn
          </p>
        </div>
        <Button variant={creating ? "secondary" : "primary"} onClick={() => setCreating((v) => !v)}>
          {creating ? "Huỷ" : "+ Thêm sinh viên"}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader title="Thông tin sinh viên mới" />
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
                Đăng ký lớp <span className="text-xs text-slate-400 ml-2">(có thể chọn nhiều môn)</span>
              </label>
              <div className="space-y-3 max-h-72 overflow-y-auto p-1">
                {Object.entries(grouped).map(([code, items]) => (
                  <div key={code}>
                    <div className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Môn {code}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {items.map((c) => (
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
                            <div className="text-xs text-slate-400 truncate">
                              GV: {c.teacher_name ?? "Chưa có"} · {c.student_count} SV
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setCreating(false)}>Huỷ</Button>
              <Button variant="danger">Tạo sinh viên</Button>
            </div>
          </form>
        </Card>
      )}

      {list.length === 0 ? (
        <Card><EmptyState icon={<IGraduate />} title="Chưa có sinh viên" /></Card>
      ) : (
        <div className="space-y-3">
          {list.map((u) => (
            <Card key={u.id} padding={false}>
              <div className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 grid place-items-center font-bold">
                  {u.full_name.split(" ").slice(-1)[0]?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">{u.full_name}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>
                <Badge tone={u.is_active ? "emerald" : "slate"}>
                  {u.is_active ? "Active" : "Blocked"}
                </Badge>
                <Button variant="secondary" onClick={() => toggleExpand(u.id)}>
                  {expanded === u.id ? "Ẩn lớp" : "Xem lớp"}
                </Button>
              </div>
              {expanded === u.id && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 bg-slate-50/60">
                  {(details[u.id] ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500">SV chưa đăng ký lớp nào.</p>
                  ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(details[u.id] ?? []).map((c) => (
                        <li key={c.id} className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 grid place-items-center"><ISchool width={16} height={16}/></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                            <div className="text-xs text-slate-400">{c.course_code} · GV {c.teacher_name}</div>
                          </div>
                          <ICheck width={14} height={14} className="text-violet-500" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
