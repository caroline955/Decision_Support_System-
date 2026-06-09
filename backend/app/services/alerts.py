"""Tự động sinh teacher_alerts ngay sau khi sinh viên gửi câu hỏi.

Quy tắc:
- Đếm số câu hỏi cùng topic của SV trong 7 ngày gần nhất.
- Nếu n >= 3: tạo (hoặc update) 1 alert `repeat_question` cho GV của lớp SV.
- Severity: high nếu n >= 5, medium nếu n >= 3.
- Idempotent: nếu đã có alert chưa đọc cùng (teacher,student,topic), update message thay vì tạo mới.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    ChatMessage, ChatSession, ClassStudent, Class_,
    QuestionTopic, TeacherAlert, User, LearningAnalytics,
)


def maybe_create_repeat_alert(
    db: Session,
    student_id: int,
    topic_id: Optional[int],
) -> Optional[TeacherAlert]:
    if topic_id is None:
        return None

    since = datetime.utcnow() - timedelta(days=7)
    n = db.execute(
        select(func.count(ChatMessage.id))
        .join(ChatSession, ChatSession.id == ChatMessage.session_id)
        .where(
            ChatSession.student_id == student_id,
            ChatMessage.sender == "student",
            ChatMessage.topic_id == topic_id,
            ChatMessage.created_at >= since,
        )
    ).scalar_one()
    if n < 3:
        return None

    # Lớp đầu tiên của SV (để gán alert cho GV phụ trách)
    cs = db.execute(
        select(ClassStudent).where(ClassStudent.student_id == student_id).limit(1)
    ).scalar_one_or_none()
    if not cs:
        return None
    cls = db.get(Class_, cs.class_id)
    if not cls:
        return None

    student = db.get(User, student_id)
    topic = db.get(QuestionTopic, topic_id)
    topic_name = topic.name if topic else f"#{topic_id}"

    severity = "high" if n >= 5 else "medium"
    msg = (
        f"SV {student.full_name if student else student_id} đã hỏi "
        f"chủ đề '{topic_name}' {n} lần trong 7 ngày."
    )

    # idempotent: nếu đã có alert chưa đọc cùng triple, update
    existing = db.execute(
        select(TeacherAlert).where(
            TeacherAlert.teacher_id == cls.teacher_id,
            TeacherAlert.student_id == student_id,
            TeacherAlert.topic_id == topic_id,
            TeacherAlert.is_read == False,  # noqa: E712
            TeacherAlert.alert_type == "repeat_question",
        )
    ).scalar_one_or_none()

    if existing:
        existing.message = msg
        existing.severity = severity
        alert = existing
    else:
        alert = TeacherAlert(
            teacher_id=cls.teacher_id,
            class_id=cls.id,
            student_id=student_id,
            topic_id=topic_id,
            alert_type="repeat_question",
            severity=severity,
            message=msg,
        )
        db.add(alert)

    # Cập nhật analytics row của hôm nay
    today = datetime.utcnow().date()
    la = db.execute(
        select(LearningAnalytics).where(
            LearningAnalytics.student_id == student_id,
            LearningAnalytics.class_id == cls.id,
            LearningAnalytics.date == today,
        )
    ).scalar_one_or_none()
    if la is None:
        la = LearningAnalytics(
            student_id=student_id, class_id=cls.id, date=today
        )
        db.add(la)
    la.question_count = (la.question_count or 0) + 1
    la.top_topic_id = topic_id
    la.repeat_score = round(min(1.0, n / 5.0), 2)

    return alert
