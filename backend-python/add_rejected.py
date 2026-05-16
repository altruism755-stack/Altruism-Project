import os
os.environ['DATABASE_URL'] = 'postgresql://postgres:altruism123@localhost:5432/alturism'
from database import get_db
import random

DEPARTMENTS = ["Medical", "Field", "Outreach", "Logistics", "Education", "Translation", "Media", "Programs", "Nursing", "Legal"]
DATES = ["2026-01-15", "2026-02-03", "2026-02-20", "2026-03-05", "2026-03-18", "2026-04-02", "2026-04-14", "2026-04-28", "2026-05-05", "2026-05-10"]

with get_db() as db:
    existing = set(r["volunteer_id"] for r in db.execute("SELECT volunteer_id FROM org_volunteers WHERE org_id=2").fetchall())
    all_faker = [r["id"] for r in db.execute("SELECT id FROM volunteers WHERE id > 25 ORDER BY id").fetchall()]
    available = [v for v in all_faker if v not in existing]

    # Take 12 for rejected
    to_reject = available[:12]

    rows = [
        (2, vid, random.choice(DEPARTMENTS), "rejected", random.choice(DATES), "self_registration")
        for vid in to_reject
    ]

    with db.cursor() as cur:
        cur.executemany(
            "INSERT INTO org_volunteers (org_id, volunteer_id, department, status, joined_at, join_source) "
            "VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            rows,
        )

    total = db.execute("SELECT COUNT(*) as c FROM org_volunteers WHERE org_id=2 AND status='rejected'").fetchone()["c"]
    print(f"Done. Red Crescent now has {total} rejected volunteers.")
