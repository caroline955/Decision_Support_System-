# DS Chatbot — Frontend (Vite + React + TypeScript + Tailwind)

## Cài đặt
```bash
cd frontend
npm install
```

## Chạy dev
```bash
npm run dev
```
Mở http://localhost:5173

Backend chạy ở http://localhost:8000 (đã cấu hình proxy `/api` trong `vite.config.ts`).

## Build production
```bash
npm run build
```

## Cấu trúc
```
frontend/src/
├── main.tsx              # entry, BrowserRouter, AuthProvider
├── App.tsx               # routes + Protected wrapper
├── index.css             # tailwind layers
├── lib/
│   ├── api.ts            # axios instance + token interceptor
│   └── types.ts          # User, AskResponse, Alert...
├── context/
│   └── AuthContext.tsx   # login/logout, lưu token vào localStorage
├── components/
│   └── Layout.tsx        # header + nav theo role
└── pages/
    ├── LoginPage.tsx
    ├── DashboardPage.tsx # lớp + analytics của tôi
    ├── ChatPage.tsx      # chat box + sidebar bài học liên quan
    └── AlertsPage.tsx    # cảnh báo cho giáo viên
```

## Tài khoản demo
| Role    | Email                          | Password |
|---------|--------------------------------|----------|
| admin   | admin@uni.edu.vn               | 123456   |
| teacher | huong.tt@uni.edu.vn            | 123456   |
| student | an.ph@student.uni.edu.vn       | 123456   |

> Chạy `python -m scripts.fix_demo_passwords` ở backend trước khi đăng nhập.
