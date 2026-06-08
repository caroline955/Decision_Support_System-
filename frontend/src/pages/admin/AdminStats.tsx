import { useEffect, useState } from "react";
import api from "../../lib/api";

interface Stats {
  users: { total: number; admins: number; teachers: number; students: number };
  courses: number;
  classes: number;
  lessons: number;
  enrollments: number;
  chat_sessions: number;
  chat_messages: number;
  alerts: { total: number; unread: number };
}

const Tile = ({ label, value, hint }: { label: string; value: number; hint?: string }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-3xl font-semibold mt-1">{value}</div>
    {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
  </div>
);

export default function AdminStats() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    api.get<Stats>("/admin/stats").then((r) => setS(r.data)).catch(() => {});
  }, []);

  if (!s) return <p className="text-slate-500">Đang tải thống kê...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tổng quan hệ thống</h1>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Tổng người dùng" value={s.users.total} hint={`${s.users.teachers} GV · ${s.users.students} SV`} />
        <Tile label="Môn học" value={s.courses} />
        <Tile label="Lớp" value={s.classes} />
        <Tile label="Bài học" value={s.lessons} />
        <Tile label="Phiên chat" value={s.chat_sessions} />
        <Tile label="Tin nhắn" value={s.chat_messages} />
        <Tile label="Lượt enroll" value={s.enrollments} />
        <Tile label="Cảnh báo chưa đọc" value={s.alerts.unread} hint={`Tổng ${s.alerts.total}`} />
      </section>
    </div>
  );
}
