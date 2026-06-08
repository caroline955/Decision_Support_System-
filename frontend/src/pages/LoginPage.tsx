import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("an.ph@student.uni.edu.vn");
  const [password, setPassword] = useState("123456");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const u = await login(email, password);
      if (u.role === "admin") nav("/admin");
      else if (u.role === "teacher") nav("/teacher");
      else nav("/student");
    } catch (ex: any) {
      setErr(ex.response?.data?.detail ?? "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <form
        onSubmit={submit}
        className="bg-white shadow rounded-lg p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-brand-700">DS Chatbot</h1>
        <p className="text-sm text-slate-500">Đăng nhập vào hệ thống</p>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
            required
          />
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}

        <button
          disabled={busy}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-md disabled:opacity-50"
        >
          {busy ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <p className="text-xs text-slate-400">
          Demo: an.ph@student.uni.edu.vn / 123456
        </p>
      </form>
    </div>
  );
}
