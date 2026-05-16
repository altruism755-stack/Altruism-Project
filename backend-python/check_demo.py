import psycopg
conn = psycopg.connect('host=localhost port=5432 dbname=alturism user=postgres password=altruism123', row_factory=psycopg.rows.dict_row)
db = conn.cursor()

print('=== AHMED events (supervisor 3) ===')
db.execute('SELECT id, name, status, starts_at FROM events WHERE created_by_supervisor_id=3 ORDER BY starts_at DESC')
for r in db.fetchall(): print(r)

print()
print('=== AHMED pending applications ===')
db.execute("SELECT ea.id, v.name, e.name as event, ea.status FROM event_applications ea JOIN volunteers v ON v.id=ea.volunteer_id JOIN events e ON e.id=ea.event_id WHERE e.created_by_supervisor_id=3 AND ea.status='pending' ORDER BY ea.created_at")
for r in db.fetchall(): print(r)

print()
print('=== AHMED activities by status ===')
db.execute("SELECT a.status, COUNT(*) as cnt FROM activities a JOIN events e ON e.id=a.event_id WHERE e.created_by_supervisor_id=3 GROUP BY a.status")
for r in db.fetchall(): print(r)

print()
print('=== AHMED certificates ===')
db.execute("SELECT COUNT(*) as cnt FROM certificates WHERE org_id=2 AND event_id IN (SELECT id FROM events WHERE created_by_supervisor_id=3)")
print(db.fetchone())

print()
print('=== FATIMA org (org 2) member stats ===')
db.execute("SELECT status, COUNT(*) as cnt FROM org_volunteers WHERE org_id=2 GROUP BY status")
for r in db.fetchall(): print(r)

print()
print('=== FATIMA pending applications (org 2 events) ===')
db.execute("SELECT ea.id, v.name, e.name as event, ea.status FROM event_applications ea JOIN events e ON e.id=ea.event_id JOIN volunteers v ON v.id=ea.volunteer_id WHERE e.org_id=2 AND ea.status='pending' ORDER BY ea.created_at LIMIT 10")
for r in db.fetchall(): print(r)

print()
print('=== FATIMA supervisors with event counts ===')
db.execute("SELECT s.id, s.name, u.email, s.team, s.status, COUNT(e.id) as events FROM supervisors s JOIN users u ON u.id=s.user_id LEFT JOIN events e ON e.created_by_supervisor_id=s.id WHERE s.org_id=2 GROUP BY s.id, u.email ORDER BY s.id")
for r in db.fetchall(): print(r)

print()
print('=== AHMED notifications (last 10) ===')
db.execute("SELECT type, title, read, created_at FROM notifications WHERE user_id=12 ORDER BY created_at DESC LIMIT 10")
for r in db.fetchall(): print(r)

print()
print('=== FATIMA org events by status ===')
db.execute("SELECT status, COUNT(*) as cnt FROM events WHERE org_id=2 GROUP BY status")
for r in db.fetchall(): print(r)

print()
print('=== Check: any activities with NULL event_id for org 2 ===')
db.execute("SELECT COUNT(*) as cnt FROM activities WHERE org_id=2 AND event_id IS NULL")
print(db.fetchone())

print()
print('=== Check: supervisor password (user 12) ===')
db.execute("SELECT id, email, role FROM users WHERE id=12")
print(db.fetchone())

conn.close()
print('Done.')
