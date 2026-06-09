import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Badge, Card, CardHeader, EmptyState, StatCard } from "../../components/UI";
import {
  IArrowRight, IBot, ICalendar, IMessage, ISchool, ISpark,
} from "../../components/icons";

interface Klass { id: number; name: string; semester?: string | null; is_active?: boolean }
interface Schedule {
  id: number; title: string; start_time: string; end_time: string; room?: string | null;
}
interface Analytics {
  date: string; session_count: number; question_count: number; repeat_score: string;
}

const today = new Date().toLocaleDateString("vi-VN", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

export default function StudentDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Klass[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);

  useEffect(() => {
    api.get<Klass[]>("/classes").then(async (r) => {
      setClasses(r.data);
      // load schedules of all classes (simple aggregation)
      const all: Schedule[] = [];
      for (const c of r.data) {
        try {
          const res = await api.get<Schedule[]>("/schedules", { params: { class_id: c.id } });
          all.push(...res.data);
        } catch {}
      }
      all.sort((a, b) => a.start_time.localeCompare(b.start_time));
      setSchedules(all);
    });
    api.get<Analytics[]>("/analytics/me").then((r) => setAnalytics(r.data)).catch(() => {});
  }, []);

  const totalSessions = analytics.reduce((s, a) => s + a.session_count, 0);
  const totalQuestions = analytics.reduce((s, a) => s + a.question_count, 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white p-7">
        <div className="text-xs uppercase tracking-wide text-brand-100/80">{today}</div>
        <h2 className="text-2xl md:text-3xl font-bold mt-2 max-w-2xl">
          Học Data Science từ dữ liệu lớp học thật của bạn.
        </h2>
        <p className="text-sm text-brand-100/90 mt-2 max-w-xl">
          Trợ giảng AI tham chiếu trực tiếp tài liệu môn học khi trả lời câu hỏi của bạn.
        </p>
        <div className="mt-4 inline-block">
          <Link
            to="/student/chat"
            className="inline-flex items-center gap-2 bg-white text-brand-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-50"
          >
            <ISpark width={16} height={16} />
            Hỏi trợ giảng AI ngay
            <IArrowRight width={16} height={16} />
          </Link>
        </div>
        <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute right-10 top-6 w-20 h-20 rounded-2xl bg-white/10 rotate-12" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard tone="brand"   icon={<ISchool />}  label="Lớp của tôi"      value={classes.length}    unit="lớp" />
        <StatCard tone="sky"     icon={<ICalendar />} label="Lịch học"        value={schedules.length}  unit="buổi" />
        <StatCard tone="violet"  icon={<IBot />}     label="Phiên học AI"    value={totalSessions}     unit="phiên" />
        <StatCard tone="amber"   icon={<IMessage />} label="Câu hỏi đã gửi"  value={totalQuestions}    unit="câu" />
      </div>

      {/* 2 col content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader
            title="Lớp của tôi"
            action={
              <Link to="/student/schedules" className="text-xs text-brand-600 hover:underline">
                Xem lịch học
              </Link>
            }
          />
          {classes.length === 0 ? (
            <EmptyState icon={<ISchool />} title="Chưa được thêm vào lớp" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {classes.map((c) => (
                <li key={c.id} className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 grid place-items-center">
                    <ISchool />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.semester ?? "—"}</div>
                  </div>
                  <Badge tone="emerald">Đang học</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Lịch học gần nhất"
            action={
              <Link to="/student/schedules" className="text-xs text-brand-600 hover:underline">
                Chi tiết
              </Link>
            }
          />
          {schedules.length === 0 ? (
            <EmptyState icon={<ICalendar />} title="Chưa có lịch học" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {schedules.slice(0, 4).map((s) => {
                const d = new Date(s.start_time);
                const e = new Date(s.end_time);
                return (
                  <li key={s.id} className="py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 grid place-items-center">
                      <ICalendar />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{s.title}</div>
                      <div className="text-xs text-slate-400">
                        {d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {e.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <Badge>{s.room ?? "—"}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
