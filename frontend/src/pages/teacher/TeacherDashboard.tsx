import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

interface Klass {
  id: number;
  name: string;
  semester?: string | null;
  is_active: boolean;
}

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<Klass[]>([]);
  useEffect(() => {
    api.get<Klass[]>("/classes").then((r) => setClasses(r.data));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Lớp tôi phụ trách</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => (
          <Link
            key={c.id}
            to={`/teacher/classes/${c.id}`}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">{c.name}</div>
            <div className="text-sm text-slate-500 mt-1">{c.semester ?? "—"}</div>
            <div className="text-xs mt-3">
              <span
                className={`px-2 py-0.5 rounded ${
                  c.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {c.is_active ? "Đang diễn ra" : "Đã đóng"}
              </span>
            </div>
          </Link>
        ))}
        {classes.length === 0 && (
          <p className="text-slate-400 text-sm">Bạn chưa được phân lớp nào.</p>
        )}
      </div>
    </div>
  );
}
