import os, sys
os.environ['DATABASE_URL'] = 'postgresql://postgres:altruism123@localhost:5432/alturism'
os.environ['JWT_SECRET'] = 'secret'
sys.path.insert(0, '.')
from database import get_db

tables = [
    ('events', 'id'),
    ('event_applications', 'id'),
    ('activities', 'id'),
    ('certificates', 'id'),
    ('volunteers', 'id'),
    ('supervisors', 'id'),
    ('org_admins', 'id'),
    ('notifications', 'id'),
    ('users', 'id'),
    ('organizations', 'id'),
]

with get_db() as db:
    for table, col in tables:
        db.execute(f"SELECT setval(pg_get_serial_sequence('{table}', '{col}'), COALESCE((SELECT MAX({col}) FROM {table}), 1))")
        result = db.execute(f"SELECT last_value FROM pg_sequences WHERE sequencename = (SELECT replace(pg_get_serial_sequence('{table}', '{col}'), 'public.', ''))").fetchone()
        print(f"{table}.{col} sequence set to {result['last_value'] if result else '?'}")

print("Done — all sequences fixed.")
