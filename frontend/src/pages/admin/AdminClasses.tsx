import { FormEvent, useEffect, useState } from "react";
import api from "../../lib/api";
import { Badge, Button, Card, CardHeader, EmptyState } from "../../components/UI";
import { ISchool } from "../../components/icons";
import type { User } from "../../lib/types";

interface Course { id: number; code: string; name: string; }
interface Klass {
  id: number;
  course_id: number;
  teacher_id: number;
  name: string;
  semester?: string | null;
  is_active: boolean;
  teacher_name?: string | null;
  course_code?: string | null;
  student_count: number;
}

export default function AdminClasses() {
  const [list, setList] = useState<Klass[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", course_id: 0, teacher_id: 0, semester: "" });

  const load = () => api.get<Klass[]>("/classes").then((r) => setList(r.data));
  const loadCourses = () => api.get<Course[]>("/courses").then((r) => setCourses(r.data));
  const loadTeachers = () => api.get<User[]>("/users", { params: { role: "teacher" } }).then((r) => setTeachers(r.data));

  useEffect(() => {
    load();
    loadCourses();
    loadTeachers();
    const onCoursesChanged = () => loadCourses();
    const onTeachersChanged = () => loadTeachers();
    window.addEventListener("courses:changed", onCoursesChanged);
    window.addEventListener("teachers:changed", onTeachersChanged);
    return () => {
      window.removeEventListener("courses:changed", onCoursesChanged);
      window.removeEventListener("teachers:changed", onTeachersChanged);
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.course_id || !form.teacher_id) return alert("Chọn môn và GV");
    await api.post("/classes", form);
    setForm({ name: "", course_id: 0, teacher_id: 0, semester: "" });
    setOpen(false);
    load();
  };

  const reassignTeacher = async (cls: Klass, teacherId: number) => {
    if (teacherId === cls.teacher_id) return;
    await api.patch(`/classes/${cls.id}`, { teacher_id: teacherId });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lớp học</h1>
          <p className="text-sm text-slate-500 mt-1">
            {list.length} lớp · 1 lớp do 1 giáo viên phụ trách
          </p>
        </div>
        <Button variant={open ? "secondary" : "danger"} onClick={() => setOpen((v) => !v)}>
          {open ? "Huỷ" : "+ Thêm lớp"}
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader title="Lớp mới" />
          <form onSubmit={submit} className="space-y-3">
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full" placeholder="Tên lớp (VD: DS101 - K23A)"
                   value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" required
                      value={form.course_id}
                      onChange={(e) => setForm({ ...form, course_id: Number(e.target.value) })}>
                <option value={0}>-- Chọn môn --</option>
                {courses.map((c) => (<option key={c.id} value={c.id}>{c.code} · {c.name}</option>))}
              </select>
              <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" required
                      value={form.teacher_id}
                      onChange={(e) => setForm({ ...form, teacher_id: Number(e.target.value) })}>
                <option value={0}>-- Chọn GV phụ trách --</option>
                {teachers.map((t) => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
              </select>
            </div>
            <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full" placeholder="Học kỳ (VD: 2025-2)"
                   value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Huỷ</Button>
              <Button variant="danger">Tạo lớp</Button>
            </div>
          </form>
        </Card>
      )}

      {list.length === 0 ? (
        <Card><EmptyState icon={<ISchool />} title="Chưa có lớp nào" /></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {list.map((c) => (
            <Card key={c.id} className="hover:shadow-card transition">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 grid place-items-center"><ISchool /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-800 truncate">{c.name}</h3>
                    <Badge tone={c.is_active ? "emerald" : "slate"}>
                      {c.is_active ? "Active" : "Đóng"}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Môn <span className="font-mono text-slate-700">{c.course_code ?? "—"}</span>
                    {" · "}{c.semester ?? "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <div className="text-xs text-slate-500">Sĩ số</div>
                  <div className="text-lg font-bold text-slate-800">{c.student_count} SV</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <div className="text-xs text-slate-500">Trạng thái</div>
                  <div className="text-sm font-medium text-slate-800 mt-0.5">
                    {c.is_active ? "Đang giảng dạy" : "Đã kết thúc"}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-slate-500 mb-1 block">Giáo viên phụ trách</label>
                <select
                  value={c.teacher_id}
                  onChange={(e) => reassignTeacher(c, Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
                {c.teacher_name && (
                  <p className="text-xs text-slate-400 mt-1">
                    Hiện tại: <span className="text-emerald-600 font-medium">{c.teacher_name}</span>
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
