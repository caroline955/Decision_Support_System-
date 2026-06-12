import { FormEvent, useEffect, useState } from "react";
import api from "../lib/api";
import { Avatar, Button } from "./UI";
import { IX } from "./icons";
import type { User } from "../lib/types";

interface Props {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditUserModal({ user, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    full_name: user.full_name,
    email: user.email,
    password: "",
    is_active: user.is_active,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: form.full_name,
        email: form.email,
        is_active: form.is_active,
      };
      if (form.password) payload.password = form.password;
      await api.patch(`/users/${user.id}`, payload);
      onSaved();
      onClose();
    } catch (ex: any) {
      setErr(ex.response?.data?.detail ?? "Cập nhật thất bại");
    } finally {
      setBusy(false);
    }
  };

  const roleLabel = user.role === "teacher" ? "Giáo viên"
    : user.role === "admin" ? "Quản trị viên" : "Sinh viên";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 flex items-center gap-4 border-b border-slate-100">
          <Avatar name={user.full_name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">{roleLabel}</div>
            <h3 className="font-semibold text-slate-800 truncate">Chỉnh sửa tài khoản</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
            aria-label="Đóng"
          >
            <IX />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Họ tên</label>
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Email</label>
            <input
              type="email"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
              Đặt lại mật khẩu
              <span className="text-[10px] font-normal text-slate-400 normal-case ml-2 lowercase">(để trống nếu không đổi)</span>
            </label>
            <input
              type="password"
              placeholder="Mật khẩu mới ≥ 6 ký tự"
              minLength={6}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {/* Active toggle */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800">Trạng thái tài khoản</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {form.is_active ? "Người dùng có thể đăng nhập" : "Đã khoá đăng nhập"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative w-11 h-6 rounded-full transition ${form.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
              aria-label="Toggle active"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.is_active ? "translate-x-5" : ""}`}
              />
            </button>
          </div>

          {err && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
              {err}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Huỷ</Button>
          <Button variant="primary" disabled={busy} onClick={(e) => submit(e as any)}>
            {busy ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </div>
    </div>
  );
}
