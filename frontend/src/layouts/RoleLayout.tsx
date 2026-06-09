import { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ILogout, ISearch } from "../components/icons";

type Accent = "brand" | "emerald" | "rose";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

interface RoleLayoutProps {
  brandTitle: string;
  brandSubtitle: string;
  accent: Accent;
  links: NavItem[];
}

const ACCENT: Record<Accent, { activeBg: string; activeText: string; logoBg: string }> = {
  brand:   { activeBg: "bg-brand-600",   activeText: "text-white", logoBg: "bg-brand-600" },
  emerald: { activeBg: "bg-emerald-600", activeText: "text-white", logoBg: "bg-emerald-600" },
  rose:    { activeBg: "bg-rose-600",    activeText: "text-white", logoBg: "bg-rose-600" },
};

export default function RoleLayout({
  brandTitle,
  brandSubtitle,
  accent,
  links,
}: RoleLayoutProps) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const c = ACCENT[accent];
  const initials = (user?.full_name ?? "U")
    .split(" ")
    .map((s) => s[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="h-20 px-5 flex items-center gap-3 border-b border-slate-100">
          <div className={`w-11 h-11 rounded-xl ${c.logoBg} grid place-items-center text-white font-bold`}>
            DS
          </div>
          <div>
            <div className="font-semibold text-slate-800 leading-tight">{brandTitle}</div>
            <div className="text-xs text-slate-400">{brandSubtitle}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? `${c.activeBg} ${c.activeText} shadow-sm`
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span className="flex-shrink-0">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 grid place-items-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">{user?.full_name}</div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => { logout(); nav("/login"); }}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
          >
            <ILogout width={16} height={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center gap-4 flex-shrink-0">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-800">
              Xin chào, {user?.full_name}!
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi lớp học và tiếp tục học Data Science cùng trợ giảng AI.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg w-72">
            <ISearch width={16} height={16} className="text-slate-400" />
            <input
              placeholder="Tìm kiếm nhanh..."
              className="bg-transparent border-0 outline-none text-sm flex-1"
            />
          </div>
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 grid place-items-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-800">{user?.full_name}</div>
              <div className="text-xs text-slate-400">{user?.role}</div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
