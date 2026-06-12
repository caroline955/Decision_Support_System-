"""LLM provider abstraction. Switch via LLM_PROVIDER env var."""
from __future__ import annotations

import asyncio
import logging
from typing import Iterable, List, Optional, TypedDict

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class ChatTurn(TypedDict):
    role: str  # "user" | "assistant"
    content: str


SYSTEM_PROMPT = (
    "You are an AI teaching assistant for a university-level Data Science course. "
    "Always respond in the same language as the user's question."
    "Provide concise answers with Python examples when necessary. "
    "If 'Reference Material' is provided, prioritize using that content. "
    "Remember the context of previous questions in the same session to ensure consistent responses "
    "(for example, when a student says 'do problem 1', 'explain more', 'give another example'). "

    "When writing mathematical formulas, ALWAYS use standard LaTeX. "
    "Inline math must use the format \\(...\\). "
    "Block math must use the format \\[...\\]. "
    "DO NOT use [ ... ] to wrap formulas. "
    "DO NOT escape LaTeX into regular text. "

    "When writing code, always use markdown code blocks with the syntax hint (e.g., ```python ... ```). "
    "```python ... ```."
)

def build_prompt(question: str, lesson_contexts: List[str]) -> str:
    if lesson_contexts:
        ctx = "\n\n".join(
            f"[Reference {i+1}] {c}" for i, c in enumerate(lesson_contexts)
        )
        return (
            f"Reference Material:\n{ctx}\n\n"
            f"Student Question: {question}\n\n"
            f"Answer in the same language as the student's question. "
            f"If the question is in English, answer in English. "
            f"If the question is in Vietnamese, answer in Vietnamese."
        )

    return (
        f"Student Question: {question}\n\n"
        f"Answer in the same language as the student's question. "
        f"If the question is in English, answer in English. "
        f"If the question is in Vietnamese, answer in Vietnamese."
    )
async def _ask_mock(prompt: str, history: List[ChatTurn]) -> str:
    return (
        "[MOCK] Đây là câu trả lời giả lập (chưa cấu hình LLM_PROVIDER thật).\n"
        f"Prompt {len(prompt)} ký tự, history {len(history)} lượt."
    )


async def _ask_gemini(prompt: str, history: List[ChatTurn]) -> str:
    if not settings.GEMINI_API_KEY:
        return await _ask_mock(prompt, history)
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            settings.GEMINI_MODEL, system_instruction=SYSTEM_PROMPT
        )
        # Gemini history format: list of {role: 'user'|'model', parts: [text]}
        gem_history = [
            {
                "role": "user" if h["role"] == "user" else "model",
                "parts": [h["content"]],
            }
            for h in history
        ]
        chat = model.start_chat(history=gem_history)
        resp = await asyncio.to_thread(chat.send_message, prompt)
        return (resp.text or "").strip() or "[Gemini không trả về nội dung]"
    except Exception as e:
        logger.exception("Gemini error")
        return f"[Gemini lỗi] {e}"


async def _ask_openai(prompt: str, history: List[ChatTurn]) -> str:
    if not settings.OPENAI_API_KEY:
        return await _ask_mock(prompt, history)
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
        # OpenAI: role 'user' | 'assistant'
        for h in history:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": prompt})

        resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.3,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        logger.exception("OpenAI error")
        return f"[OpenAI lỗi] {e}"


async def _ask_ollama(prompt: str, history: List[ChatTurn]) -> str:
    try:
        # Build single prompt with history baked in (Ollama /api/generate is single-turn)
        history_text = ""
        if history:
            lines: list[str] = []
            for h in history:
                tag = "Sinh viên" if h["role"] == "user" else "Trợ giảng"
                lines.append(f"{tag}: {h['content']}")
            history_text = "Lịch sử trao đổi gần nhất:\n" + "\n".join(lines) + "\n\n"
        full = history_text + prompt

        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "system": SYSTEM_PROMPT,
                    "prompt": full,
                    "stream": False,
                },
            )
            r.raise_for_status()
            return (r.json().get("response") or "").strip()
    except Exception as e:
        logger.exception("Ollama error")
        return f"[Ollama lỗi] {e}"


async def ask_llm(
    question: str,
    lesson_contexts: Optional[List[str]] = None,
    history: Optional[Iterable[ChatTurn]] = None,
) -> str:
    prompt = build_prompt(question, lesson_contexts or [])
    hist = list(history or [])
    provider = (settings.LLM_PROVIDER or "mock").lower()
    if provider == "gemini":
        return await _ask_gemini(prompt, hist)
    if provider == "openai":
        return await _ask_openai(prompt, hist)
    if provider == "ollama":
        return await _ask_ollama(prompt, hist)
    return await _ask_mock(prompt, hist)
