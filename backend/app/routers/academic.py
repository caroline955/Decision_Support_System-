"""Courses, Classes, Enrollments, Schedules, Lessons CRUD."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin, require_teacher
from app.models import (
    ClassStudent,
    Class_,
    Course,
    Lesson,
    Schedule,
    User,
)
from app.schemas import (
    ClassIn,
    ClassOut,
    CourseIn,
    CourseOut,
    EnrollIn,
    LessonIn,
    LessonOut,
    ScheduleIn,
    ScheduleOut,
)


router = APIRouter(tags=["academic"])


# ---------- Courses (admin) ----------
@router.get("/courses", response_model=List[CourseOut])
def list_courses(db: Session = Depends(get_db)):
    return db.execute(select(Course)).scalars().all()


@router.post("/courses", response_model=CourseOut, status_code=201)
def create_course(
    payload: CourseIn,
    db: Session = Depends(get_db),
    current: User = Depends(require_admin),
):
    course = Course(**payload.model_dump(), created_by=current.id)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


# ---------- Classes ----------
@router.get("/classes", response_model=List[ClassOut])
def list_classes(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    stmt = select(Class_)
    if current.role == "teacher":
        stmt = stmt.where(Class_.teacher_id == current.id)
    elif current.role == "student":
        sub = select(ClassStudent.class_id).where(ClassStudent.student_id == current.id)
        stmt = stmt.where(Class_.id.in_(sub))
    return db.execute(stmt).scalars().all()


@router.post("/classes", response_model=ClassOut, status_code=201,
             dependencies=[Depends(require_admin)])
def create_class(payload: ClassIn, db: Session = Depends(get_db)):
    cls = Class_(**payload.model_dump())
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


@router.post("/classes/enroll", status_code=201,
             dependencies=[Depends(require_teacher)])
def enroll_student(payload: EnrollIn, db: Session = Depends(get_db)):
    if not db.get(Class_, payload.class_id):
        raise HTTPException(404, "Class not found")
    if not db.get(User, payload.student_id):
        raise HTTPException(404, "Student not found")
    exists = db.execute(
        select(ClassStudent).where(
            ClassStudent.class_id == payload.class_id,
            ClassStudent.student_id == payload.student_id,
        )
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(409, "Already enrolled")
    cs = ClassStudent(**payload.model_dump())
    db.add(cs)
    db.commit()
    return {"ok": True}


# ---------- Schedules ----------
@router.get("/schedules", response_model=List[ScheduleOut])
def list_schedules(
    class_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.execute(
        select(Schedule).where(Schedule.class_id == class_id).order_by(Schedule.start_time)
    ).scalars().all()


@router.post("/schedules", response_model=ScheduleOut, status_code=201,
             dependencies=[Depends(require_teacher)])
def create_schedule(payload: ScheduleIn, db: Session = Depends(get_db)):
    sch = Schedule(**payload.model_dump())
    db.add(sch)
    db.commit()
    db.refresh(sch)
    return sch


# ---------- Lessons ----------
@router.get("/lessons", response_model=List[LessonOut])
def list_lessons(course_id: int, db: Session = Depends(get_db)):
    return db.execute(
        select(Lesson).where(Lesson.course_id == course_id).order_by(Lesson.order_index)
    ).scalars().all()


@router.post("/lessons", response_model=LessonOut, status_code=201,
             dependencies=[Depends(require_teacher)])
def create_lesson(payload: LessonIn, db: Session = Depends(get_db)):
    lesson = Lesson(**payload.model_dump())
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


# ---------- Class details (students of a class) ----------
@router.get("/classes/{class_id}/students", response_model=List[dict])
def class_students(
    class_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    cls = db.get(Class_, class_id)
    if not cls:
        raise HTTPException(404, "Class not found")
    if current.role == "teacher" and cls.teacher_id != current.id:
        raise HTTPException(403, "Forbidden")
    rows = db.execute(
        select(User, ClassStudent.status, ClassStudent.joined_at)
        .join(ClassStudent, ClassStudent.student_id == User.id)
        .where(ClassStudent.class_id == class_id)
    ).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "is_active": u.is_active,
            "status": status,
            "joined_at": joined_at,
        }
        for u, status, joined_at in rows
    ]
