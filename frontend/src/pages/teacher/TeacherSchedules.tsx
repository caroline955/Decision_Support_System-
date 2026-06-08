import { FormEvent, useEffect, useState } from "react";
import api from "../../lib/api";

interface Klass { id: number; name: string; }
interface Schedule {
  id: number;
  class_id: number;
  title: string;
  start_time: string;
  end_time: string;
  room?: string | null;
}

export default function TeacherSchedules() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [classId, setClassId] = useState<number>(0);
  const [list, setList] = useState<Schedule[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", start_time: "", end_time: "", room: "",
  });

  useEffect(() => {
    api.get<Klass[]>("/classes").then((r) => {
      setClasses(r.data);
      if (r.data.length) setClassId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    api.get<Schedule[]>("/schedules", { params: { class_id: classId } }).then((r) => setList(r.data));
  }, [classId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await api.post("/schedules", { class_id: classId, ...form });
    setForm({ title: "", start_time: "", end_time: "", room: "" });
    setOpen(false);
    const r = await api.get<Schedule[]>("/schedules", { params: { class_id: classId } });
    setList(r.data);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Lịch học</h1>
        <div className="flex gap-2">
          <select className="border rounded px-2 py-1.5 text-sm"
                  value={classId} onChange={(e) => setClassId(Number(e.target.value))}>
            {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <button onClick={() => setOpen((v) => !v)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm">
            {open ? "Huỷ" : "+ Tạo buổi học"}
          </button>
        </div>
      </div>

      {open && (
        <form onSubmit={submit} className="bg-white rounded-lg shadow p-4 grid grid-cols-2 gap-3">
          <input className="border rounded px-2 py-1.5 col-span-2" placeholder="Tiêu đề"
                 value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input className="border rounded px-2 py-1.5" type="datetime-local"
                 value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
          <input className="border rounded px-2 py-1.5" type="datetime-local"
                 value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
          <input className="border rounded px-2 py-1.5 col-span-2" placeholder="Phòng"
                 value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          <button className="col-span-2 bg-emerald-600 text-white py-1.5 rounded-md text-sm">Lưu</button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Tiêu đề</th>
              <th>Bắt đầu</th><th>Kết thúc</th><th>Phòng</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">{s.title}</td>
                <td>{new Date(s.start_time).toLocaleString("vi-VN")}</td>
                <td>{new Date(s.end_time).toLocaleString("vi-VN")}</td>
                <td>{s.room ?? "—"}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-slate-400">Chưa có buổi học</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
