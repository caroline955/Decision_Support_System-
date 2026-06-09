import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { Badge, Card, CardHeader, EmptyState, StatCard } from "../../components/UI";
import { IArrowRight, IBell, ISchool, IUsers } from "../../components/icons";

interface Klass {
  id: number;
  name: string;
  course_code?: string | null;
  semester?: string | null;
  is_active: boolean;
  student_count: number;
}

interface Alert {
  id: number;
  alert_type: string;
  severity: "low" | "medium" | "high";
  message: string;
  is_read: boolean;
  created_at: string;
}

const sevTone: Record<string, "rose" | "amber" | "slate"> = {
  high: "rose", medium: "amber", low: "slate",
};

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    api.get<Klass[]>("/classes").then((r) => setClasses(r.data));
    api.get<Alert[]>("/alerts").then((r) => setAlerts(r.data)).catch(() => {});
  }, []);

  const totalStudents = classes.reduce((s, c) => s + c.student_count, 0);
  const unread = alerts.filter((a) => !a.is_read).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard tone="emerald" icon={<ISchool />} label="Lớp phụ trách"  value={classes.length} unit="lớp" />
        <StatCard tone="sky"     icon={<IUsers />}  label="Tổng sinh viên" value={totalStudents}  unit="SV" />
        <StatCard tone="rose"    icon={<IBell />}   label="Cảnh báo mới"   value={unread}         unit="thông báo" />
      </div>

      {/* 2 col: classes + alerts preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Classes */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Lớp tôi phụ trách</h2>
            <span className="text-xs text-slate-400">1 GV → nhiều lớp</span>
          </div>
          {classes.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ISchool />}
                title="Chưa có lớp"
                hint="Liên hệ Admin để được phân lớp."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((c) => (
                <Link
                  key={c.id}
                  to={`/teacher/classes/${c.id}`}
                  className="group bg-white rounded-2xl p-5 shadow-soft border border-slate-100 hover:shadow-card hover:-translate-y-0.5 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 grid place-items-center">
                      <ISchool />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 group-hover:text-emerald-700 truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Môn <span className="font-mono text-slate-700">{c.course_code ?? "—"}</span>
                        {" · "}{c.semester ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <div className="text-xs text-slate-500">Sĩ số</div>
                      <div className="text-lg font-bold text-slate-800">
                        {c.student_count} <span className="text-xs font-normal text-slate-500">SV</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <div className="text-xs text-slate-500">Trạng thái</div>
                      <div className="mt-0.5">
                        <Badge tone={c.is_active ? "emerald" : "slate"}>
                          {c.is_active ? "Đang dạy" : "Đã đóng"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-emerald-600 inline-flex items-center gap-1">
                    Xem chi tiết lớp <IArrowRight width={14} height={14} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Alerts preview */}
        <Card padding={false} className="self-start">
          <div className="p-5 border-b border-slate-100">
            <CardHeader
              title="Cảnh báo gần đây"
              action={
                <Link to="/teacher/alerts" className="text-xs text-rose-600 hover:underline">
                  Xem tất cả
                </Link>
              }
            />
            <p className="text-xs text-slate-400 -mt-3">
              {unread} chưa đọc / {alerts.length} tổng
            </p>
          </div>
          {alerts.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={<IBell />} title="Chưa có cảnh báo" hint="AI sẽ thông báo khi phát hiện vấn đề." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {alerts.slice(0, 6).map((a) => (
                <li key={a.id} className={`p-4 ${a.is_read ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-2">
                    <Badge tone={sevTone[a.severity]}>{a.severity}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-700">{a.alert_type}</div>
                      <div className="text-sm text-slate-700 mt-0.5 line-clamp-2">{a.message}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {new Date(a.created_at).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
