# DS Chatbot — Hệ thống AI hỗ trợ học Data Science

Đồ án 3 actor (Admin / Giáo viên / Sinh viên), backend FastAPI, frontend Vite + React + Tailwind, database MySQL.

## Khởi động nhanh

**Yêu cầu:** Windows + Python 3.11+ + Node 18+ + MySQL đang chạy (XAMPP / MySQL Server).

```powershell
# 1. Tạo DB & seed (chạy 1 lần, qua phpMyAdmin hoặc CLI)
mysql -u root < database/schema.sql
mysql -u root < database/seed.sql

# 2. Cài đặt 1 lần đầu (venv + npm + re-hash + ingest PDF)
.\setup.ps1

# 3. Khởi động dev mỗi ngày (mở 2 panel + browser tự động)
.\start-dev.ps1
```

Nếu PowerShell chặn script:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Hoặc dùng file `.bat`:
```cmd
setup.bat
start-dev.bat
```

## URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

## Tài khoản demo (sau `setup.ps1`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@uni.edu.vn | 123456 |
| Teacher | huong.tt@uni.edu.vn | 123456 |
| Student | an.ph@student.uni.edu.vn | 123456 |

## Cấu trúc

```
.
├── database/         # schema.sql, seed.sql (MySQL 8)
├── backend/          # FastAPI + SQLAlchemy + JWT + bcrypt
│   ├── app/
│   ├── scripts/      # fix_demo_passwords, ingest_pdf
│   └── requirements.txt
├── frontend/         # Vite + React + TS + Tailwind
│   └── src/
│       ├── layouts/  # AdminLayout, TeacherLayout, StudentLayout
│       └── pages/    # admin/, teacher/, student/
├── setup.ps1         # cài đặt 1 lần
└── start-dev.ps1     # khởi động dev hằng ngày
```

## Đặc điểm kỹ thuật

- **Hướng A+ retrieval:** keyword scoring trên `lessons.content` (`title` x3 + `content` x1), không dùng Vector DB.
- **LLM pluggable:** `LLM_PROVIDER` trong `backend/.env` chọn `mock | gemini | openai | ollama`.
- **JWT auth + RBAC:** 3 role (admin/teacher/student) qua `require_admin/teacher/student` decorators.
- **Ingest PDF:** `scripts/ingest_pdf.py` chia chương theo regex heading rồi lưu vào `lessons.content`.

## Tài liệu thêm

- `backend/README.md` — chi tiết backend + API
- `frontend/README.md` — chi tiết frontend
- `requirement.txt` — đề bài gốc
