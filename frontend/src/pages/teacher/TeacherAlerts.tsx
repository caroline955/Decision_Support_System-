import { useEffect, useState } from "react";
import api from "../../lib/api";
import type { Alert } from "../../lib/types";

const sevColor: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

export default function TeacherAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const load = () => api.get<Alert[]>("/alerts").then((r) => setAlerts(r.data));
  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    await api.patch(`/alerts/${id}/read`);
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Cảnh báo từ AI</h1>
      {alerts.length === 0 ? (
        <p className="text-slate-500 text-sm">Chưa có cảnh báo nào.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id}
                className={`bg-white rounded-lg shadow p-4 flex items-start gap-3 ${a.is_read ? "opacity-60" : ""}`}>
              <span className={`text-xs px-2 py-0.5 rounded ${sevColor[a.severity] ?? ""}`}>
                {a.severity}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">{a.alert_type}</div>
                <div className="text-sm text-slate-700">{a.message}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {new Date(a.created_at).toLocaleString("vi-VN")}
                </div>
              </div>
              {!a.is_read && (
                <button onClick={() => markRead(a.id)}
                        className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded">
                  Đánh dấu đã đọc
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
