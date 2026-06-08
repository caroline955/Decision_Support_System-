"""A+ retrieval — pure-SQL keyword scoring against `lessons`.

Score = sum over question tokens of:
  - 3 if token appears in lesson.title
  - 1 if token appears in lesson.content
Vietnamese stopwords are filtered. Returns top-k lessons with score > 0.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Lesson


_STOPWORDS = {
    "là", "và", "có", "của", "cho", "với", "trong", "thì", "được", "này",
    "kia", "ạ", "ấy", "em", "anh", "chị", "thầy", "cô", "ơi",
    "gì", "sao", "thế", "nào", "nhé", "không", "khong", "chưa", "đã",
    "the", "a", "an", "of", "to", "is", "in", "on", "for", "and", "or",
    "what", "how", "why", "do", "does", "i", "we",
}

_TOKEN_RE = re.compile(r"[A-Za-zÀ-ỹ0-9_]+", re.UNICODE)


@dataclass
class LessonHit:
    lesson: Lesson
    score: float


def _tokenize(text: str) -> List[str]:
    tokens = [t.lower() for t in _TOKEN_RE.findall(text)]
    return [t for t in tokens if len(t) > 1 and t not in _STOPWORDS]


def search_lessons(
    db: Session,
    question: str,
    course_id: Optional[int] = None,
    top_k: int = 3,
) -> List[LessonHit]:
    tokens = _tokenize(question)
    if not tokens:
        return []

    # Build OR-conditions across title+content for any token (cheap pre-filter)
    conditions = []
    for tok in tokens:
        like = f"%{tok}%"
        conditions.append(Lesson.title.ilike(like))
        conditions.append(Lesson.content.ilike(like))

    stmt = select(Lesson).where(or_(*conditions))
    if course_id is not None:
        stmt = stmt.where(Lesson.course_id == course_id)
    stmt = stmt.limit(50)  # safety cap

    candidates = db.execute(stmt).scalars().all()

    hits: List[LessonHit] = []
    for lesson in candidates:
        title_l = (lesson.title or "").lower()
        content_l = (lesson.content or "").lower()
        score = 0.0
        for tok in tokens:
            if tok in title_l:
                score += 3.0
            if tok in content_l:
                score += 1.0
        if score > 0:
            hits.append(LessonHit(lesson=lesson, score=score))

    hits.sort(key=lambda h: h.score, reverse=True)
    return hits[:top_k]


def detect_topic_slug(question: str) -> Optional[str]:
    """Tiny heuristic mapping question -> topic slug (used to tag chat_messages)."""
    q = question.lower()
    rules = [
        ("pandas",         ["pandas", "dataframe", "groupby", "merge", "csv"]),
        ("python",         ["python", "list", "dict", "comprehension", "lambda"]),
        ("visualization",  ["matplotlib", "seaborn", "biểu đồ", "plot", "histogram"]),
        ("linear-regression", ["linear regression", "hồi quy", "linearregression", "mse"]),
        ("classification", ["classification", "logistic", "phân loại", "confusion"]),
    ]
    for slug, kws in rules:
        if any(kw in q for kw in kws):
            return slug
    return None
