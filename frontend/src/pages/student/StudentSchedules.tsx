import { useEffect, useState } from "react";
import api from "../../lib/api";

interface Klass { id: number; name: string }
interface Schedule {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  room?: string | null;
}

export default function StudentSchedules() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [classId, setClassId] = useState<number>(0);
  const [list, setList] = useState<Schedule[]>([]);

  useEffect(() => {
    api.get<Klass[]>("/classes").then((r) => {
      setClasses(r.data);
      if (r.data.length) setClassId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    api.get<Schedule[]>("/schedules", { params: { class_id: classId } }).then((r) => setList(r.data));
  }, [classId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Lịch học</h1>
        <select className="border rounded px-2 py-1.5 text-sm"
                value={classId} onChange={(e) => setClassId(Number(e.target.value))}>
          {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Tiêu đề</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Phòng</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">{s.title}</td>
                <td>{new Date(s.start_time).toLocaleString("vi-VN")}</td>
                <td>{new Date(s.end_time).toLocaleString("vi-VN")}</td>
                <td>{s.room ?? "—"}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-slate-400">Chưa có lịch</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
