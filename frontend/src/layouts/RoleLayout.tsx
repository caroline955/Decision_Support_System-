import { ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Accent = "brand" | "emerald" | "rose";

interface RoleLayoutProps {
  title: string;
  accent: Accent;
  links: { to: string; label: string; end?: boolean }[];
  homePath: string;
  extraHeader?: ReactNode;
}

const ACCENT: Record<Accent, { dot: string; logo: string; active: string }> = {
  brand: {
    dot: "bg-brand-500",
    logo: "text-brand-700",
    active: "bg-brand-100 text-brand-700",
  },
  emerald: {
    dot: "bg-emerald-500",
    logo: "text-emerald-700",
    active: "bg-emerald-100 text-emerald-700",
  },
  rose: {
    dot: "bg-rose-500",
    logo: "text-rose-700",
    active: "bg-rose-100 text-rose-700",
  },
};

export default function RoleLayout({
  title,
  accent,
  links,
  homePath,
  extraHeader,
}: RoleLayoutProps) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const onLogout = () => {
    logout();
    nav("/login");
  };
  const c = ACCENT[accent];

  const itemBase =
    "px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100 text-slate-700";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to={homePath}
            className={`font-bold text-lg flex items-center gap-2 ${c.logo}`}
          >
            <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} />
            {title}
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `${itemBase} ${isActive ? c.active : ""}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {extraHeader}
            <span className="text-slate-600">
              {user?.full_name}{" "}
              <span className="text-xs text-slate-400">({user?.role})</span>
            </span>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
