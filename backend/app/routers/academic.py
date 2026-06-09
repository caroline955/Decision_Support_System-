"""Courses, Classes, Enrollments, Schedules, Lessons CRUD."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
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
    ClassPatch,
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


@router.patch("/courses/{course_id}", response_model=CourseOut,
              dependencies=[Depends(require_admin)])
def update_course(course_id: int, payload: CourseIn, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    course.code = payload.code
    course.name = payload.name
    course.description = payload.description
    db.commit()
    db.refresh(course)
    return course


@router.delete("/courses/{course_id}", dependencies=[Depends(require_admin)])
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    db.delete(course)  # cascade xoá lessons, classes (theo schema FK)
    db.commit()
    return {"ok": True}


# ---------- Classes ----------
def _serialize_class(cls: Class_, db: Session) -> dict:
    teacher = db.get(User, cls.teacher_id)
    course = db.get(Course, cls.course_id)
    student_count = db.execute(
        select(func.count()).select_from(ClassStudent).where(ClassStudent.class_id == cls.id)
    ).scalar_one()
    return {
        "id": cls.id,
        "course_id": cls.course_id,
        "teacher_id": cls.teacher_id,
        "name": cls.name,
        "semester": cls.semester,
        "start_date": cls.start_date,
        "end_date": cls.end_date,
        "is_active": cls.is_active,
        "teacher_name": teacher.full_name if teacher else None,
        "course_code": course.code if course else None,
        "student_count": student_count,
    }


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
    rows = db.execute(stmt).scalars().all()
    return [_serialize_class(c, db) for c in rows]


@router.post("/classes", response_model=ClassOut, status_code=201,
             dependencies=[Depends(require_admin)])
def create_class(payload: ClassIn, db: Session = Depends(get_db)):
    cls = Class_(**payload.model_dump())
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return _serialize_class(cls, db)


@router.patch("/classes/{class_id}", response_model=ClassOut,
              dependencies=[Depends(require_admin)])
def update_class(class_id: int, payload: ClassPatch, db: Session = Depends(get_db)):
    cls = db.get(Class_, class_id)
    if not cls:
        raise HTTPException(404, "Class not found")
    if payload.teacher_id is not None:
        teacher = db.get(User, payload.teacher_id)
        if not teacher or teacher.role != "teacher":
            raise HTTPException(400, "Teacher id không hợp lệ")
        cls.teacher_id = payload.teacher_id
    if payload.name is not None:
        cls.name = payload.name
    if payload.semester is not None:
        cls.semester = payload.semester
    if payload.is_active is not None:
        cls.is_active = payload.is_active
    db.commit()
    db.refresh(cls)
    return _serialize_class(cls, db)


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


@router.patch("/lessons/{lesson_id}", response_model=LessonOut,
              dependencies=[Depends(require_teacher)])
def update_lesson(lesson_id: int, payload: LessonIn, db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    lesson.course_id = payload.course_id
    lesson.title = payload.title
    lesson.content = payload.content
    lesson.file_url = payload.file_url
    lesson.order_index = payload.order_index
    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/lessons/{lesson_id}", dependencies=[Depends(require_teacher)])
def delete_lesson(lesson_id: int, db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    db.delete(lesson)
    db.commit()
    return {"ok": True}


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
