"""Ingest plain-text textbook into `lessons.content` for A+ keyword retrieval.

Đọc file text (UTF-8) — đáng tin hơn PDF rất nhiều.
Chia chương theo heuristic:
  1. Pattern "Chương N", "Chapter N", "Bài N", "Phần N", "Part N"
  2. Pattern markdown headings (# H1, ## H2)
  3. Fallback: chia thành N slice đều nhau

Run:
    python -m scripts.ingest_text "../sach.txt" --course DS101 --replace
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import List, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import Course, Lesson  # noqa: E402


MAX_CHARS = 4000          # tối đa mỗi bài (giữ prompt LLM gọn)
MIN_CHAPTER_CHARS = 400   # bỏ chương quá ngắn
DEFAULT_SLICES = 12       # khi không phát hiện heading

# Bắt đầu dòng, không phân biệt hoa thường, có thể đứng trước là space
HEADING_RE = re.compile(
    r"^[ \t]*(?:CHƯƠNG|Chương|CHAPTER|Chapter|BÀI|Bài|PHẦN|Phần|PART|Part)\s+"
    r"(\d+|[IVXLCDM]+)\b[\s:.\-–—]*(.{0,120})$",
    re.MULTILINE,
)
MD_HEADING_RE = re.compile(r"^(#{1,3})[ \t]+(.{1,150})$", re.MULTILINE)


def read_text(path: Path) -> str:
    # Thử nhiều encoding phổ biến cho text tiếng Việt
    for enc in ("utf-8-sig", "utf-8", "utf-16", "cp1258", "cp1252", "latin-1"):
        try:
            data = path.read_text(encoding=enc)
            if "\ufffd" not in data[:5000]:
                print(f"  encoding: {enc}")
                return data
        except (UnicodeDecodeError, UnicodeError):
            continue
    # cuối cùng đọc lossy
    return path.read_text(encoding="utf-8", errors="ignore")


def split_by_pattern(text: str, regex: re.Pattern, label_fn) -> List[Tuple[str, str]]:
    matches = list(regex.finditer(text))
    if len(matches) < 3:
        return []
    chapters: List[Tuple[str, str]] = []
    for idx, m in enumerate(matches):
        title = label_fn(m)
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        if len(body) >= MIN_CHAPTER_CHARS:
            chapters.append((title[:200], body))
    return chapters


def split_chapters(text: str) -> List[Tuple[str, str]]:
    # 1) "Chương N: tên" / "Chapter N - title" / "Bài N. tên"
    chapters = split_by_pattern(
        text, HEADING_RE,
        lambda m: f"Chương {m.group(1)}" + (f" — {m.group(2).strip(' :.-–—')}" if m.group(2).strip() else ""),
    )
    if chapters:
        print(f"  matched 'Chương N' pattern → {len(chapters)} chương")
        return chapters

    # 2) Markdown headings (#, ##)
    chapters = split_by_pattern(
        text, MD_HEADING_RE,
        lambda m: m.group(2).strip(),
    )
    if chapters:
        print(f"  matched markdown heading → {len(chapters)} mục")
        return chapters

    # 3) Fallback: chia đều
    n = DEFAULT_SLICES
    size = max(1, len(text) // n)
    print(f"  fallback: chia thành {n} phần đều nhau")
    out = []
    for i in range(n):
        chunk = text[i * size: (i + 1) * size].strip()
        if len(chunk) >= MIN_CHAPTER_CHARS:
            # Lấy dòng đầu làm title
            first_line = chunk.split("\n", 1)[0].strip()
            title = first_line[:80] if first_line else f"Phần {i + 1}"
            out.append((title, chunk))
    return out


def clean(content: str) -> str:
    content = re.sub(r"[\u00a0\t]+", " ", content)
    content = re.sub(r"[ ]{2,}", " ", content)
    content = re.sub(r"\n{3,}", "\n\n", content)
    return content.strip()[:MAX_CHARS]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("text", help="Path to .txt file")
    ap.add_argument("--course", default="DS101", help="Course code")
    ap.add_argument("--replace", action="store_true",
                    help="Xoá toàn bộ lessons cũ của course trước khi ingest")
    args = ap.parse_args()

    path = Path(args.text).expanduser().resolve()
    if not path.is_file():
        sys.exit(f"File không tồn tại: {path}")

    print(f"Đọc {path.name} ({path.stat().st_size:,} bytes)...")
    text = read_text(path)
    print(f"  total chars: {len(text):,}")

    chapters = split_chapters(text)
    print(f"  detected sections: {len(chapters)}")
    if not chapters:
        sys.exit("Không trích được section nào. Kiểm tra file.")

    db = SessionLocal()
    try:
        course = db.execute(
            select(Course).where(Course.code == args.course)
        ).scalar_one_or_none()
        if not course:
            sys.exit(f"Course code '{args.course}' không tồn tại. Chạy seed.sql trước.")

        if args.replace:
            db.query(Lesson).filter(Lesson.course_id == course.id).delete(
                synchronize_session=False
            )
            db.commit()
            print(f"  đã xoá lessons cũ của {course.code}")

        n_inserted = 0
        for i, (title, body) in enumerate(chapters, start=1):
            content = clean(body)
            if len(content) < MIN_CHAPTER_CHARS:
                continue
            db.add(Lesson(
                course_id=course.id,
                title=title,
                content=content,
                file_url=path.name,
                order_index=i,
                embedding_id=None,
            ))
            n_inserted += 1
        db.commit()
        print(f"Đã ingest {n_inserted} lessons vào {course.code} ({course.name}). Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
