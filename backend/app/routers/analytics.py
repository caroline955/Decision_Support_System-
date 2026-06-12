"""Analytics + Alerts router.

GET  /analytics/me        — sinh viên xem thống kê bản thân
GET  /analytics/class/{id}— giáo viên xem thống kê 1 lớp
POST /analytics/recompute — admin: tính lại analytics + sinh alerts
GET  /alerts              — giáo viên xem cảnh báo của mình
PATCH /alerts/{id}/read   — đánh dấu đã đọc
"""
from datetime import date, datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin, require_teacher
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
from app.schemas import AlertOut, AnalyticsRow, AlertHistoryResponse, AlertHistoryMessage


router = APIRouter(tags=["analytics"])


@router.get("/analytics/me", response_model=List[AnalyticsRow])
def my_analytics(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    stmt = (
        select(LearningAnalytics)
        .where(LearningAnalytics.student_id == current.id)
        .order_by(LearningAnalytics.date.desc())
        .limit(60)
    )
    return db.execute(stmt).scalars().all()


@router.get("/analytics/class/{class_id}", response_model=List[AnalyticsRow])
def class_analytics(
    class_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_teacher),
):
    cls = db.get(Class_, class_id)
    if not cls:
        raise HTTPException(404, "Class not found")
    if current.role == "teacher" and cls.teacher_id != current.id:
        raise HTTPException(403, "Forbidden")

    stmt = (
        select(LearningAnalytics)
        .where(LearningAnalytics.class_id == class_id)
        .order_by(LearningAnalytics.date.desc())
        .limit(500)
    )
    return db.execute(stmt).scalars().all()


@router.post("/analytics/recompute", dependencies=[Depends(require_admin)])
def recompute(db: Session = Depends(get_db)):
    """Recompute today's analytics + generate repeat_question alerts.
    Demo-grade: gộp tổng câu hỏi học sinh trong 7 ngày, đo trùng topic.
    """
    today = date.today()
    since = datetime.utcnow() - timedelta(days=7)

    # Aggregate per (student_id, topic_id) trong 7 ngày
    rows = db.execute(
        select(
            ChatSession.student_id,
            ChatMessage.topic_id,
            func.count(ChatMessage.id).label("n"),
        )
        .join(ChatSession, ChatSession.id == ChatMessage.session_id)
        .where(
            ChatMessage.sender == "student",
            ChatMessage.created_at >= since,
        )
        .group_by(ChatSession.student_id, ChatMessage.topic_id)
    ).all()

    created_alerts = 0
    for student_id, topic_id, n in rows:
        if not topic_id or n < 3:
            continue
        # find a class of this student to attach alert
        cs = db.execute(
            select(ClassStudent).where(ClassStudent.student_id == student_id).limit(1)
        ).scalar_one_or_none()
        if not cs:
            continue
        cls = db.get(Class_, cs.class_id)
        if not cls:
            continue
        topic = db.get(QuestionTopic, topic_id)
        topic_name = topic.name if topic else "?"
        student = db.get(User, student_id)
        alert = TeacherAlert(
            teacher_id=cls.teacher_id,
            class_id=cls.id,
            student_id=student_id,
            topic_id=topic_id,
            alert_type="repeat_question",
            severity="high" if n >= 5 else "medium",
            message=(
                f"SV {student.full_name if student else student_id} hỏi lại chủ đề "
                f"'{topic_name}' {n} lần trong 7 ngày."
            ),
        )
        db.add(alert)
        created_alerts += 1

        # Upsert analytics row for today
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
        la.question_count = n
        la.top_topic_id = topic_id
        la.repeat_score = min(1.0, n / 5.0)

    db.commit()
    return {"ok": True, "alerts_created": created_alerts}


# ---------- Alerts ----------
@router.get("/alerts", response_model=List[AlertOut])
def list_alerts(
    db: Session = Depends(get_db),
    current: User = Depends(require_teacher),
):
    stmt = (
        select(TeacherAlert)
        .where(TeacherAlert.teacher_id == current.id)
        .order_by(TeacherAlert.created_at.desc())
        .limit(100)
    )
    return db.execute(stmt).scalars().all()

@router.get("/alerts/{alert_id}/history", response_model=AlertHistoryResponse)
def alert_history(
    alert_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_teacher),
):
    alert = db.get(TeacherAlert, alert_id)

    if not alert or alert.teacher_id != current.id:
        raise HTTPException(404, "Alert not found")

    topic = db.get(QuestionTopic, alert.topic_id) if alert.topic_id else None
    student = db.get(User, alert.student_id) if alert.student_id else None

    if not alert.student_id or not alert.topic_id:
        return AlertHistoryResponse(
            alert_id=alert.id,
            alert_type=alert.alert_type,
            student_id=alert.student_id,
            student_name=student.full_name if student else None,
            topic_id=alert.topic_id,
            topic_name=topic.name if topic else None,
            total_questions=0,
            messages=[],
        )

    since = datetime.utcnow() - timedelta(days=7)

    student_messages = (
        db.execute(
            select(ChatMessage)
            .join(ChatSession, ChatSession.id == ChatMessage.session_id)
            .where(
                ChatSession.student_id == alert.student_id,
                ChatMessage.sender == "student",
                ChatMessage.topic_id == alert.topic_id,
                ChatMessage.created_at >= since,
            )
            .order_by(ChatMessage.created_at.desc())
        )
        .scalars()
        .all()
    )

    result = []

    for msg in student_messages:
        bot_answer = (
            db.execute(
                select(ChatMessage)
                .where(
                    ChatMessage.session_id == msg.session_id,
                    ChatMessage.sender == "bot",
                    ChatMessage.created_at >= msg.created_at,
                )
                .order_by(ChatMessage.created_at.asc())
                .limit(1)
            )
            .scalars()
            .first()
        )

        result.append(
            AlertHistoryMessage(
                id=msg.id,
                session_id=msg.session_id,
                question=msg.content,
                answer=bot_answer.content if bot_answer else None,
                created_at=msg.created_at,
            )
        )

    return AlertHistoryResponse(
        alert_id=alert.id,
        alert_type=alert.alert_type,
        student_id=alert.student_id,
        student_name=student.full_name if student else None,
        topic_id=alert.topic_id,
        topic_name=topic.name if topic else None,
        total_questions=len(result),
        messages=result,
    )

@router.patch("/alerts/{alert_id}/read", response_model=AlertOut)
def read_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_teacher),
):
    alert = db.get(TeacherAlert, alert_id)
    if not alert or alert.teacher_id != current.id:
        raise HTTPException(404, "Alert not found")
    alert.is_read = True
    alert.read_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert
@router.get("/teacher/student-activity")
def teacher_student_activity(
    db: Session = Depends(get_db),
    current: User = Depends(require_teacher),
):
    rows = db.execute(
        select(
            User.id,
            User.full_name,
            User.email,
            Class_.id.label("class_id"),
            Class_.name.label("class_name"),
            func.count(ChatMessage.id).label("question_count"),
            func.max(ChatMessage.created_at).label("last_active"),
        )
        .join(ClassStudent, ClassStudent.student_id == User.id)
        .join(Class_, Class_.id == ClassStudent.class_id)
        .outerjoin(ChatSession, ChatSession.student_id == User.id)
        .outerjoin(
            ChatMessage,
            (ChatMessage.session_id == ChatSession.id)
            & (ChatMessage.sender == "student"),
        )
        .where(Class_.teacher_id == current.id)
        .group_by(User.id, Class_.id)
        .order_by(func.count(ChatMessage.id).desc())
    ).all()

    return [
        {
            "student_id": sid,
            "student_name": name,
            "email": email,
            "class_id": class_id,
            "class_name": class_name,
            "question_count": int(q_count or 0),
            "last_active": last_active,
        }
        for sid, name, email, class_id, class_name, q_count, last_active in rows
    ]
@router.get("/teacher/students/{student_id}/chat-history")
def teacher_student_chat_history(
    student_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_teacher),
):
    allowed = db.execute(
        select(ClassStudent)
        .join(Class_, Class_.id == ClassStudent.class_id)
        .where(
            ClassStudent.student_id == student_id,
            Class_.teacher_id == current.id,
        )
    ).scalar_one_or_none()

    if not allowed:
        raise HTTPException(403, "Forbidden")

    rows = db.execute(
        select(ChatMessage, ChatSession.title)
        .join(ChatSession, ChatSession.id == ChatMessage.session_id)
        .where(ChatSession.student_id == student_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(100)
    ).all()

    return [
        {
            "id": msg.id,
            "session_id": msg.session_id,
            "session_title": title,
            "sender": msg.sender,
            "content": msg.content,
            "topic_id": msg.topic_id,
            "created_at": msg.created_at,
        }
        for msg, title in rows
    ]
@router.get("/teacher/top-topics")
def teacher_top_topics(
    db: Session = Depends(get_db),
    current: User = Depends(require_teacher),
):
    rows = db.execute(
        select(
            QuestionTopic.name,
            func.count(ChatMessage.id).label("count"),
        )
        .join(ChatMessage, ChatMessage.topic_id == QuestionTopic.id)
        .join(ChatSession, ChatSession.id == ChatMessage.session_id)
        .join(ClassStudent, ClassStudent.student_id == ChatSession.student_id)
        .join(Class_, Class_.id == ClassStudent.class_id)
        .where(
            Class_.teacher_id == current.id,
            ChatMessage.sender == "student",
        )
        .group_by(QuestionTopic.id, QuestionTopic.name)
        .order_by(func.count(ChatMessage.id).desc())
        .limit(5)
    ).all()

    return [
        {"name": name, "count": int(count)}
        for name, count in rows
    ]