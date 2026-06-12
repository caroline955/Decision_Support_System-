import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import type { Alert } from "../../lib/types";
import { Badge, Button, Card, EmptyState } from "../../components/UI";
import { ICheck, IFlag, ISpark, IUsers } from "../../components/icons";

type FilterTab = "all" | "unread" | "class_struggle" | "repeat_question";

type AlertHistoryMessage = {
  id: number;
  session_id: number;
  question: string;
  answer?: string | null;
  created_at: string;
};

type AlertHistory = {
  alert_id: number;
  alert_type: string;
  student_id?: number | null;
  student_name?: string | null;
  topic_id?: number | null;
  topic_name?: string | null;
  total_questions: number;
  messages: AlertHistoryMessage[];
};

const TYPE_META: Record<
  string,
  { label: string; icon: JSX.Element; tone: "rose" | "amber" | "brand" }
> = {
  repeat_question: { label: "SV hỏi lặp", icon: <IFlag />, tone: "amber" },
  class_struggle: { label: "Chủ đề nóng", icon: <ISpark />, tone: "rose" },
  hot_topic: { label: "Chủ đề nóng", icon: <ISpark />, tone: "rose" },
  low_activity: { label: "Ít hoạt động", icon: <IUsers />, tone: "brand" },
};

const SEV_META: Record<string, { label: string; cls: string; dot: string }> = {
  high: {
    label: "Khẩn cấp",
    cls: "bg-rose-50 text-rose-700 border-rose-100",
    dot: "bg-rose-500",
  },
  medium: {
    label: "Trung bình",
    cls: "bg-amber-50 text-amber-700 border-amber-100",
    dot: "bg-amber-500",
  },
  low: {
    label: "Thấp",
    cls: "bg-slate-50 text-slate-600 border-slate-100",
    dot: "bg-slate-400",
  },
};

export default function TeacherAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<FilterTab>("unread");
  const [busy, setBusy] = useState<number | null>(null);

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const load = () => api.get<Alert[]>("/alerts").then((r) => setAlerts(r.data));
  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      all: alerts.length,
      unread: alerts.filter((a) => !a.is_read).length,
      class_struggle: alerts.filter(
        (a) =>
          a.alert_type === "class_struggle" || a.alert_type === "hot_topic",
      ).length,
      repeat_question: alerts.filter((a) => a.alert_type === "repeat_question")
        .length,
    }),
    [alerts],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    if (filter === "unread") return alerts.filter((a) => !a.is_read);
    if (filter === "class_struggle") {
      return alerts.filter(
        (a) =>
          a.alert_type === "class_struggle" || a.alert_type === "hot_topic",
      );
    }
    return alerts.filter((a) => a.alert_type === filter);
  }, [alerts, filter]);

  const markRead = async (id: number) => {
    setBusy(id);
    try {
      await api.patch(`/alerts/${id}/read`);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const markAllRead = async () => {
    if (
      !confirm(`Đánh dấu tất cả ${counts.unread} cảnh báo chưa đọc là đã đọc?`)
    )
      return;
    const ids = alerts.filter((a) => !a.is_read).map((a) => a.id);
    await Promise.all(ids.map((id) => api.patch(`/alerts/${id}/read`)));
    load();
  };

  const openAlertHistory = async (alert: Alert) => {
    setSelectedAlert(alert);
    setAlertHistory(null);
    setHistoryError(null);
    setLoadingHistory(true);

    try {
      const res = await api.get<AlertHistory>(`/alerts/${alert.id}/history`);
      setAlertHistory(res.data);
    } catch (error) {
      console.error(error);
      setHistoryError(
        "Không tải được lịch sử hỏi lặp. Kiểm tra backend đã có API GET /alerts/{id}/history chưa.",
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  const closeHistory = () => {
    setSelectedAlert(null);
    setAlertHistory(null);
    setHistoryError(null);
    setLoadingHistory(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cảnh báo từ AI</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tín hiệu phát hiện tự động từ hoạt động hỏi của sinh viên.
            <span className="ml-2 font-semibold text-slate-700">
              {counts.unread}
            </span>{" "}
            chưa đọc /
            <span className="font-semibold text-slate-700"> {counts.all}</span>{" "}
            tổng
          </p>
        </div>
        {counts.unread > 0 && (
          <Button variant="secondary" onClick={markAllRead}>
            <ICheck width={14} height={14} /> Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-1 inline-flex gap-1 text-sm">
        {(
          [
            ["unread", `Chưa đọc · ${counts.unread}`],
            ["all", `Tất cả · ${counts.all}`],
            ["class_struggle", `Chủ đề nóng · ${counts.class_struggle}`],
            ["repeat_question", `Hỏi lặp · ${counts.repeat_question}`],
          ] as [FilterTab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === k
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IFlag />}
            title={
              filter === "unread"
                ? "Tất cả đã được đọc"
                : "Không có cảnh báo nào"
            }
            hint={
              filter === "unread"
                ? "Bạn đã xử lý hết các tín hiệu."
                : "Hệ thống sẽ tự động tạo cảnh báo khi phát hiện bất thường."
            }
          />
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((a) => {
            const meta = TYPE_META[a.alert_type] ?? {
              label: a.alert_type,
              icon: <IFlag />,
              tone: "amber" as const,
            };
            const sev = SEV_META[a.severity] ?? SEV_META.low;
            const canViewHistory = a.alert_type === "repeat_question";

            return (
              <li
                key={a.id}
                className={`bg-white rounded-2xl border shadow-soft transition hover:shadow-card ${
                  a.is_read ? "border-slate-100 opacity-70" : "border-slate-200"
                }`}
              >
                <div className="p-4 flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 ${
                      meta.tone === "rose"
                        ? "bg-rose-100 text-rose-600"
                        : meta.tone === "amber"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-brand-100 text-brand-600"
                    }`}
                  >
                    {meta.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">
                        {meta.label}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${sev.cls} inline-flex items-center gap-1`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${sev.dot}`}
                        />
                        {sev.label}
                      </span>
                      {!a.is_read && <Badge tone="emerald">Mới</Badge>}
                    </div>
                    <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                      {a.message}
                    </p>
                    <div className="text-xs text-slate-400 mt-2">
                      {new Date(a.created_at).toLocaleString("vi-VN")}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {canViewHistory && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openAlertHistory(a)}
                      >
                        Xem lịch sử hỏi lặp
                      </Button>
                    )}

                    {!a.is_read && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => markRead(a.id)}
                        disabled={busy === a.id}
                      >
                        <ICheck width={14} height={14} /> Đã đọc
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedAlert && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          onClick={closeHistory}
        >
          <div
            className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Lịch sử hỏi lặp
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {alertHistory?.student_name || "Sinh viên"} — Chủ đề:{" "}
                  <span className="font-medium text-slate-700">
                    {alertHistory?.topic_name || "Đang tải..."}
                  </span>
                </p>
                {alertHistory && (
                  <p className="mt-1 text-xs text-slate-400">
                    Tổng số câu hỏi tìm thấy: {alertHistory.total_questions}
                  </p>
                )}
              </div>

              <button
                onClick={closeHistory}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>

            {loadingHistory && (
              <p className="text-sm text-slate-500">Đang tải lịch sử...</p>
            )}

            {!loadingHistory && historyError && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                {historyError}
              </div>
            )}

            {!loadingHistory &&
              !historyError &&
              alertHistory?.messages.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Không tìm thấy câu hỏi lặp trong 7 ngày gần nhất.
                </div>
              )}

            <div className="space-y-4">
              {alertHistory?.messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Lần hỏi #{alertHistory.messages.length - index}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(msg.created_at).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
                    <div className="mb-1 font-semibold text-blue-700">
                      Sinh viên hỏi:
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.question}
                    </div>
                  </div>

                  {msg.answer && (
                    <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700">
                      <div className="mb-1 font-semibold text-emerald-700">
                        Chatbot trả lời:
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.answer}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
