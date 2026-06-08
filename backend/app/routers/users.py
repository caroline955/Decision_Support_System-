"""User listing — admin sees all, teacher sees own students, student sees self."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import ClassStudent, Class_, User
from app.schemas import UserOut


router = APIRouter(prefix="/users", tags=["users"])


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
