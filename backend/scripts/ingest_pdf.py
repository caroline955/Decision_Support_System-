"""Ingest a PDF textbook into `lessons.content` for A+ keyword retrieval.

Strategy (offline, NO LLM/embedding calls):
1. Read PDF text page by page with pypdf.
2. Split into chapters by regex on common headings:
       "Chapter N", "CHAPTER N", "Phần N", "Bài N"
   Fallback: split into N equal slices if no headings found.
3. For each chapter: keep up to MAX_CHARS chars, store as a Lesson.
4. Map chapters to a target course (default: course code DS101).

Run:
    python -m scripts.ingest_pdf "../Nathan George - Practical Data Science with Python ... .pdf" --course DS101
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import List, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pypdf import PdfReader  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import Course, Lesson  # noqa: E402


MAX_CHARS = 3000        # per lesson content
MIN_CHAPTER_CHARS = 500  # discard noise sections
HEADING_RE = re.compile(
    r"^\s*(?:Chapter|CHAPTER|Bài|BÀI|Phần|PHẦN)\s+(\d+)\b[\s:.\-]*(.{0,120})$",
    re.MULTILINE,
)


def extract_text(pdf_path: Path) -> str:
    """Try pypdf first; fall back to pdfplumber for slightly-broken PDFs."""
    parts: list[str] = []

    # --- attempt 1: pypdf (fast) ---
    try:
        reader = PdfReader(str(pdf_path), strict=False)
        for i, page in enumerate(reader.pages):
            try:
                parts.append(page.extract_text() or "")
            except Exception as e:
                print(f"  ! pypdf page {i} failed: {e}")
        text = "\n".join(parts)
        if len(text) > 1000:
            return text
        print("  pypdf returned too little text, trying pdfplumber...")
    except Exception as e:
        print(f"  pypdf cannot open: {e} — falling back to pdfplumber")

    # --- attempt 2: pdfplumber (more lenient) ---
    parts = []
    try:
        import pdfplumber  # type: ignore

        with pdfplumber.open(str(pdf_path)) as pdf:
            for i, page in enumerate(pdf.pages):
                try:
                    parts.append(page.extract_text() or "")
                except Exception as e:
                    print(f"  ! pdfplumber page {i} failed: {e}")
        return "\n".join(parts)
    except ImportError:
        print("  pdfplumber not installed — `pip install pdfplumber`")
    except Exception as e:
        print(f"  pdfplumber failed: {e}")
    return ""


def split_chapters(text: str) -> List[Tuple[str, str]]:
    """Return list of (title, body) — uses heading regex; fallback to N slices."""
    matches = list(HEADING_RE.finditer(text))
    if len(matches) >= 3:
        chapters: List[Tuple[str, str]] = []
        for idx, m in enumerate(matches):
            num = m.group(1)
            tail = (m.group(2) or "").strip(" :.-")
            title = f"Chapter {num}" + (f" — {tail}" if tail else "")
            start = m.end()
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
            body = text[start:end].strip()
            if len(body) >= MIN_CHAPTER_CHARS:
                chapters.append((title[:200], body))
        if chapters:
            return chapters

    # fallback: 10 equal slices
    n = 10
    size = max(1, len(text) // n)
    return [
        (f"Section {i+1}", text[i * size : (i + 1) * size].strip())
        for i in range(n)
    ]


def clean(content: str) -> str:
    # collapse excessive whitespace
    content = re.sub(r"[\u00a0\t]+", " ", content)
    content = re.sub(r"\n{3,}", "\n\n", content)
    return content.strip()[:MAX_CHARS]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", help="Path to PDF file")
    ap.add_argument("--course", default="DS101", help="Course code to attach lessons to")
    ap.add_argument("--replace", action="store_true",
                    help="Delete existing lessons of the course before ingest")
    args = ap.parse_args()

    pdf_path = Path(args.pdf).expanduser().resolve()
    if not pdf_path.is_file():
        sys.exit(f"PDF not found: {pdf_path}")

    print(f"Reading {pdf_path.name} ...")
    text = extract_text(pdf_path)
    print(f"  total chars: {len(text):,}")

    chapters = split_chapters(text)
    print(f"  detected chapters: {len(chapters)}")

    db = SessionLocal()
    try:
        course = db.execute(
            select(Course).where(Course.code == args.course)
        ).scalar_one_or_none()
        if not course:
            sys.exit(f"Course code '{args.course}' not found. Run seed.sql first.")

        if args.replace:
            db.query(Lesson).filter(Lesson.course_id == course.id).delete()
            db.commit()
            print(f"  cleared old lessons of course {course.code}")

        for i, (title, body) in enumerate(chapters, start=1):
            content = clean(body)
            if len(content) < MIN_CHAPTER_CHARS:
                continue
            lesson = Lesson(
                course_id=course.id,
                title=title,
                content=content,
                file_url=str(pdf_path.name),
                order_index=i,
                embedding_id=None,
            )
            db.add(lesson)
        db.commit()
        print(f"Ingested into course {course.code} ({course.name}). Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
