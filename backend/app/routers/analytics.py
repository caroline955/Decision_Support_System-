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
from app.schemas import AlertOut, AnalyticsRow


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
