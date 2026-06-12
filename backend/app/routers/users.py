"""User listing — admin sees all, teacher sees own students, student sees self."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import (
    ChatSession,
    ClassStudent,
    Class_,
    LearningAnalytics,
    TeacherAlert,
    User,
)
from app.schemas import UserOut
from app.security import hash_password


router = APIRouter(prefix="/users", tags=["users"])


class UserPatch(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6)
    is_active: Optional[bool] = None


@router.get("", response_model=List[UserOut])
def list_users(
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if current.role == "teacher":
        # teacher only sees students in their classes
        sub = (
            select(ClassStudent.student_id)
            .join(Class_, Class_.id == ClassStudent.class_id)
            .where(Class_.teacher_id == current.id)
        )
        stmt = stmt.where(User.id.in_(sub))
    elif current.role == "student":
        stmt = stmt.where(User.id == current.id)
    return db.execute(stmt.limit(500)).scalars().all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    # Detach related records để FK constraint không chặn DELETE
    if user.role == "teacher":
        # Lớp do GV phụ trách -> teacher_id = NULL (cần admin gán lại)
        db.execute(
            update(Class_).where(Class_.teacher_id == user_id).values(teacher_id=None)
        )
        # Xoá alert dành cho GV này
        db.execute(delete(TeacherAlert).where(TeacherAlert.teacher_id == user_id))
    elif user.role == "student":
        # Bỏ enroll
        db.execute(delete(ClassStudent).where(ClassStudent.student_id == user_id))
        # Xoá chat sessions của SV (cascade messages do FK ON DELETE CASCADE)
        db.execute(delete(ChatSession).where(ChatSession.student_id == user_id))
        # Xoá analytics + alerts về SV này
        db.execute(delete(LearningAnalytics).where(LearningAnalytics.student_id == user_id))
        db.execute(delete(TeacherAlert).where(TeacherAlert.student_id == user_id))

    db.delete(user)
    db.commit()
    return {"ok": True}


@router.patch("/{user_id}/active", dependencies=[Depends(require_admin)])
def set_active(user_id: int, is_active: bool, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = is_active
    db.commit()
    return {"ok": True, "is_active": is_active}


@router.patch("/{user_id}", response_model=UserOut, dependencies=[Depends(require_admin)])
def update_user(user_id: int, payload: UserPatch, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    if payload.email and payload.email != user.email:
        dup = db.execute(
            select(User).where(User.email == payload.email, User.id != user_id)
        ).scalar_one_or_none()
        if dup:
            raise HTTPException(409, "Email đã được dùng cho user khác")
        user.email = payload.email

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.password:
        user.password_hash = hash_password(payload.password)
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user
