import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type RoleTab = "admin" | "teacher" | "student";

const TABS: { id: RoleTab; label: string; sub: string; placeholder: string }[] = [
  { id: "admin",   label: "Quản trị · Admin",   sub: "Quản lý toàn hệ thống", placeholder: "admin@uni.edu.vn" },
  { id: "teacher", label: "Giảng dạy · Giáo viên", sub: "Theo dõi lớp & cảnh báo", placeholder: "huong.tt@uni.edu.vn" },
  { id: "student", label: "Học tập · Sinh viên",  sub: "Học cùng trợ giảng AI", placeholder: "an.ph@student.uni.edu.vn" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<RoleTab>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const u = await login(email, password);
      if (u.role !== tab) {
        setErr(
          `Tài khoản này thuộc nhóm "${u.role}". Vui lòng chọn đúng vai trò để đăng nhập.`
        );
        setBusy(false);
        return;
      }
      if (u.role === "admin") nav("/admin");
      else if (u.role === "teacher") nav("/teacher");
      else nav("/student");
    } catch (ex: any) {
      setErr(ex.response?.data?.detail ?? "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  };

  const tabActive = (id: RoleTab) =>
    tab === id
      ? "bg-brand-600 text-white shadow-md"
      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200";

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-100">
      {/* === Left: Brand + dashboard mockup === */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-violet-700 text-white p-10 flex-col">
        <div className="flex items-center gap-3 z-10">
          <div className="w-11 h-11 rounded-xl bg-white text-brand-700 grid place-items-center font-bold">DS</div>
          <div>
            <div className="font-semibold text-lg leading-tight">DS Chatbot</div>
            <div className="text-xs text-brand-100/80">Hệ thống quản lý & hỗ trợ học tập</div>
          </div>
        </div>

        <div className="my-auto z-10 max-w-md">
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
            Kết nối <span className="text-brand-200">·</span> Hỗ trợ <span className="text-brand-200">·</span> Phát triển
          </h1>
          <p className="text-brand-100/85 mt-3 text-sm leading-relaxed">
            Nền tảng giúp nhà trường quản lý hiệu quả, giảng viên theo dõi lớp học
            và sinh viên học Data Science cùng trợ giảng AI.
          </p>

          {/* Mockup card */}
          <div className="mt-7 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-4 shadow-2xl">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-auto text-[10px] text-brand-100/70">DS · AI Dashboard</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { label: "API",   sub: "FastAPI" },
                { label: "DB",    sub: "MySQL" },
                { label: "AI",    sub: "Chatbot" },
                { label: "UI",    sub: "React" },
              ].map((b) => (
                <div key={b.label} className="bg-white/15 rounded-lg p-2 text-center">
                  <div className="text-base font-bold">{b.label}</div>
                  <div className="text-[10px] text-brand-100/80">{b.sub}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 h-14 rounded-lg bg-gradient-to-r from-brand-300/20 via-amber-200/20 to-emerald-300/20 border border-white/10 flex items-end gap-1 p-2">
              {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-white/70"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="z-10 grid grid-cols-3 gap-3 text-xs text-brand-100/85">
          {[
            { t: "Admin",   d: "1 Quản trị" },
            { t: "Giáo viên", d: "Theo dõi" },
            { t: "Sinh viên", d: "Học tập"  },
          ].map((x) => (
            <div key={x.t} className="bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
              <div className="font-semibold text-white">{x.t}</div>
              <div>{x.d}</div>
            </div>
          ))}
        </div>

        {/* decorations */}
        <div className="absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-24 -top-12 w-72 h-72 rounded-full bg-violet-300/20 blur-3xl" />
      </div>

      {/* === Right: Form === */}
      <div className="grid place-items-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-brand-600 grid place-items-center text-white font-bold">DS</div>
            <span className="font-semibold text-slate-800 text-lg">DS Chatbot</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 text-center">Đăng nhập hệ thống</h2>
          <p className="text-sm text-slate-500 mt-1 text-center">Chọn vai trò của bạn để tiếp tục</p>

          {/* Role tabs */}
          <div className="mt-5 grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`text-xs font-medium px-3 py-2 rounded-lg transition ${tabActive(t.id)}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email hoặc tên đăng nhập
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder={TABS.find((x) => x.id === tab)?.placeholder}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                  {showPwd ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                       className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                Ghi nhớ đăng nhập
              </label>
              <a href="mailto:admin@uni.edu.vn?subject=Quên mật khẩu DS Chatbot"
                 className="text-brand-600 hover:underline">Quên mật khẩu?</a>
            </div>

            {err && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{err}</div>
            )}

            <button disabled={busy}
                    className="w-full bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-700 hover:to-violet-700 text-white py-2.5 rounded-xl font-medium shadow-sm disabled:opacity-50">
              {busy ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="flex-1 h-px bg-slate-200" />
            hoặc
            <span className="flex-1 h-px bg-slate-200" />
          </div>

          <button
            type="button"
            disabled
            title="Tính năng đang phát triển"
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 7.5-11.3 7.5-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 5.6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 7.6 29.3 6 24 6 16.3 6 9.6 9.4 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.4 0-9.7-3-11.3-7.4l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2c-.4.4 6.7-4.9 6.7-14.8 0-1.3-.1-2.4-.4-3.5z" /></svg>
            Đăng nhập với Google
          </button>

          <p className="text-xs text-slate-400 text-center mt-5">
            Chưa có tài khoản?{" "}
            <a href="mailto:admin@uni.edu.vn?subject=Yêu cầu cấp tài khoản DS Chatbot"
               className="text-brand-600 hover:underline">
              Liên hệ quản trị viên
            </a>{" "}
            để được cấp tài khoản.
          </p>
        </div>
      </div>
    </div>
  );
}
