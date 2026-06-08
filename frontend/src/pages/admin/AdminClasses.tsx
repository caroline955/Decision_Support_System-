import { FormEvent, useEffect, useState } from "react";
import api from "../../lib/api";
import type { User } from "../../lib/types";

interface Course { id: number; code: string; name: string; }
interface Klass {
  id: number;
  course_id: number;
  teacher_id: number;
  name: string;
  semester?: string | null;
  is_active: boolean;
}

export default function AdminClasses() {
  const [list, setList] = useState<Klass[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", course_id: 0, teacher_id: 0, semester: "" });

  const load = () => api.get<Klass[]>("/classes").then((r) => setList(r.data));
  useEffect(() => {
    load();
    api.get<Course[]>("/courses").then((r) => setCourses(r.data));
    api.get<User[]>("/users", { params: { role: "teacher" } }).then((r) => setTeachers(r.data));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.course_id || !form.teacher_id) return alert("Chọn môn và GV");
    await api.post("/classes", form);
    setForm({ name: "", course_id: 0, teacher_id: 0, semester: "" });
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Lớp học</h1>
        <button onClick={() => setOpen((v) => !v)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm">
          {open ? "Huỷ" : "+ Thêm lớp"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="bg-white rounded-lg shadow p-4 grid grid-cols-2 gap-3">
          <input className="border rounded px-2 py-1.5 col-span-2" placeholder="Tên lớp (DS101-K23A)"
                 value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="border rounded px-2 py-1.5" required
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: Number(e.target.value) })}>
            <option value={0}>-- Chọn môn --</option>
            {courses.map((c) => (<option key={c.id} value={c.id}>{c.code} · {c.name}</option>))}
          </select>
          <select className="border rounded px-2 py-1.5" required
                  value={form.teacher_id}
                  onChange={(e) => setForm({ ...form, teacher_id: Number(e.target.value) })}>
            <option value={0}>-- Chọn GV --</option>
            {teachers.map((t) => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
          </select>
          <input className="border rounded px-2 py-1.5 col-span-2" placeholder="Học kỳ (2025-2)"
                 value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
          <button className="col-span-2 bg-emerald-600 text-white py-1.5 rounded-md text-sm">Tạo lớp</button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Tên lớp</th>
              <th>Môn</th>
              <th>GV phụ trách</th>
              <th>Học kỳ</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {list.map((k) => {
              const course = courses.find((c) => c.id === k.course_id);
              const teacher = teachers.find((t) => t.id === k.teacher_id);
              return (
                <tr key={k.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{k.name}</td>
                  <td>{course?.code ?? k.course_id}</td>
                  <td>{teacher?.full_name ?? k.teacher_id}</td>
                  <td>{k.semester ?? "—"}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded ${k.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {k.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-slate-400">Chưa có lớp nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
