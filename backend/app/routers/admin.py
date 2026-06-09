"""Admin-only stats router. Aggregated counters for the admin dashboard."""
from fastapi import APIRouter, Depends, HTTPException
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
    QuestionTopic,
    TeacherAlert,
    User,
)
from app.schemas import RegisterRequest, UserOut
from app.security import hash_password
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional


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


# ---------------------------------------------------------------
# Admin tạo Giáo viên + gán nhiều lớp (1 lớp -> chỉ 1 GV phụ trách,
#   nên gán = đặt teacher_id của lớp = GV mới này)
# ---------------------------------------------------------------
class CreateTeacherIn(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    class_ids: List[int] = []


@router.post("/teachers", response_model=UserOut, status_code=201)
def create_teacher(payload: CreateTeacherIn, db: Session = Depends(get_db),
                   current: User = Depends(require_admin)):
    if db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none():
        raise HTTPException(409, "Email đã tồn tại")

    teacher = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="teacher",
        parent_id=current.id,
    )
    db.add(teacher)
    db.flush()

    for cid in payload.class_ids:
        cls = db.get(Class_, cid)
        if cls:
            cls.teacher_id = teacher.id  # 1 lớp -> 1 GV
    db.commit()
    db.refresh(teacher)
    return teacher


# ---------------------------------------------------------------
# Admin tạo Sinh viên + ghi danh nhiều lớp (N-N qua class_students)
# ---------------------------------------------------------------
class CreateStudentIn(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    class_ids: List[int] = []


@router.post("/students", response_model=UserOut, status_code=201)
def create_student(payload: CreateStudentIn, db: Session = Depends(get_db)):
    if db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none():
        raise HTTPException(409, "Email đã tồn tại")

    student = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="student",
    )
    db.add(student)
    db.flush()

    for cid in payload.class_ids:
        if db.get(Class_, cid):
            db.add(ClassStudent(class_id=cid, student_id=student.id))
    db.commit()
    db.refresh(student)
    return student


# ---------------------------------------------------------------
# Lớp mà 1 GV đang phụ trách
# ---------------------------------------------------------------
@router.get("/teachers/{teacher_id}/classes")
def teacher_classes(teacher_id: int, db: Session = Depends(get_db)):
    rows = db.execute(
        select(Class_, Course.code, func.count(ClassStudent.id).label("n"))
        .join(Course, Course.id == Class_.course_id)
        .outerjoin(ClassStudent, ClassStudent.class_id == Class_.id)
        .where(Class_.teacher_id == teacher_id)
        .group_by(Class_.id, Course.code)
    ).all()
    return [
        {"id": c.id, "name": c.name, "course_code": code,
         "semester": c.semester, "student_count": n}
        for c, code, n in rows
    ]


class TeacherClassesIn(BaseModel):
    class_ids: List[int]


@router.put("/teachers/{teacher_id}/classes")
def set_teacher_classes(
    teacher_id: int, payload: TeacherClassesIn, db: Session = Depends(get_db)
):
    """Đặt lại danh sách lớp do GV này phụ trách.
    - Lớp mới được chọn -> teacher_id = teacher_id
    - Lớp cũ bị bỏ chọn -> teacher_id = NULL (cần admin gán GV khác)
    """
    teacher = db.get(User, teacher_id)
    if not teacher or teacher.role != "teacher":
        raise HTTPException(404, "Teacher không tồn tại")

    current_class_ids = {
        c.id for c in db.execute(
            select(Class_).where(Class_.teacher_id == teacher_id)
        ).scalars().all()
    }
    new_class_ids = set(payload.class_ids)

    # Bỏ phụ trách
    for cid in current_class_ids - new_class_ids:
        cls = db.get(Class_, cid)
        if cls:
            cls.teacher_id = None  # cần gán GV khác sau

    # Thêm phụ trách (override GV hiện tại của lớp đó nếu có)
    for cid in new_class_ids - current_class_ids:
        cls = db.get(Class_, cid)
        if cls:
            cls.teacher_id = teacher_id

    db.commit()
    return {"ok": True, "classes": list(new_class_ids)}


# ---------------------------------------------------------------
# Lớp mà 1 SV đang theo học
# ---------------------------------------------------------------
@router.get("/students/{student_id}/classes")
def student_classes(student_id: int, db: Session = Depends(get_db)):
    rows = db.execute(
        select(Class_, Course.code, User.full_name)
        .join(ClassStudent, ClassStudent.class_id == Class_.id)
        .join(Course, Course.id == Class_.course_id)
        .join(User, User.id == Class_.teacher_id)
        .where(ClassStudent.student_id == student_id)
    ).all()
    return [
        {"id": c.id, "name": c.name, "course_code": code, "teacher_name": tname}
        for c, code, tname in rows
    ]


# ===============================================================
# Admin · Chatbox monitoring
# ===============================================================
@router.get("/chat/stats")
def chat_stats(db: Session = Depends(get_db)):
    total_sessions = db.execute(select(func.count()).select_from(ChatSession)).scalar_one()
    active_sessions = db.execute(
        select(func.count()).select_from(ChatSession).where(ChatSession.ended_at.is_(None))
    ).scalar_one()
    total_msgs = db.execute(select(func.count()).select_from(ChatMessage)).scalar_one()
    student_msgs = db.execute(
        select(func.count()).select_from(ChatMessage).where(ChatMessage.sender == "student")
    ).scalar_one()
    avg_resp = db.execute(
        select(func.avg(ChatMessage.response_time_ms)).where(ChatMessage.sender == "bot")
    ).scalar_one() or 0

    # Top topics
    rows = db.execute(
        select(ChatMessage.topic_id, func.count(ChatMessage.id).label("n"))
        .where(ChatMessage.sender == "student", ChatMessage.topic_id.is_not(None))
        .group_by(ChatMessage.topic_id)
        .order_by(func.count(ChatMessage.id).desc())
        .limit(5)
    ).all()
    topic_ids = [r[0] for r in rows]
    topics_map = (
        {
            t.id: t.name
            for t in db.execute(
                select(QuestionTopic).where(QuestionTopic.id.in_(topic_ids))
            ).scalars().all()
        }
        if topic_ids
        else {}
    )
    top_topics = [
        {"name": topics_map.get(tid, f"#{tid}"), "count": int(n)}
        for tid, n in rows
    ]

    return {
        "total_sessions": int(total_sessions),
        "active_sessions": int(active_sessions),
        "total_messages": int(total_msgs),
        "student_questions": int(student_msgs),
        "avg_response_ms": round(float(avg_resp), 1),
        "top_topics": top_topics,
    }


@router.get("/chat/sessions")
def chat_sessions(
    db: Session = Depends(get_db),
    status: str = "all",      # all | active | ended
    student_id: int | None = None,
    limit: int = 50,
):
    stmt = (
        select(ChatSession, User.full_name, Course.code)
        .join(User, User.id == ChatSession.student_id)
        .outerjoin(Course, Course.id == ChatSession.course_id)
        .order_by(ChatSession.started_at.desc())
        .limit(limit)
    )
    if status == "active":
        stmt = stmt.where(ChatSession.ended_at.is_(None))
    elif status == "ended":
        stmt = stmt.where(ChatSession.ended_at.is_not(None))
    if student_id is not None:
        stmt = stmt.where(ChatSession.student_id == student_id)

    rows = db.execute(stmt).all()
    return [
        {
            "id": s.id,
            "student_id": s.student_id,
            "student_name": sname,
            "course_code": code,
            "title": s.title,
            "started_at": s.started_at,
            "ended_at": s.ended_at,
            "message_count": s.message_count,
        }
        for s, sname, code in rows
    ]


@router.get("/chat/sessions/{session_id}/messages")
def chat_session_messages(session_id: int, db: Session = Depends(get_db)):
    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    msgs = db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    ).scalars().all()
    student = db.get(User, session.student_id)
    return {
        "session": {
            "id": session.id,
            "student_id": session.student_id,
            "student_name": student.full_name if student else None,
            "title": session.title,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "message_count": session.message_count,
        },
        "messages": [
            {
                "id": m.id, "sender": m.sender, "content": m.content,
                "topic_id": m.topic_id, "lesson_id": m.lesson_id,
                "tokens_used": m.tokens_used, "response_time_ms": m.response_time_ms,
                "created_at": m.created_at,
            } for m in msgs
        ],
    }


@router.patch("/chat/sessions/{session_id}/end")
def end_chat_session(session_id: int, db: Session = Depends(get_db)):
    from datetime import datetime
    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session.ended_at is None:
        session.ended_at = datetime.utcnow()
        db.commit()
    return {"ok": True, "ended_at": session.ended_at}


@router.delete("/chat/sessions/{session_id}")
def delete_chat_session(session_id: int, db: Session = Depends(get_db)):
    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    db.delete(session)  # cascade messages
    db.commit()
    return {"ok": True}
