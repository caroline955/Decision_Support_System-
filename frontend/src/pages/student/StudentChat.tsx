import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

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

function normalizeMath(text: string) {
  let out = text;

  // Fix double-escaped LaTeX delimiters first
  out = out
    .replace(/\\\(/g, "\\(")
    .replace(/\\\)/g, "\\)")
    .replace(/\\\[/g, "\\[")
    .replace(/\\\]/g, "\\]");

  // Convert formulas that the LLM often returns as plain square brackets:
  // [X' = \frac{...}{...}]  ->  $$ X' = \frac{...}{...} $$
  // This avoids conflicts with normal text like [0, 1] by requiring math signs/LaTeX.
  out = out.replace(/\[\s*([^\[\]\n]*(?:\\[a-zA-Z]+|[_^=]|\{[^}]+\}|[A-Za-z]'\s*=)[^\[\]\n]*)\s*\]/g, (_match, formula) => {
    return `\n$$\n${String(formula).trim()}\n$$\n`;
  });

  // Convert escaped display math written as \[ ... \] to $$ ... $$ for better remark-math parsing.
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula) => {
    return `\n$$\n${String(formula).trim()}\n$$\n`;
  });

  return out;
}

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

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "student",
        content: q,
        created_at: new Date().toISOString(),
      },
    ]);

    setInput("");
    setBusy(true);

    try {
      const res = await api.post<AskResponse>("/chat/ask", {
        question: q,
        session_id: sessionId,
      });

      setSessionId(res.data.session_id);
      setRefs(res.data.lesson_refs);
      setTopic(res.data.topic ?? null);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          content: res.data.answer,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (ex: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          sender: "bot",
          content:
            "⚠️ " +
            (ex.response?.data?.detail ?? ex.message ?? "Đã có lỗi xảy ra"),
          created_at: new Date().toISOString(),
        },
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
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      <Card padding={false} className="flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
            <IBot />
          </div>

          <div>
            <h2 className="font-semibold text-slate-800">Trợ giảng AI</h2>
            <p className="text-xs text-slate-500">
              Data Science · trả lời dựa trên bài giảng lớp bạn
            </p>
          </div>

          {topic && (
            <span className="ml-auto rounded-full bg-brand-100 px-2 py-1 text-xs text-brand-700">
              {topic}
            </span>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-5">
          {messages.length === 0 && (
            <div className="mx-auto mt-10 max-w-md text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-600">
                <ISpark />
              </div>

              <p className="mt-4 font-medium text-slate-700">
                Bắt đầu bằng một câu hỏi
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Bot sẽ tham chiếu bài học liên quan từ môn học của bạn.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-brand-400 hover:shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2 ${
                m.sender === "student" ? "justify-end" : "justify-start"
              }`}
            >
              {m.sender === "bot" && (
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-600">
                  <IBot width={16} height={16} />
                </div>
              )}

              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.sender === "student"
                    ? "whitespace-pre-wrap rounded-br-sm bg-brand-600 text-white"
                    : "rounded-bl-sm border border-slate-200 bg-white text-slate-800 shadow-sm"
                }`}
              >
                {m.sender === "student" ? (
                  m.content
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 leading-relaxed last:mb-0">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-2 list-disc space-y-1 pl-5">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-2 list-decimal space-y-1 pl-5">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      h1: ({ children }) => (
                        <h1 className="mb-2 text-lg font-bold text-slate-900">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mb-2 text-base font-bold text-slate-900">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mb-2 text-sm font-bold text-slate-900">
                          {children}
                        </h3>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-slate-900">
                          {children}
                        </strong>
                      ),
                      code: ({ children, className }) => {
                        const text = String(children ?? "");
                        const isBlock = Boolean(className) || text.includes("\n");

                        if (isBlock) {
                          return (
                            <code
                              className={`${
                                className ?? ""
                              } block whitespace-pre text-slate-800`}
                            >
                              {children}
                            </code>
                          );
                        }

                        return (
                          <code className="rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children }) => (
                        <pre className="my-3 overflow-x-auto rounded-xl border border-brand-100 bg-brand-50/70 p-3 text-xs leading-relaxed shadow-sm">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {normalizeMath(m.content)}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand-600">
                <IBot width={16} height={16} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm italic text-slate-500">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: "0.2s" }}
                  />
                </span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi của bạn..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
          />

          <button
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <ISend width={16} height={16} /> Gửi
          </button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-600">
            <IBook width={16} height={16} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Bài học liên quan</h3>
        </div>

        {refs.length === 0 ? (
          <EmptyState title="Chưa có" hint="Hỏi câu mới để hệ thống tìm bài học." />
        ) : (
          <ul className="space-y-2">
            {refs.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-slate-200 p-3 hover:border-brand-400 hover:shadow-sm"
              >
                <div className="text-sm font-medium text-slate-800">{r.title}</div>
                <div className="mt-1 text-xs text-slate-400">
                  Mức độ liên quan:{" "}
                  <span className="font-medium text-brand-600">
                    {r.score.toFixed(1)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
