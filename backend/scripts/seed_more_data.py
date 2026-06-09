"""Seed thêm dữ liệu thực tế: SV, enroll đa lớp/đa môn, chat sessions/messages.

Chạy SAU khi đã có:
- schema.sql + seed.sql
- fix_demo_passwords --all  (để demo SV mới có password 123456)
- seed_lessons.py (để có lessons cho retrieval)

Lệnh:
    python -m scripts.seed_more_data
"""
from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    ChatMessage, ChatSession, ClassStudent, Class_, Course, QuestionTopic, User,
)
from app.security import hash_password  # noqa: E402


NEW_STUDENTS = [
    "Nguyễn Văn Khang", "Trần Thị Lan", "Lê Hữu Nam", "Phạm Mỹ Linh",
    "Hoàng Đức Tùng", "Vũ Thanh Hà", "Đỗ Quang Hải", "Bùi Thu Phương",
    "Mai Tuấn Anh", "Đặng Ngọc Yến", "Trịnh Văn Đức", "Lý Thanh Hoa",
    "Cao Minh Quân", "Phan Thuỳ Dương", "Ngô Thái Sơn",
]

QA_BANK = [
    ("Pandas",        "Pandas groupby là gì và khi nào nên dùng?",                 "Pandas groupby chia DataFrame theo cột, sau đó áp dụng aggregate..."),
    ("Pandas",        "Cách merge 2 DataFrame trong Pandas?",                       "Dùng pd.merge(df1, df2, on='key', how='left'|'inner'|'outer')..."),
    ("Pandas",        "Em đọc CSV bị lỗi font tiếng Việt phải làm sao?",            "Thêm encoding='utf-8-sig' hoặc 'cp1258' khi đọc file..."),
    ("Python",        "List comprehension là gì?",                                  "[expr for x in iterable if cond] — viết ngắn, nhanh hơn for thường..."),
    ("Python",        "Khác nhau giữa list và tuple?",                              "List mutable, tuple immutable. Tuple nhanh hơn vì cố định..."),
    ("Visualization", "Vẽ histogram trong matplotlib như thế nào?",                 "plt.hist(data, bins=20, color='steelblue', edgecolor='white')..."),
    ("Visualization", "Cách vẽ heatmap correlation?",                                "sns.heatmap(df.corr(), annot=True, cmap='coolwarm')..."),
    ("Linear Regression", "Linear Regression của sklearn dùng ra sao?",              "from sklearn.linear_model import LinearRegression; .fit(X, y)..."),
    ("Linear Regression", "R² âm là sao?",                                            "Mô hình tệ hơn baseline mean, kiểm tra lại feature hoặc data..."),
    ("Classification", "Confusion matrix giải thích thế nào?",                       "Hàng=thực tế, cột=dự đoán. TP/TN trên đường chéo, FP/FN còn lại..."),
    ("Classification", "Accuracy thấp dù dataset cân bằng?",                         "Có thể do feature yếu, thử thêm feature engineering hoặc đổi model..."),
]


def main() -> None:
    db = SessionLocal()
    try:
        rng = random.Random(42)
        pwd = hash_password("123456")

        # 1) Tạo SV mới (skip nếu email đã có)
        existing_emails = {e for (e,) in db.execute(select(User.email)).all()}
        new_users: list[User] = []
        for full in NEW_STUDENTS:
            slug = (
                full.lower()
                .replace("đ", "d").replace("Đ", "d")
                .replace("ă", "a").replace("â", "a").replace("á", "a").replace("à", "a").replace("ạ", "a").replace("ả", "a").replace("ã", "a")
                .replace("ê", "e").replace("é", "e").replace("è", "e").replace("ẻ", "e").replace("ẽ", "e").replace("ẹ", "e")
                .replace("ô", "o").replace("ơ", "o").replace("ó", "o").replace("ò", "o").replace("ọ", "o").replace("ỏ", "o").replace("õ", "o")
                .replace("ư", "u").replace("ú", "u").replace("ù", "u").replace("ụ", "u").replace("ủ", "u").replace("ũ", "u")
                .replace("í", "i").replace("ì", "i").replace("ị", "i").replace("ỉ", "i").replace("ĩ", "i")
                .replace("ý", "y").replace("ỳ", "y").replace("ỵ", "y").replace("ỷ", "y").replace("ỹ", "y")
                .replace(" ", "")
            )
            email = f"{slug}@student.uni.edu.vn"
            if email in existing_emails:
                continue
            u = User(full_name=full, email=email, password_hash=pwd, role="student")
            db.add(u)
            new_users.append(u)
        db.commit()
        for u in new_users:
            db.refresh(u)
        print(f"[+] Tạo {len(new_users)} sinh viên mới (password = 123456)")

        # 2) Enroll: mỗi SV mới vào 1-2 lớp ngẫu nhiên (ưu tiên đa môn)
        classes = db.execute(select(Class_)).scalars().all()
        if not classes:
            print("Không có lớp nào, bỏ qua enroll.")
            return
        # group by course
        by_course: dict[int, list[Class_]] = {}
        for c in classes:
            by_course.setdefault(c.course_id, []).append(c)

        all_students = db.execute(select(User).where(User.role == "student")).scalars().all()
        existing_pairs = {
            (cs.class_id, cs.student_id)
            for cs in db.execute(select(ClassStudent)).scalars().all()
        }
        enrolled = 0
        for u in all_students:
            # mỗi SV vào 1-2 môn khác nhau, mỗi môn 1 lớp
            n_courses = rng.choice([1, 2])
            chosen_course_ids = rng.sample(list(by_course.keys()), k=min(n_courses, len(by_course)))
            for cid in chosen_course_ids:
                cls = rng.choice(by_course[cid])
                if (cls.id, u.id) in existing_pairs:
                    continue
                db.add(ClassStudent(class_id=cls.id, student_id=u.id))
                existing_pairs.add((cls.id, u.id))
                enrolled += 1
        db.commit()
        print(f"[+] Tạo thêm {enrolled} lượt enroll (đảm bảo không duplicate)")

        # 3) Tạo chat sessions + messages cho 1 phần SV (giả lập đã hỏi AI)
        topics_by_name = {
            t.name: t for t in db.execute(select(QuestionTopic)).scalars().all()
        }
        course_ds101 = db.execute(
            select(Course).where(Course.code == "DS101")
        ).scalar_one_or_none()
        n_sessions = 0
        n_msgs = 0
        for u in rng.sample(all_students, k=min(10, len(all_students))):
            # mỗi SV 1-3 phiên, mỗi phiên 2-4 cặp câu hỏi-trả lời
            for _ in range(rng.randint(1, 3)):
                started = datetime.utcnow() - timedelta(days=rng.randint(0, 14))
                qa_set = rng.sample(QA_BANK, k=rng.randint(2, 4))
                title = qa_set[0][1][:80]
                session = ChatSession(
                    student_id=u.id,
                    course_id=course_ds101.id if course_ds101 else None,
                    title=title,
                    started_at=started,
                    ended_at=started + timedelta(minutes=rng.randint(5, 25)),
                    message_count=len(qa_set) * 2,
                )
                db.add(session)
                db.flush()
                for topic_name, q, a in qa_set:
                    topic = topics_by_name.get(topic_name)
                    db.add(ChatMessage(
                        session_id=session.id, sender="student", content=q,
                        topic_id=topic.id if topic else None,
                        created_at=started + timedelta(seconds=rng.randint(1, 30)),
                    ))
                    db.add(ChatMessage(
                        session_id=session.id, sender="bot", content=a,
                        topic_id=topic.id if topic else None,
                        tokens_used=rng.randint(80, 220),
                        response_time_ms=rng.randint(600, 1500),
                        created_at=started + timedelta(seconds=rng.randint(31, 90)),
                    ))
                    n_msgs += 2
                n_sessions += 1
        db.commit()
        print(f"[+] Tạo {n_sessions} phiên chat + {n_msgs} tin nhắn")
        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
