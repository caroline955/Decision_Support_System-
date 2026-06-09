"""Chat router — A+ retrieval: keyword scoring against lessons + LLM call.

Flow:
1. Resolve / create chat_session.
2. Save student message.
3. Search top-k lessons via retrieval.search_lessons.
4. Build prompt with lesson contexts -> ask_llm.
5. Save bot message with lesson_id + topic_id.
6. Return answer + lesson refs.
"""
from __future__ import annotations

import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import ChatMessage, ChatSession, QuestionTopic, User
from app.schemas import (
    AskRequest,
    AskResponse,
    ChatMessageOut,
    ChatSessionOut,
    LessonRef,
)
from app.services.alerts import maybe_create_repeat_alert
from app.services.llm import ask_llm
from app.services.retrieval import detect_topic_slug, search_lessons


router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/sessions", response_model=List[ChatSessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    stmt = (
        select(ChatSession)
        .where(ChatSession.student_id == current.id)
        .order_by(ChatSession.started_at.desc())
        .limit(50)
    )
    return db.execute(stmt).scalars().all()


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
def list_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session.student_id != current.id and current.role == "student":
        raise HTTPException(403, "Forbidden")
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return db.execute(stmt).scalars().all()


@router.post("/ask", response_model=AskResponse)
async def ask(
    payload: AskRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.role != "student":
        raise HTTPException(403, "Chỉ sinh viên mới được hỏi chatbot")

    # 1) Resolve / create session
    session: ChatSession | None = None
    if payload.session_id:
        session = db.get(ChatSession, payload.session_id)
        if not session or session.student_id != current.id:
            raise HTTPException(404, "Session not found")
    if session is None:
        session = ChatSession(
            student_id=current.id,
            course_id=payload.course_id,
            title=payload.question[:80],
        )
        db.add(session)
        db.flush()  # get id

    # 2) Lookup topic
    topic_slug = detect_topic_slug(payload.question)
    topic = None
    if topic_slug:
        topic = db.execute(
            select(QuestionTopic).where(QuestionTopic.slug == topic_slug)
        ).scalar_one_or_none()

    # 3) Retrieve relevant lessons (A+)
    hits = search_lessons(db, payload.question, course_id=payload.course_id, top_k=3)
    lesson_contexts = []
    for h in hits:
        # truncate to keep prompt small
        snippet = (h.lesson.content or "")[:1200]
        lesson_contexts.append(f"{h.lesson.title}: {snippet}")

    # 4) Save student message
    student_msg = ChatMessage(
        session_id=session.id,
        sender="student",
        content=payload.question,
        topic_id=topic.id if topic else None,
        lesson_id=hits[0].lesson.id if hits else None,
    )
    db.add(student_msg)
    session.message_count += 1

    # 5) Ask LLM
    t0 = time.perf_counter()
    answer = await ask_llm(payload.question, lesson_contexts)
    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    # 6) Save bot message
    bot_msg = ChatMessage(
        session_id=session.id,
        sender="bot",
        content=answer,
        topic_id=topic.id if topic else None,
        lesson_id=hits[0].lesson.id if hits else None,
        response_time_ms=elapsed_ms,
    )
    db.add(bot_msg)
    session.message_count += 1

    # 7) Auto-create teacher alert if student keeps asking same topic
    try:
        maybe_create_repeat_alert(
            db, student_id=current.id,
            topic_id=topic.id if topic else None,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("alert generation failed: %s", e)

    db.commit()

    return AskResponse(
        session_id=session.id,
        answer=answer,
        lesson_refs=[
            LessonRef(id=h.lesson.id, title=h.lesson.title, score=h.score) for h in hits
        ],
        topic=topic.name if topic else None,
        response_time_ms=elapsed_ms,
    )
