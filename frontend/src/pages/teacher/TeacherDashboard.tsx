import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { Badge, Card, CardHeader, EmptyState, StatCard } from "../../components/UI";
import { IArrowRight, IBell, ISchool, IUsers } from "../../components/icons";

interface Klass {
  id: number;
  name: string;
  course_code?: string | null;
  semester?: string | null;
  is_active: boolean;
  student_count: number;
}

interface Alert {
  id: number;
  alert_type: string;
  severity: "low" | "medium" | "high";
  message: string;
  is_read: boolean;
  created_at: string;
}

interface StudentActivity {
  student_id: number;
  student_name: string;
  email: string;
  class_id: number;
  class_name: string;
  question_count: number;
  last_active: string | null;
}

interface TopTopic {
  name: string;
  count: number;
}

interface StudentChatHistoryItem {
  id: number;
  session_id: number;
  session_title?: string | null;
  sender: "student" | "bot" | string;
  content: string;
  topic_id?: number | null;
  created_at: string;
}

const sevTone: Record<string, "rose" | "amber" | "slate"> = {
  high: "rose",
  medium: "amber",
  low: "slate",
};

function alertLabel(type: string) {
  if (type === "repeat_question") return "Hỏi lặp";
  if (type === "class_struggle") return "Chủ đề nóng";
  if (type === "low_activity") return "Ít hoạt động";
  return type || "Khác";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa hoạt động";
  return new Date(value).toLocaleString("vi-VN");
}

function activityTone(questionCount: number, lastActive?: string | null) {
  if (!lastActive || questionCount === 0) {
    return { label: "Chưa tương tác", tone: "slate" as const };
  }
  if (questionCount >= 10) {
    return { label: "Rất tích cực", tone: "emerald" as const };
  }
  if (questionCount >= 3) {
    return { label: "Có tương tác", tone: "sky" as const };
  }
  return { label: "Ít tương tác", tone: "amber" as const };
}

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<StudentActivity | null>(null);
  const [history, setHistory] = useState<StudentChatHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [topTopics, setTopTopics] = useState<TopTopic[]>([]);

  useEffect(() => {
    api.get<Klass[]>("/classes").then((r) => setClasses(r.data));
    api.get<Alert[]>("/alerts").then((r) => setAlerts(r.data)).catch(() => {});
    api
      .get<TopTopic[]>("/teacher/top-topics")
      .then((r) => setTopTopics(r.data))
      .catch(() => setTopTopics([]));

    setLoadingActivity(true);
    api
      .get<StudentActivity[]>("/teacher/student-activity")
      .then((r) => {
        setActivities(r.data);
        setActivityError(null);
      })
      .catch(() => {
        setActivities([]);
        setActivityError(
          "Chưa tải được dữ liệu hoạt động sinh viên. Kiểm tra backend đã có API /teacher/student-activity chưa."
        );
      })
      .finally(() => setLoadingActivity(false));
  }, []);

  const totalStudents = classes.reduce((s, c) => s + c.student_count, 0);
  const unread = alerts.filter((a) => !a.is_read).length;

  const activityStats = useMemo(() => {
    const activeStudents = activities.filter((s) => s.question_count > 0).length;
    const totalQuestions = activities.reduce((sum, s) => sum + (s.question_count || 0), 0);
    const inactiveStudents = activities.filter((s) => !s.last_active || s.question_count === 0).length;

    return { activeStudents, totalQuestions, inactiveStudents };
  }, [activities]);

  async function openStudentHistory(student: StudentActivity) {
    setSelectedStudent(student);
    setLoadingHistory(true);
    setHistory([]);

    try {
      const res = await api.get<StudentChatHistoryItem[]>(
        `/teacher/students/${student.student_id}/chat-history`
      );
      setHistory(res.data);
    } catch (error) {
      console.error(error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard tone="emerald" icon={<ISchool />} label="Lớp phụ trách" value={classes.length} unit="lớp" />
        <StatCard tone="sky" icon={<IUsers />} label="Tổng sinh viên" value={totalStudents} unit="SV" />
        <StatCard tone="rose" icon={<IBell />} label="Cảnh báo mới" value={unread} unit="thông báo" />
      </div>

      {/* Learning activity summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs text-slate-500">Sinh viên có tương tác</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {activityStats.activeStudents}
            <span className="ml-1 text-sm font-normal text-slate-500">SV</span>
          </div>
        </Card>

        <Card>
          <div className="text-xs text-slate-500">Tổng câu hỏi chatbot</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {activityStats.totalQuestions}
            <span className="ml-1 text-sm font-normal text-slate-500">câu</span>
          </div>
        </Card>

        <Card>
          <div className="text-xs text-slate-500">Sinh viên ít/chưa học</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">
            {activityStats.inactiveStudents}
            <span className="ml-1 text-sm font-normal text-slate-500">SV</span>
          </div>
        </Card>
      </div>


      {/* Top topics */}
      <Card>
        <CardHeader title="Chủ đề được hỏi nhiều nhất" />
        <p className="mb-4 text-xs text-slate-400 -mt-3">
          Các chủ đề sinh viên trong lớp của bạn hỏi nhiều nhất qua chatbot.
        </p>

        {topTopics.length === 0 ? (
          <EmptyState
            icon={<IBell />}
            title="Chưa có dữ liệu chủ đề"
            hint="Khi sinh viên hỏi chatbot và hệ thống detect được topic, dữ liệu sẽ xuất hiện ở đây."
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {topTopics.map((topic, index) => {
              const styles = [
                "bg-rose-50 text-rose-700",
                "bg-amber-50 text-amber-700",
                "bg-emerald-50 text-emerald-700",
                "bg-sky-50 text-sky-700",
                "bg-slate-100 text-slate-700",
              ];

              return (
                <span
                  key={topic.name}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${styles[index] ?? styles[4]}`}
                >
                  {topic.name} · {topic.count}
                </span>
              );
            })}
          </div>
        )}
      </Card>

      {/* Student activity table */}
      <Card padding={false}>
        <div className="p-5 border-b border-slate-100">
          <CardHeader title="Hoạt động học tập của sinh viên" />
          <p className="text-xs text-slate-400 -mt-3">
            Dữ liệu được nối từ lớp giáo viên phụ trách → sinh viên → phiên chat → câu hỏi chatbot.
          </p>
        </div>

        {loadingActivity ? (
          <div className="p-8 text-sm text-slate-500">Đang tải dữ liệu hoạt động...</div>
        ) : activityError ? (
          <div className="p-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {activityError}
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<IUsers />}
              title="Chưa có dữ liệu hoạt động"
              hint="Khi sinh viên hỏi chatbot, dữ liệu sẽ xuất hiện ở đây."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Sinh viên</th>
                  <th className="px-5 py-3 text-left font-semibold">Lớp</th>
                  <th className="px-5 py-3 text-left font-semibold">Số câu hỏi</th>
                  <th className="px-5 py-3 text-left font-semibold">Hoạt động gần nhất</th>
                  <th className="px-5 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((s) => {
                  const tone = activityTone(s.question_count, s.last_active);
                  return (
                    <tr key={`${s.class_id}-${s.student_id}`} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{s.student_name}</div>
                        <div className="text-xs text-slate-400">{s.email}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{s.class_name}</td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900">{s.question_count}</span>
                        <span className="ml-1 text-xs text-slate-500">câu</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatDateTime(s.last_active)}</td>
                      <td className="px-5 py-4">
                        <Badge tone={tone.tone}>{tone.label}</Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openStudentHistory(s)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          Xem lịch sử
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 2 col: classes + alerts preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Classes */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Lớp tôi phụ trách</h2>
            <span className="text-xs text-slate-400">1 GV → nhiều lớp</span>
          </div>

          {classes.length === 0 ? (
            <Card>
              <EmptyState icon={<ISchool />} title="Chưa có lớp" hint="Liên hệ Admin để được phân lớp." />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((c) => (
                <Link
                  key={c.id}
                  to={`/teacher/classes/${c.id}`}
                  className="group bg-white rounded-2xl p-5 shadow-soft border border-slate-100 hover:shadow-card hover:-translate-y-0.5 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 grid place-items-center">
                      <ISchool />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 group-hover:text-emerald-700 truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Môn <span className="font-mono text-slate-700">{c.course_code ?? "—"}</span>
                        {" · "}
                        {c.semester ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <div className="text-xs text-slate-500">Sĩ số</div>
                      <div className="text-lg font-bold text-slate-800">
                        {c.student_count}
                        <span className="text-xs font-normal text-slate-500"> SV</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2.5">
                      <div className="text-xs text-slate-500">Trạng thái</div>
                      <div className="mt-0.5">
                        <Badge tone={c.is_active ? "emerald" : "slate"}>
                          {c.is_active ? "Đang dạy" : "Đã đóng"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-emerald-600 inline-flex items-center gap-1">
                    Xem chi tiết lớp <IArrowRight width={14} height={14} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Alerts preview */}
        <Card padding={false} className="self-start">
          <div className="p-5 border-b border-slate-100">
            <CardHeader
              title="Cảnh báo gần đây"
              action={
                <Link to="/teacher/alerts" className="text-xs text-rose-600 hover:underline">
                  Xem tất cả
                </Link>
              }
            />
            <p className="text-xs text-slate-400 -mt-3">
              {unread} chưa đọc / {alerts.length} tổng
            </p>
          </div>

          {alerts.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={<IBell />} title="Chưa có cảnh báo" hint="AI sẽ thông báo khi phát hiện vấn đề." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {alerts.slice(0, 6).map((a) => (
                <li key={a.id} className={`p-4 ${a.is_read ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-2">
                    <Badge tone={sevTone[a.severity]}>{a.severity}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-700">{alertLabel(a.alert_type)}</div>
                      <div className="text-sm text-slate-700 mt-0.5 line-clamp-2">{a.message}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {new Date(a.created_at).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Student chat history modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Lịch sử hỏi chatbot</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedStudent.student_name} · {selectedStudent.class_name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setHistory([]);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="p-5">
              {loadingHistory ? (
                <div className="text-sm text-slate-500">Đang tải lịch sử...</div>
              ) : history.length === 0 ? (
                <EmptyState
                  icon={<IBell />}
                  title="Chưa có lịch sử"
                  hint="Sinh viên này chưa có câu hỏi chatbot hoặc backend chưa trả dữ liệu."
                />
              ) : (
                <div className="space-y-3">
                  {history.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-2xl border p-4 ${
                        msg.sender === "student"
                          ? "border-blue-100 bg-blue-50"
                          : "border-emerald-100 bg-emerald-50"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge tone={msg.sender === "student" ? "sky" : "emerald"}>
                          {msg.sender === "student" ? "Sinh viên hỏi" : "Chatbot trả lời"}
                        </Badge>
                        <span className="text-xs text-slate-400">{formatDateTime(msg.created_at)}</span>
                      </div>

                      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                        {msg.content}
                      </div>

                      {msg.session_title && (
                        <div className="mt-2 text-xs text-slate-400">
                          Phiên chat: {msg.session_title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
