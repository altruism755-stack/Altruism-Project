import os
os.environ['DATABASE_URL'] = 'postgresql://postgres:altruism123@localhost:5432/alturism'
from database import get_db

with get_db() as db:
    db.execute("UPDATE organizations SET location = 'Cairo' WHERE id = 1")
    db.execute("UPDATE organizations SET location = 'Cairo' WHERE id = 2")
    db.execute("UPDATE organizations SET location = 'Cairo' WHERE id = 3")
    rows = db.execute("SELECT id, name, location, hq_city FROM organizations ORDER BY id").fetchall()
    for r in rows:
        print(dict(r))

print("Done.")
