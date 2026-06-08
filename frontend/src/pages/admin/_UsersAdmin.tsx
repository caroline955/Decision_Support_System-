import { FormEvent, useEffect, useState } from "react";
import api from "../../lib/api";
import type { User } from "../../lib/types";

interface Props {
  role: "teacher" | "student";
  title: string;
}

export default function UsersAdmin({ role, title }: Props) {
  const [list, setList] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  const load = () => {
    api.get<User[]>("/users", { params: { role } }).then((r) => setList(r.data));
  };
  useEffect(load, [role]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await api.post("/auth/register", { ...form, role });
    setForm({ full_name: "", email: "", password: "" });
    setCreating(false);
    load();
  };

  const toggle = async (u: User) => {
    await api.patch(`/users/${u.id}/active`, null, {
      params: { is_active: !u.is_active },
    });
    load();
  };

  const remove = async (u: User) => {
    if (!confirm(`Xoá ${u.full_name}?`)) return;
    await api.delete(`/users/${u.id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <button
          onClick={() => setCreating((v) => !v)}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm"
        >
          {creating ? "Huỷ" : `+ Thêm ${title.toLowerCase().slice(2)}`}
        </button>
      </div>

      {creating && (
        <form onSubmit={create} className="bg-white rounded-lg shadow p-4 grid grid-cols-3 gap-3">
          <input className="border rounded px-2 py-1.5" placeholder="Họ tên"
                 value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <input className="border rounded px-2 py-1.5" placeholder="Email" type="email"
                 value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="border rounded px-2 py-1.5" placeholder="Mật khẩu" type="password"
                 value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button className="col-span-3 bg-emerald-600 text-white py-1.5 rounded-md text-sm">Tạo</button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Họ tên</th>
              <th>Email</th>
              <th>Trạng thái</th>
              <th className="text-right pr-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.full_name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`text-xs px-2 py-0.5 rounded ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {u.is_active ? "active" : "blocked"}
                  </span>
                </td>
                <td className="text-right pr-3 space-x-2">
                  <button onClick={() => toggle(u)} className="text-xs text-slate-600 hover:underline">
                    {u.is_active ? "Khoá" : "Mở khoá"}
                  </button>
                  <button onClick={() => remove(u)} className="text-xs text-red-600 hover:underline">
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-slate-400">Chưa có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
