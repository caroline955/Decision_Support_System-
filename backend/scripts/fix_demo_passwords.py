"""Re-hash demo seed passwords to bcrypt('123456').

Run once after `database/seed.sql`:
    python -m scripts.fix_demo_passwords
"""
from __future__ import annotations

import sys
from pathlib import Path

# allow `python -m scripts.fix_demo_passwords` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import User  # noqa: E402
from app.security import hash_password  # noqa: E402


DEMO_PASSWORD = "123456"


def main() -> None:
    db = SessionLocal()
    try:
        users = db.execute(select(User)).scalars().all()
        new_hash = hash_password(DEMO_PASSWORD)
        n = 0
        for u in users:
            # only re-hash obviously fake seed values
            if u.password_hash.startswith("$2b$10$abcdefgh") or u.password_hash == "$2b$10$x":
                u.password_hash = new_hash
                n += 1
        db.commit()
        print(f"Re-hashed {n}/{len(users)} demo users -> password = '{DEMO_PASSWORD}'")
    finally:
        db.close()


if __name__ == "__main__":
    main()
