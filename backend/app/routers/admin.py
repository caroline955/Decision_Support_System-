"""Admin-only stats router. Aggregated counters for the admin dashboard."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import (
    ChatMessage,
    ChatSession,
    ClassStudent,
    Class_,
    Course,
    Lesson,
    TeacherAlert,
    User,
)


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    def cnt(model, *where):
        stmt = select(func.count()).select_from(model)
        for w in where:
            stmt = stmt.where(w)
        return db.execute(stmt).scalar_one()

    return {
        "users": {
            "total": cnt(User),
            "admins": cnt(User, User.role == "admin"),
            "teachers": cnt(User, User.role == "teacher"),
            "students": cnt(User, User.role == "student"),
        },
        "courses": cnt(Course),
        "classes": cnt(Class_),
        "lessons": cnt(Lesson),
        "enrollments": cnt(ClassStudent),
        "chat_sessions": cnt(ChatSession),
        "chat_messages": cnt(ChatMessage),
        "alerts": {
            "total": cnt(TeacherAlert),
            "unread": cnt(TeacherAlert, TeacherAlert.is_read == False),  # noqa: E712
        },
    }
