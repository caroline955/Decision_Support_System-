import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

interface Klass { id: number; name: string; semester?: string | null }
interface Analytics {
  date: string;
  session_count: number;
  question_count: number;
  repeat_score: string;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Klass[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);

  useEffect(() => {
    api.get<Klass[]>("/classes").then((r) => setClasses(r.data));
    api.get<Analytics[]>("/analytics/me").then((r) => setAnalytics(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Xin chào, {user?.full_name}</h1>

      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Lớp của tôi</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa được thêm vào lớp nào.</p>
        ) : (
          <ul className="divide-y">
            {classes.map((c) => (
              <li key={c.id} className="py-2 flex justify-between text-sm">
                <span>{c.name}</span>
                <span className="text-slate-400">{c.semester ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Hoạt động học tập gần đây</h2>
        {analytics.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có dữ liệu (hãy thử hỏi chatbot).</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1">Ngày</th>
                <th>Phiên</th>
                <th>Câu hỏi</th>
                <th>Hỏi lặp</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((a, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1">{a.date}</td>
                  <td>{a.session_count}</td>
                  <td>{a.question_count}</td>
                  <td>{Number(a.repeat_score).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
