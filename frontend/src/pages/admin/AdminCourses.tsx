import { FormEvent, useEffect, useState } from "react";
import api from "../../lib/api";
import { Badge, Button, Card, CardHeader, EmptyState } from "../../components/UI";
import { IBook } from "../../components/icons";

interface Course {
  id: number;
  code: string;
  name: string;
  description?: string | null;
}

const empty = { code: "", name: "", description: "" };

export default function AdminCourses() {
  const [list, setList] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...empty });

  const load = () => api.get<Course[]>("/courses").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const startEdit = (c: Course) => {
    setEditingId(c.id);
    setForm({ code: c.code, name: c.name, description: c.description ?? "" });
    setOpen(true);
  };

  const reset = () => {
    setForm({ ...empty });
    setEditingId(null);
    setOpen(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (editingId !== null) {
      await api.patch(`/courses/${editingId}`, form);
    } else {
      await api.post("/courses", form);
    }
    reset();
    load();
    // nudge các trang khác (AdminClasses) refetch courses
    window.dispatchEvent(new CustomEvent("courses:changed"));
  };

  const remove = async (c: Course) => {
    if (!confirm(`Xoá môn "${c.code} - ${c.name}"?\nTất cả lớp + bài học của môn này sẽ bị xoá theo.`)) return;
    await api.delete(`/courses/${c.id}`);
    load();
    window.dispatchEvent(new CustomEvent("courses:changed"));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Môn học</h1>
          <p className="text-sm text-slate-500 mt-1">{list.length} môn trong hệ thống</p>
        </div>
        <Button variant={open ? "secondary" : "danger"} onClick={() => open ? reset() : setOpen(true)}>
          {open ? "Huỷ" : "+ Thêm môn"}
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader title={editingId ? `Sửa môn #${editingId}` : "Môn mới"} />
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="Mã (DS101)"
                     value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Tên môn"
                     value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <textarea className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full"
                      placeholder="Mô tả ngắn (tùy chọn)" rows={2} value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={reset}>Huỷ</Button>
              <Button variant="danger">{editingId ? "Cập nhật" : "Tạo"}</Button>
            </div>
          </form>
        </Card>
      )}

      {list.length === 0 ? (
        <Card><EmptyState icon={<IBook />} title="Chưa có môn học" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((c) => (
            <Card key={c.id} className="hover:shadow-card transition">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 grid place-items-center"><IBook /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone="rose">{c.code}</Badge>
                    <h3 className="font-semibold text-slate-800 truncate">{c.name}</h3>
                  </div>
                  {c.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{c.description}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => startEdit(c)}>Sửa</Button>
                <Button variant="danger" onClick={() => remove(c)}>Xoá</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
