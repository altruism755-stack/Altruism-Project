import os, sys
os.environ['DATABASE_URL'] = 'postgresql://postgres:altruism123@localhost:5432/alturism'
os.environ['JWT_SECRET'] = 'secret'
sys.path.insert(0, '.')
from database import get_db

with get_db() as db:
    cols = db.execute(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='events' ORDER BY ordinal_position"
    ).fetchall()
    print("=== events columns ===")
    for c in cols:
        print(dict(c))

    print("\n=== test insert ===")
    try:
        r = db.execute(
            "INSERT INTO events (org_id, name, description, location, starts_at, duration, max_volunteers, required_skills, status, acceptance_mode, registration_open, created_by_supervisor_id) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (2, 'Test Event', '', '', '2026-06-15', None, None, '', 'upcoming', 'manual', True, 3)
        ).fetchone()
        print("INSERT OK, id =", r['id'])
        db.execute("DELETE FROM events WHERE id=%s", (r['id'],))
        print("Cleaned up.")
    except Exception as e:
        print("INSERT FAILED:", type(e).__name__, e)
