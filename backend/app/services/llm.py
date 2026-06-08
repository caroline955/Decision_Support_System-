"""LLM provider abstraction. Switch via LLM_PROVIDER env var."""
from __future__ import annotations

import asyncio
import logging
from typing import List, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "Bạn là trợ giảng AI môn Data Science cho sinh viên đại học. "
    "Trả lời ngắn gọn, có ví dụ Python khi cần. "
    "Nếu được cung cấp 'Tài liệu tham khảo', hãy ưu tiên dùng nội dung đó. "
    "Trả lời bằng tiếng Việt."
)


def build_prompt(question: str, lesson_contexts: List[str]) -> str:
    if lesson_contexts:
        ctx = "\n\n".join(
            f"[Bài {i+1}] {c}" for i, c in enumerate(lesson_contexts)
        )
        return (
            f"Tài liệu tham khảo:\n{ctx}\n\n"
            f"Câu hỏi của sinh viên: {question}\n\n"
            f"Hãy trả lời dựa trên tài liệu trên (nêu rõ nếu vượt phạm vi)."
        )
    return f"Câu hỏi của sinh viên: {question}"


async def _ask_mock(prompt: str) -> str:
    return (
        "[MOCK] Đây là câu trả lời giả lập (chưa cấu hình LLM_PROVIDER thật).\n"
        f"Prompt nhận được dài {len(prompt)} ký tự."
    )


async def _ask_gemini(prompt: str) -> str:
    if not settings.GEMINI_API_KEY:
        return await _ask_mock(prompt)
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            settings.GEMINI_MODEL, system_instruction=SYSTEM_PROMPT
        )
        # SDK is sync, run in thread
        resp = await asyncio.to_thread(model.generate_content, prompt)
        return (resp.text or "").strip() or "[Gemini không trả về nội dung]"
    except Exception as e:
        logger.exception("Gemini error")
        return f"[Gemini lỗi] {e}"


async def _ask_openai(prompt: str) -> str:
    if not settings.OPENAI_API_KEY:
        return await _ask_mock(prompt)
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        logger.exception("OpenAI error")
        return f"[OpenAI lỗi] {e}"


async def _ask_ollama(prompt: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "system": SYSTEM_PROMPT,
                    "prompt": prompt,
                    "stream": False,
                },
            )
            r.raise_for_status()
            return (r.json().get("response") or "").strip()
    except Exception as e:
        logger.exception("Ollama error")
        return f"[Ollama lỗi] {e}"


async def ask_llm(question: str, lesson_contexts: Optional[List[str]] = None) -> str:
    prompt = build_prompt(question, lesson_contexts or [])
    provider = (settings.LLM_PROVIDER or "mock").lower()
    if provider == "gemini":
        return await _ask_gemini(prompt)
    if provider == "openai":
        return await _ask_openai(prompt)
    if provider == "ollama":
        return await _ask_ollama(prompt)
    return await _ask_mock(prompt)
