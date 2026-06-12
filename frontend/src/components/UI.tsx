import { ReactNode } from "react";

// ----- Card -----
export function Card({
  children,
  className = "",
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-soft border border-slate-100 ${
        padding ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ----- Section header inside a card -----
export function CardHeader({
  title,
  action,
}: {
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-semibold text-slate-800">{title}</h2>
      {action}
    </div>
  );
}

// ----- Stat card with icon -----
export function StatCard({
  icon,
  label,
  value,
  unit,
  tone = "brand",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  tone?: "brand" | "emerald" | "rose" | "amber" | "violet" | "sky";
}) {
  const toneClasses: Record<string, string> = {
    brand: "bg-brand-100 text-brand-600",
    emerald: "bg-emerald-100 text-emerald-600",
    rose: "bg-rose-100 text-rose-600",
    amber: "bg-amber-100 text-amber-600",
    violet: "bg-violet-100 text-violet-600",
    sky: "bg-sky-100 text-sky-600",
  };
  return (
    <Card className="flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl grid place-items-center ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-800">{value}</span>
          {unit && <span className="text-xs text-slate-500">{unit}</span>}
        </div>
      </div>
    </Card>
  );
}

// ----- Badge -----
export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "emerald" | "rose" | "amber" | "brand";
}) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    brand: "bg-brand-100 text-brand-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

// ----- Empty state -----
export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="text-center py-10 px-4">
      {icon && (
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 grid place-items-center text-slate-400">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

// ----- Button -----
export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "soft-danger";
  size?: "sm" | "md";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantMap: Record<string, string> = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-sm",
    secondary: "bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700",
    ghost: "hover:bg-slate-100 text-slate-700",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm",
    "soft-danger": "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100",
  };
  const sizeMap: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variantMap[variant]} ${sizeMap[size]} ${className}`}
    >
      {children}
    </button>
  );
}


// ----- Icon button (square, 36px) -----
export function IconButton({
  icon,
  label,
  variant = "ghost",
  className = "",
  ...rest
}: {
  icon: ReactNode;
  label: string; // for a11y + tooltip
  variant?: "ghost" | "secondary" | "danger";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const map: Record<string, string> = {
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
    secondary: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-600",
    danger: "text-rose-500 hover:bg-rose-50 hover:text-rose-600",
  };
  return (
    <button
      {...rest}
      title={label}
      aria-label={label}
      className={`inline-grid place-items-center w-9 h-9 rounded-lg transition disabled:opacity-50 ${map[variant]} ${className}`}
    >
      {icon}
    </button>
  );
}


// ----- Avatar with deterministic gradient based on name -----
const AVATAR_GRADIENTS = [
  "from-rose-400 to-pink-500",
  "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-500",
  "from-sky-400 to-blue-500",
  "from-amber-400 to-orange-500",
  "from-lime-400 to-green-500",
  "from-fuchsia-400 to-rose-500",
];
export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initial = name.split(" ").slice(-1)[0]?.[0]?.toUpperCase() ?? "?";
  // simple hash: sum char codes
  const hash = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  const grad = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  const sizeMap: Record<string, string> = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-base",
    lg: "w-14 h-14 text-lg",
  };
  return (
    <div
      className={`bg-gradient-to-br ${grad} text-white grid place-items-center font-bold rounded-xl shadow-sm ring-2 ring-white ${sizeMap[size]}`}
    >
      {initial}
    </div>
  );
}


// ----- Status dot -----
export function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          active ? "bg-emerald-500 ring-2 ring-emerald-100" : "bg-slate-400 ring-2 ring-slate-100"
        }`}
      />
      {active ? "Đang hoạt động" : "Đã khoá"}
    </span>
  );
}
