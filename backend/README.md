# DS Chatbot — Backend (FastAPI)

Hệ thống AI Chatbot hỗ trợ học tập môn Data Science.

## Yêu cầu
- Python 3.11+
- MySQL 8.0+ (đã chạy `database/schema.sql` và `database/seed.sql`)

## Cài đặt
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate         # Windows
# source .venv/bin/activate      # macOS/Linux
pip install -r requirements.txt
copy .env.example .env           # rồi sửa DB_PASSWORD, LLM_PROVIDER...
```

## Chuẩn bị dữ liệu (chạy 1 lần)
```bash
# 1. Tạo schema + seed
mysql -u root -p < ../database/schema.sql
mysql -u root -p < ../database/seed.sql

# 2. Re-hash mật khẩu demo về '123456'
python -m scripts.fix_demo_passwords

# 3. Nạp nội dung PDF vào bảng `lessons` cho A+ retrieval
python -m scripts.ingest_pdf "../Nathan George - Practical Data Science with Python_ Learn tools and techniques from hands-on examples to extract insights from data-Packt Publishing (2021).pdf" --course DS101 --replace
```

## Chạy
```bash
uvicorn app.main:app --reload --port 8000
```
- Swagger UI: http://localhost:8000/docs
- Health:     http://localhost:8000/api/health

## Tài khoản demo (sau khi seed)
| Role    | Email                          | Password |
|---------|--------------------------------|----------|
| admin   | admin@uni.edu.vn               | 123456   |
| teacher | huong.tt@uni.edu.vn            | 123456   |
| student | an.ph@student.uni.edu.vn       | 123456   |

> **Lưu ý:** seed.sql lưu `password_hash` giả. Chạy
> `python -m scripts.fix_demo_passwords` để re-hash các tài khoản trên về
> bcrypt('123456'). Hoặc dùng `POST /api/auth/register` để tạo user mới.

## Cấu trúc
```
backend/
├── app/
│   ├── main.py            # FastAPI entry
│   ├── config.py          # Settings từ .env
│   ├── database.py        # SQLAlchemy engine + session
│   ├── models.py          # 11 ORM models
│   ├── schemas.py         # Pydantic DTOs
│   ├── security.py        # JWT, bcrypt
│   ├── deps.py            # get_current_user, role guards
│   ├── routers/
│   │   ├── auth.py        # /api/auth
│   │   ├── users.py       # /api/users
│   │   ├── academic.py    # /api/courses, classes, schedules, lessons
│   │   ├── chat.py        # /api/chat (A+ retrieval + LLM)
│   │   └── analytics.py   # /api/analytics, /api/alerts
│   └── services/
│       ├── retrieval.py   # Keyword scoring → top-k lessons
│       └── llm.py         # Gemini / OpenAI / Ollama / mock
├── requirements.txt
└── .env.example
```

## Hướng A+ — Retrieval rẻ tiền
- **Không** dùng Vector DB / embedding API.
- Khi SV gửi câu hỏi:
  1. Tách token, lọc stopwords tiếng Việt + tiếng Anh.
  2. Quét bảng `lessons` bằng `LIKE`, tính score: `+3` nếu khớp `title`, `+1` nếu khớp `content`.
  3. Lấy top-3, cắt 1200 ký tự đầu mỗi bài làm context.
  4. Ghép vào prompt theo template trong `services/llm.py`.
- Schema vẫn giữ cột `lessons.embedding_id` để mở rộng RAG sau này (Hướng B).

## Provider LLM
Đổi qua `.env`:
- `LLM_PROVIDER=mock`   — không gọi API, trả lời echo (mặc định cho dev).
- `LLM_PROVIDER=gemini` — cần `GEMINI_API_KEY`.
- `LLM_PROVIDER=openai` — cần `OPENAI_API_KEY`.
- `LLM_PROVIDER=ollama` — cần Ollama chạy local.
