import { FormEvent, useEffect, useState } from "react";
import api from "../../lib/api";

interface Course {
  id: number;
  code: string;
  name: string;
  description?: string | null;
}

export default function AdminCourses() {
  const [list, setList] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "" });

  const load = () => api.get<Course[]>("/courses").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await api.post("/courses", form);
    setForm({ code: "", name: "", description: "" });
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Môn học</h1>
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm"
        >
          {open ? "Huỷ" : "+ Thêm môn"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="bg-white rounded-lg shadow p-4 grid grid-cols-3 gap-3">
          <input className="border rounded px-2 py-1.5" placeholder="Mã (DS101)"
                 value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <input className="border rounded px-2 py-1.5 col-span-2" placeholder="Tên môn"
                 value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <textarea className="border rounded px-2 py-1.5 col-span-3" placeholder="Mô tả"
                    rows={2} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button className="col-span-3 bg-emerald-600 text-white py-1.5 rounded-md text-sm">
            Tạo
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Mã</th>
              <th>Tên môn</th>
              <th>Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-mono">{c.code}</td>
                <td>{c.name}</td>
                <td className="text-slate-500">{c.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
