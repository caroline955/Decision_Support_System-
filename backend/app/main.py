"""FastAPI application entry point."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import academic, admin, analytics, auth, chat, users


logging.basicConfig(level=logging.INFO if settings.DEBUG else logging.WARNING)


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="AI Chatbot hỗ trợ học tập môn Data Science",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "env": settings.ENV,
        "llm_provider": settings.LLM_PROVIDER,
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Mount API routes under /api
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(academic.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
