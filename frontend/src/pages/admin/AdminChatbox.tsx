import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Badge, Button, Card, CardHeader, EmptyState, StatCard } from "../../components/UI";
import {
  IBot, IClock, IFlag, IMessage, ISpark, ITrash, IX,
} from "../../components/icons";

interface ChatStats {
  total_sessions: number;
  active_sessions: number;
  total_messages: number;
  student_questions: number;
  avg_response_ms: number;
  top_topics: { name: string; count: number }[];
}
interface SessionRow {
  id: number;
  student_id: number;
  student_name: string;
  course_code?: string | null;
  title?: string | null;
  started_at: string;
  ended_at?: string | null;
  message_count: number;
}
interface MessageRow {
  id: number;
  sender: "student" | "bot";
  content: string;
  topic_id?: number | null;
  lesson_id?: number | null;
  tokens_used?: number | null;
  response_time_ms?: number | null;
  created_at: string;
}

type FilterStatus = "all" | "active" | "ended";

export default function AdminChatbox() {
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [drawerData, setDrawerData] = useState<{ session: SessionRow; messages: MessageRow[] } | null>(null);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  const loadAll = () => {
    api.get<ChatStats>("/admin/chat/stats").then((r) => setStats(r.data));
    api.get<SessionRow[]>("/admin/chat/sessions", { params: { status: filter, limit: 100 } })
       .then((r) => setSessions(r.data));
  };
  useEffect(loadAll, [filter]);

  const openDrawer = async (id: number) => {
    setDrawerId(id);
    setLoadingDrawer(true);
    setDrawerData(null);
    try {
      const r = await api.get(`/admin/chat/sessions/${id}/messages`);
      setDrawerData(r.data);
    } finally {
      setLoadingDrawer(false);
    }
  };

  const endSession = async (id: number) => {
    if (!confirm("Đóng phiên chat này (đặt ended_at = giờ hiện tại)?")) return;
    await api.patch(`/admin/chat/sessions/${id}/end`);
    loadAll();
    if (drawerId === id) openDrawer(id);
  };

  const deleteSession = async (id: number) => {
    if (!confirm("Xoá phiên chat này và toàn bộ tin nhắn? Không thể hoàn tác.")) return;
    await api.delete(`/admin/chat/sessions/${id}`);
    setDrawerId(null);
    loadAll();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Chatbox</h1>
        <p className="text-sm text-slate-500 mt-1">
          Giám sát hoạt động trợ giảng AI, xem lịch sử và can thiệp phiên chat.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard tone="brand"   icon={<IBot />}     label="Tổng phiên chat"  value={stats?.total_sessions ?? "—"} />
        <StatCard tone="emerald" icon={<ISpark />}   label="Phiên đang mở"    value={stats?.active_sessions ?? "—"} />
        <StatCard tone="violet"  icon={<IMessage />} label="Tổng tin nhắn"    value={stats?.total_messages ?? "—"} />
        <StatCard tone="amber"   icon={<IFlag />}    label="Câu hỏi của SV"   value={stats?.student_questions ?? "—"} />
        <StatCard tone="sky"     icon={<IClock />}   label="Phản hồi TB"
                  value={stats ? Math.round(stats.avg_response_ms) : "—"} unit="ms" />
      </div>

      {/* Top topics */}
      {stats && stats.top_topics.length > 0 && (
        <Card>
          <CardHeader title="Chủ đề được hỏi nhiều nhất" />
          <div className="flex flex-wrap gap-2">
            {stats.top_topics.map((t, i) => (
              <span key={t.name}
                    className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                      i === 0
                        ? "bg-rose-100 text-rose-700"
                        : i === 1
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                {t.name} <span className="opacity-60">· {t.count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Filter + sessions list */}
      <Card padding={false}>
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Phiên chat gần đây</h2>
          <div className="bg-slate-100 rounded-xl p-1 flex gap-1 text-xs">
            {(["all", "active", "ended"] as FilterStatus[]).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition ${
                        filter === s ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
                      }`}>
                {s === "all" ? "Tất cả" : s === "active" ? "Đang mở" : "Đã đóng"}
              </button>
            ))}
          </div>
        </div>
        {sessions.length === 0 ? (
          <div className="p-5"><EmptyState icon={<IBot />} title="Không có phiên nào" /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <div key={s.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 grid place-items-center flex-shrink-0">
                  <IBot />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-800 truncate">{s.title ?? `Phiên #${s.id}`}</span>
                    {s.course_code && <Badge tone="brand">{s.course_code}</Badge>}
                    <Badge tone={s.ended_at ? "slate" : "emerald"}>
                      {s.ended_at ? "Đã đóng" : "Đang mở"}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {s.student_name} · {s.message_count} tin nhắn ·{" "}
                    {new Date(s.started_at).toLocaleString("vi-VN")}
                  </div>
                </div>
                <Button variant="secondary" onClick={() => openDrawer(s.id)}>Xem</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Drawer xem chi tiết */}
      {drawerId !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end" onClick={() => setDrawerId(null)}>
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-3 sticky top-0 bg-white z-10">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800">
                  {drawerData?.session.title ?? `Phiên #${drawerId}`}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {drawerData?.session.student_name} ·{" "}
                  {drawerData?.session.message_count} tin nhắn ·{" "}
                  {drawerData?.session.ended_at ? "Đã đóng" : "Đang mở"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {drawerData && !drawerData.session.ended_at && (
                  <Button variant="secondary" onClick={() => endSession(drawerId)}>
                    <IFlag width={14} height={14} className="inline mr-1" /> Đóng
                  </Button>
                )}
                <Button variant="danger" onClick={() => deleteSession(drawerId)}>
                  <ITrash width={14} height={14} className="inline mr-1" /> Xoá
                </Button>
                <button onClick={() => setDrawerId(null)} className="p-2 hover:bg-slate-100 rounded-lg"><IX /></button>
              </div>
            </div>
            <div className="flex-1 p-5 space-y-3 bg-slate-50/50">
              {loadingDrawer && <p className="text-sm text-slate-400">Đang tải...</p>}
              {drawerData?.messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "student" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    m.sender === "student"
                      ? "bg-brand-600 text-white rounded-br-sm"
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
                  }`}>
                    {m.content}
                    <div className={`text-[10px] mt-1 ${m.sender === "student" ? "text-brand-100" : "text-slate-400"}`}>
                      {new Date(m.created_at).toLocaleTimeString("vi-VN")}
                      {m.response_time_ms ? ` · ${m.response_time_ms} ms` : ""}
                      {m.tokens_used ? ` · ${m.tokens_used} tokens` : ""}
                    </div>
                  </div>
                </div>
              ))}
              {drawerData?.messages.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-10">Phiên chưa có tin nhắn nào.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
