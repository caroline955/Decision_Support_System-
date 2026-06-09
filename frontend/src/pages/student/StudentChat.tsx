import { FormEvent, useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import type { AskResponse, ChatMessage } from "../../lib/types";
import { Card, EmptyState } from "../../components/UI";
import { IBook, IBot, ISend, ISpark } from "../../components/icons";

const SUGGESTIONS = [
  "Pandas groupby là gì?",
  "Cách đọc CSV tiếng Việt?",
  "Linear regression dùng sklearn ra sao?",
  "Khi nào dùng list comprehension?",
];

export default function StudentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [refs, setRefs] = useState<AskResponse["lesson_refs"]>([]);
  const [topic, setTopic] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const ask = async (q: string) => {
    if (!q || busy) return;
    setMessages((m) => [
      ...m,
      { id: Date.now(), sender: "student", content: q, created_at: new Date().toISOString() },
    ]);
    setInput("");
    setBusy(true);
    try {
      const res = await api.post<AskResponse>("/chat/ask", {
        question: q, session_id: sessionId,
      });
      setSessionId(res.data.session_id);
      setRefs(res.data.lesson_refs);
      setTopic(res.data.topic ?? null);
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, sender: "bot", content: res.data.answer, created_at: new Date().toISOString() },
      ]);
    } catch (ex: any) {
      setMessages((m) => [
        ...m,
        { id: Date.now() + 2, sender: "bot",
          content: "⚠️ " + (ex.response?.data?.detail ?? ex.message ?? "Đã có lỗi xảy ra"),
          created_at: new Date().toISOString() },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(input.trim());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 h-[calc(100vh-9rem)]">
      {/* Chat panel */}
      <Card padding={false} className="flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 grid place-items-center text-white">
            <IBot />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Trợ giảng AI</h2>
            <p className="text-xs text-slate-500">Data Science · trả lời dựa trên bài giảng lớp bạn</p>
          </div>
          {topic && (
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-brand-100 text-brand-700">
              {topic}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {messages.length === 0 && (
            <div className="max-w-md mx-auto text-center mt-10">
              <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-600 mx-auto grid place-items-center">
                <ISpark />
              </div>
              <p className="mt-4 font-medium text-slate-700">Bắt đầu bằng một câu hỏi</p>
              <p className="text-xs text-slate-400 mt-1">Bot sẽ tham chiếu bài học liên quan từ môn học của bạn.</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)}
                          className="text-left text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 hover:border-brand-400 hover:shadow-sm">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.sender === "student" ? "justify-end" : "justify-start"}`}>
              {m.sender === "bot" && (
                <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 grid place-items-center flex-shrink-0"><IBot width={16} height={16} /></div>
              )}
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.sender === "student"
                  ? "bg-brand-600 text-white rounded-br-sm"
                  : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 grid place-items-center"><IBot width={16} height={16} /></div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-500 italic">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <form onSubmit={submit} className="p-4 border-t border-slate-100 flex gap-2">
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
          <button disabled={busy} className="bg-brand-600 hover:bg-brand-700 text-white px-5 rounded-xl flex items-center gap-2 text-sm disabled:opacity-50">
            <ISend width={16} height={16} /> Gửi
          </button>
        </form>
      </Card>

      {/* Lesson refs sidebar */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 grid place-items-center"><IBook width={16} height={16} /></div>
          <h3 className="font-semibold text-slate-800 text-sm">Bài học liên quan</h3>
        </div>
        {refs.length === 0 ? (
          <EmptyState title="Chưa có" hint="Hỏi câu mới để hệ thống tìm bài học." />
        ) : (
          <ul className="space-y-2">
            {refs.map((r) => (
              <li key={r.id} className="border border-slate-200 rounded-xl p-3 hover:border-brand-400 hover:shadow-sm">
                <div className="text-sm font-medium text-slate-800">{r.title}</div>
                <div className="text-xs text-slate-400 mt-1">Mức độ liên quan: <span className="text-brand-600 font-medium">{r.score.toFixed(1)}</span></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
