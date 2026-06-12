"""Pydantic schemas for request/response payloads."""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --------------------------- Auth ---------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["admin", "teacher", "student"] = "student"
    parent_id: Optional[int] = None


class CreateTeacherRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    class_ids: List[int] = []  # gán GV vào các lớp này (đặt làm GV phụ trách)


# --------------------------- Users ---------------------------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: EmailStr
    role: str
    parent_id: Optional[int] = None
    avatar_url: Optional[str] = None
    is_active: bool


# --------------------------- Courses & Classes ---------------------------
class CourseIn(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class CourseOut(CourseIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ClassIn(BaseModel):
    course_id: int
    teacher_id: int
    name: str
    semester: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ClassOut(ClassIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    teacher_name: Optional[str] = None
    course_code: Optional[str] = None
    student_count: int = 0


class ClassPatch(BaseModel):
    teacher_id: Optional[int] = None
    name: Optional[str] = None
    semester: Optional[str] = None
    is_active: Optional[bool] = None


class EnrollIn(BaseModel):
    class_id: int
    student_id: int


# --------------------------- Schedules ---------------------------
class ScheduleIn(BaseModel):
    class_id: int
    title: str
    start_time: datetime
    end_time: datetime
    room: Optional[str] = None
    note: Optional[str] = None


class ScheduleOut(ScheduleIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


# --------------------------- Lessons ---------------------------
class LessonIn(BaseModel):
    course_id: int
    title: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    order_index: int = 0


class LessonOut(LessonIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


# --------------------------- Chat ---------------------------
class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    session_id: Optional[int] = None
    course_id: Optional[int] = None


class LessonRef(BaseModel):
    id: int
    title: str
    score: float


class AskResponse(BaseModel):
    session_id: int
    answer: str
    lesson_refs: List[LessonRef] = []
    topic: Optional[str] = None
    response_time_ms: int


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sender: str
    content: str
    lesson_id: Optional[int] = None
    topic_id: Optional[int] = None
    created_at: datetime


class ChatSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: Optional[str]
    started_at: datetime
    message_count: int


# --------------------------- Analytics & Alerts ---------------------------
class AnalyticsRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    student_id: int
    class_id: Optional[int]
    date: date
    session_count: int
    question_count: int
    repeat_score: Decimal


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    alert_type: str
    severity: str
    message: str
    is_read: bool
    created_at: datetime
class AlertHistoryMessage(BaseModel):
    id: int
    session_id: int
    question: str
    answer: Optional[str] = None
    created_at: datetime


class AlertHistoryResponse(BaseModel):
    alert_id: int
    alert_type: str
    student_id: Optional[int]
    student_name: Optional[str]
    topic_id: Optional[int]
    topic_name: Optional[str]
    total_questions: int
    messages: List[AlertHistoryMessage]

TokenResponse.model_rebuild()
