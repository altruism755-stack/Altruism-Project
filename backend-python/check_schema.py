import os, sys
os.environ['DATABASE_URL'] = 'postgresql://postgres:altruism123@localhost:5432/alturism'
sys.stdout.reconfigure(encoding='utf-8')
from database import get_db

with get_db() as db:
    cols = [dict(r)['column_name'] for r in db.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_name='org_admins' ORDER BY ordinal_position"
    ).fetchall()]
    print('org_admins columns:', cols)

    sup_events = db.execute(
        "SELECT created_by_supervisor_id, COUNT(*) as cnt FROM events GROUP BY created_by_supervisor_id ORDER BY created_by_supervisor_id"
    ).fetchall()
    print('Events by supervisor_id:', [dict(r) for r in sup_events])

    vcnt = dict(db.execute("SELECT COUNT(*) as c FROM volunteers").fetchone())
    print('Total volunteers:', vcnt)

    ovcnt = dict(db.execute("SELECT COUNT(*) as c FROM org_volunteers").fetchone())
    print('Total org_volunteers:', ovcnt)

    # Supervisor table columns
    scols = [dict(r)['column_name'] for r in db.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_name='supervisors' ORDER BY ordinal_position"
    ).fetchall()]
    print('supervisors columns:', scols)
