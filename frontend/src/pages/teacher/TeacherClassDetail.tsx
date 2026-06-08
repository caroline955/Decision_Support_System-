import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";

interface Student {
  id: number;
  full_name: string;
  email: string;
  status: string;
  joined_at: string;
}

interface Schedule {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  room?: string;
}

interface Analytics {
  student_id: number;
  date: string;
  session_count: number;
  question_count: number;
  repeat_score: string;
}

export default function TeacherClassDetail() {
  const { classId } = useParams();
  const id = Number(classId);
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);

  useEffect(() => {
    if (!id) return;
    api.get<Student[]>(`/classes/${id}/students`).then((r) => setStudents(r.data));
    api.get<Schedule[]>(`/schedules`, { params: { class_id: id } }).then((r) => setSchedules(r.data));
    api.get<Analytics[]>(`/analytics/class/${id}`).then((r) => setAnalytics(r.data)).catch(() => {});
  }, [id]);

  const studentMap = new Map(students.map((s) => [s.id, s.full_name]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Chi tiết lớp #{id}</h1>

      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Sinh viên ({students.length})</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-1">Họ tên</th><th>Email</th><th>Tham gia</th></tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="py-1">{s.full_name}</td>
                <td>{s.email}</td>
                <td>{new Date(s.joined_at).toLocaleDateString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Lịch học ({schedules.length})</h2>
        <ul className="space-y-1 text-sm">
          {schedules.map((s) => (
            <li key={s.id} className="flex justify-between border-b py-1">
              <span>{s.title}</span>
              <span className="text-slate-500">
                {new Date(s.start_time).toLocaleString("vi-VN")} · {s.room ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Phân tích học tập</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">SV</th><th>Ngày</th>
              <th>Phiên</th><th>Câu hỏi</th><th>Hỏi lặp</th>
            </tr>
          </thead>
          <tbody>
            {analytics.map((a, i) => (
              <tr key={i} className="border-t">
                <td className="py-1">{studentMap.get(a.student_id) ?? a.student_id}</td>
                <td>{a.date}</td>
                <td>{a.session_count}</td>
                <td>{a.question_count}</td>
                <td className={Number(a.repeat_score) >= 0.7 ? "text-red-600 font-semibold" : ""}>
                  {Number(a.repeat_score).toFixed(2)}
                </td>
              </tr>
            ))}
            {analytics.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-4">Chưa có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
