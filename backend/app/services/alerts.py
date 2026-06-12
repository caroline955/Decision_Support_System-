"""Tự động sinh teacher_alerts ngay sau khi sinh viên gửi câu hỏi.

Quy tắc 1 — `repeat_question` (cấp sinh viên):
- Đếm số câu hỏi cùng topic của 1 SV trong 7 ngày gần nhất.
- Nếu n >= 3: tạo (hoặc update) alert cho GV của lớp SV.
- Severity: high nếu n >= 5, medium nếu n >= 3.

Quy tắc 2 — `hot_topic` (cấp lớp):
- Đếm số câu hỏi cùng topic của TẤT CẢ SV cùng lớp trong 7 ngày gần nhất.
- Nếu m >= 5 câu (hoặc >= 3 SV khác nhau): tạo alert cảnh báo GV về chủ đề
  đang "nóng" trong lớp — gợi ý nên ôn lại/giảng kỹ hơn.
- Severity: high nếu m >= 10, medium nếu m >= 5.

Cả 2 quy tắc đều idempotent: alert chưa đọc cùng (teacher, class/student, topic, type)
sẽ được update message + severity thay vì tạo dòng mới.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session

from app.models import (
    ChatMessage,
    ChatSession,
    ClassStudent,
    Class_,
    LearningAnalytics,
    QuestionTopic,
    TeacherAlert,
    User,
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

    # Sau khi handle alert cấp SV, kiểm tra luôn alert cấp lớp
    try:
        maybe_create_hot_topic_alert(db, class_id=cls.id, topic_id=topic_id)
    except Exception:
        pass

    return alert


def maybe_create_hot_topic_alert(
    db: Session,
    class_id: int,
    topic_id: int,
) -> Optional[TeacherAlert]:
    """Cảnh báo GV nếu 1 topic đang được nhiều SV cùng lớp hỏi."""
    cls = db.get(Class_, class_id)
    if not cls or not cls.teacher_id:
        return None

    since = datetime.utcnow() - timedelta(days=7)
    student_ids_subq = (
        select(ClassStudent.student_id).where(ClassStudent.class_id == class_id)
    )

    n_questions = db.execute(
        select(func.count(ChatMessage.id))
        .join(ChatSession, ChatSession.id == ChatMessage.session_id)
        .where(
            ChatSession.student_id.in_(student_ids_subq),
            ChatMessage.sender == "student",
            ChatMessage.topic_id == topic_id,
            ChatMessage.created_at >= since,
        )
    ).scalar_one()

    n_distinct_students = db.execute(
        select(func.count(distinct(ChatSession.student_id)))
        .join(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .where(
            ChatSession.student_id.in_(student_ids_subq),
            ChatMessage.sender == "student",
            ChatMessage.topic_id == topic_id,
            ChatMessage.created_at >= since,
        )
    ).scalar_one()

    # Ngưỡng: 5+ câu hỏi tổng từ 3+ SV khác nhau
    if n_questions < 5 or n_distinct_students < 3:
        return None

    severity = "high" if n_questions >= 10 else "medium"
    topic = db.get(QuestionTopic, topic_id)
    topic_name = topic.name if topic else f"#{topic_id}"

    msg = (
        f"Lớp {cls.name}: chủ đề '{topic_name}' đang nóng — "
        f"{n_distinct_students} SV đã hỏi tổng cộng {n_questions} câu trong 7 ngày. "
        f"Gợi ý: ôn lại hoặc giảng kỹ hơn về chủ đề này."
    )

    existing = db.execute(
        select(TeacherAlert).where(
            TeacherAlert.teacher_id == cls.teacher_id,
            TeacherAlert.class_id == class_id,
            TeacherAlert.topic_id == topic_id,
            TeacherAlert.alert_type == "class_struggle",
            TeacherAlert.is_read == False,  # noqa: E712
        )
    ).scalar_one_or_none()

    if existing:
        existing.message = msg
        existing.severity = severity
        return existing

    alert = TeacherAlert(
        teacher_id=cls.teacher_id,
        class_id=class_id,
        student_id=None,
        topic_id=topic_id,
        # NOTE: dùng 'class_struggle' vì MySQL Enum của bảng teacher_alerts chỉ
        # cho phép {repeat_question, class_struggle, low_activity, other}.
        # 'class_struggle' nghĩa "lớp đang gặp khó với 1 chủ đề" — phù hợp cảnh báo này.
        alert_type="class_struggle",
        severity=severity,
        message=msg,
    )
    db.add(alert)
    return alert
