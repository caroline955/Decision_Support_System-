import { FormEvent, useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import type { AskResponse, ChatMessage } from "../../lib/types";

export default function StudentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [refs, setRefs] = useState<AskResponse["lesson_refs"]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = input.trim();
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
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, sender: "bot", content: res.data.answer, created_at: new Date().toISOString() },
      ]);
    } catch (ex: any) {
      setMessages((m) => [
        ...m,
        { id: Date.now() + 2, sender: "bot",
          content: "Lỗi: " + (ex.response?.data?.detail ?? ex.message ?? "unknown"),
          created_at: new Date().toISOString() },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 h-[calc(100vh-7rem)]">
      <div className="bg-white rounded-lg shadow flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-semibold">Trợ giảng AI · Data Science</h1>
          <p className="text-xs text-slate-500">
            Hỏi bất cứ điều gì về Python, Pandas, ML...
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-slate-400 text-center mt-8">
              Bắt đầu bằng một câu hỏi, ví dụ: "Pandas groupby là gì?"
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id}
                 className={`flex ${m.sender === "student" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.sender === "student" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="text-xs text-slate-400 italic">Bot đang soạn câu trả lời...</div>
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={submit} className="p-3 border-t flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
                 placeholder="Nhập câu hỏi..."
                 className="flex-1 border rounded-md px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" />
          <button disabled={busy}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 rounded-md disabled:opacity-50">
            Gửi
          </button>
        </form>
      </div>

      <aside className="bg-white rounded-lg shadow p-4 hidden md:block">
        <h3 className="font-semibold text-sm mb-2">Bài học liên quan</h3>
        {refs.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa có (hỏi câu mới để xem).</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {refs.map((r) => (
              <li key={r.id} className="border rounded p-2">
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-slate-500">điểm: {r.score.toFixed(1)}</div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
