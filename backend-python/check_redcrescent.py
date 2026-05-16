import os, sys
os.environ['DATABASE_URL'] = 'postgresql://postgres:altruism123@localhost:5432/alturism'
sys.stdout.reconfigure(encoding='utf-8')
from database import get_db

with get_db() as db:
    admin = db.execute(
        "SELECT u.email, oa.org_id FROM org_admins oa JOIN users u ON u.id=oa.user_id WHERE u.email='fatimaelsayed@redcrescent.org'"
    ).fetchone()
    print("Fatima org_admin:", dict(admin))

    members = db.execute(
        "SELECT ov.volunteer_id, ov.status, ov.department FROM org_volunteers ov WHERE ov.org_id=2 ORDER BY ov.id"
    ).fetchall()
    print("Red Crescent members:", [dict(r) for r in members])

    events = db.execute("SELECT id, name, status FROM events WHERE org_id=2").fetchall()
    print("Events:", [dict(r) for r in events])

    notifs = db.execute("SELECT title, is_read FROM notifications WHERE user_id=3").fetchall()
    print("Fatima notifications:", [dict(r) for r in notifs])
