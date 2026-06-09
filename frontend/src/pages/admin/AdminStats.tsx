import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Card, CardHeader, EmptyState, StatCard } from "../../components/UI";
import {
  IBell, IBook, IBot, IGraduate, IMessage, ISchool, IUsers,
} from "../../components/icons";

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

export default function AdminStats() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    api.get<Stats>("/admin/stats").then((r) => setS(r.data)).catch(() => {});
  }, []);

  if (!s) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Card key={i}><div className="h-12 bg-slate-100 rounded animate-pulse" /></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Người dùng</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard tone="rose"   icon={<IUsers />}    label="Tổng người dùng" value={s.users.total} />
          <StatCard tone="brand"  icon={<IUsers />}    label="Quản trị viên"   value={s.users.admins} />
          <StatCard tone="emerald" icon={<IUsers />}   label="Giáo viên"        value={s.users.teachers} />
          <StatCard tone="violet" icon={<IGraduate />} label="Sinh viên"        value={s.users.students} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Học vụ</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard tone="brand"  icon={<IBook />}   label="Môn học"     value={s.courses} />
          <StatCard tone="sky"    icon={<ISchool />} label="Lớp"          value={s.classes} />
          <StatCard tone="amber"  icon={<IBook />}   label="Bài học"     value={s.lessons} />
          <StatCard tone="emerald" icon={<IUsers />} label="Lượt enroll" value={s.enrollments} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Tương tác AI</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard tone="violet" icon={<IBot />}     label="Phiên chat"      value={s.chat_sessions} />
          <StatCard tone="brand"  icon={<IMessage />} label="Tin nhắn"        value={s.chat_messages} />
          <StatCard tone="rose"   icon={<IBell />}    label="Cảnh báo chưa đọc" value={s.alerts.unread} />
          <StatCard tone="amber"  icon={<IBell />}    label="Tổng cảnh báo"   value={s.alerts.total} />
        </div>
      </div>

      <Card>
        <CardHeader title="Thông tin hệ thống" />
        <ul className="text-sm text-slate-600 space-y-1.5">
          <li className="flex justify-between border-b border-slate-100 py-1.5">
            <span>Trạng thái backend</span>
            <span className="text-emerald-600 font-medium">● Hoạt động</span>
          </li>
          <li className="flex justify-between border-b border-slate-100 py-1.5">
            <span>Trạng thái database</span>
            <span className="text-emerald-600 font-medium">● Kết nối</span>
          </li>
          <li className="flex justify-between border-b border-slate-100 py-1.5">
            <span>LLM Provider</span>
            <span className="text-slate-500">mock (demo)</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
