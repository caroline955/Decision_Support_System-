"""Tạo dữ liệu giả lập để test hot_topic alert.

Script tạo 6 SV trong cùng 1 lớp hỏi cùng topic 'decision-tree' nhiều lần.
Sau khi seed, alert hot_topic sẽ được sinh.

Run:
    python -m scripts.seed_hot_topic
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    ChatMessage, ChatSession, Class_, ClassStudent, QuestionTopic,
)
from app.services.alerts import maybe_create_hot_topic_alert  # noqa: E402


def main() -> None:
    db = SessionLocal()
    try:
        cls = db.execute(select(Class_).limit(1)).scalar_one()
        topic = db.execute(
            select(QuestionTopic).where(QuestionTopic.slug == "decision-tree")
        ).scalar_one()
        students = db.execute(
            select(ClassStudent).where(ClassStudent.class_id == cls.id).limit(5)
        ).scalars().all()
        print(f"Lớp: {cls.name} (id={cls.id})")
        print(f"Topic: {topic.name} (id={topic.id})")
        print(f"Số SV: {len(students)}")

        now = datetime.utcnow()
        n_msgs = 0
        for idx, link in enumerate(students):
            session = ChatSession(
                student_id=link.student_id,
                course_id=cls.course_id,
                title="Decision tree thac mac",
                started_at=now - timedelta(hours=idx + 1),
                message_count=4,
            )
            db.add(session)
            db.flush()
            for j in range(2):  # 2 câu hỏi mỗi SV
                db.add(ChatMessage(
                    session_id=session.id,
                    sender="student",
                    content=f"Hoi gi do ve Decision Tree #{j + 1}",
                    topic_id=topic.id,
                    created_at=now - timedelta(hours=idx, minutes=j * 10),
                ))
                db.add(ChatMessage(
                    session_id=session.id,
                    sender="bot",
                    content="Tra loi mau...",
                    topic_id=topic.id,
                    response_time_ms=2000,
                    created_at=now - timedelta(hours=idx, minutes=j * 10 - 1),
                ))
                n_msgs += 2
        db.commit()
        print(f"Đã seed {n_msgs} message từ {len(students)} SV.")

        # Bắn check hot_topic
        alert = maybe_create_hot_topic_alert(db, class_id=cls.id, topic_id=topic.id)
        if alert:
            db.commit()
            print(f"\n[+] Alert hot_topic ĐÃ tạo: severity={alert.severity}")
            print(f"    Message: {alert.message}")
        else:
            print("\n[-] Chưa đủ ngưỡng để tạo alert hot_topic")
    finally:
        db.close()


if __name__ == "__main__":
    main()
