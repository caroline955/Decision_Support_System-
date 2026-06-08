import { useEffect, useState } from "react";
import api from "../../lib/api";
import type { ChatSession, ChatMessage } from "../../lib/types";

export default function StudentHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    api.get<ChatSession[]>("/chat/sessions").then((r) => setSessions(r.data));
  }, []);

  useEffect(() => {
    if (!active) return;
    api.get<ChatMessage[]>(`/chat/sessions/${active}/messages`).then((r) => setMessages(r.data));
  }, [active]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-7rem)]">
      <aside className="bg-white rounded-lg shadow p-3 overflow-y-auto">
        <h2 className="font-semibold text-sm mb-2">Phiên chat</h2>
        {sessions.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa có phiên nào.</p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setActive(s.id)}
                  className={`w-full text-left text-sm px-2 py-2 rounded ${
                    active === s.id ? "bg-brand-100 text-brand-700" : "hover:bg-slate-100"
                  }`}
                >
                  <div className="truncate">{s.title ?? `Phiên #${s.id}`}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(s.started_at).toLocaleString("vi-VN")} · {s.message_count} tin
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="bg-white rounded-lg shadow p-4 overflow-y-auto">
        {!active ? (
          <p className="text-slate-400 text-sm">Chọn 1 phiên ở bên trái để xem lại.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "student" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.sender === "student" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
