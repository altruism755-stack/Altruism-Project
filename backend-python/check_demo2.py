import psycopg
conn = psycopg.connect('host=localhost port=5432 dbname=alturism user=postgres password=altruism123', row_factory=psycopg.rows.dict_row)
db = conn.cursor()

print('=== notifications columns ===')
db.execute("SELECT column_name FROM information_schema.columns WHERE table_name='notifications' ORDER BY ordinal_position")
for r in db.fetchall(): print(r['column_name'])

print()
print('=== AHMED notifications (last 10) ===')
db.execute("SELECT type, title, is_read, created_at FROM notifications WHERE user_id=12 ORDER BY created_at DESC LIMIT 10")
for r in db.fetchall(): print(r)

print()
print('=== FATIMA org events by status ===')
db.execute("SELECT status, COUNT(*) as cnt FROM events WHERE org_id=2 GROUP BY status")
for r in db.fetchall(): print(r)

print()
print('=== 4 pending activities for Ahmed ===')
db.execute("SELECT a.id, a.volunteer_id, a.event_id, a.status, a.hours, a.date, e.name as event FROM activities a JOIN events e ON e.id=a.event_id WHERE e.created_by_supervisor_id=3 AND a.status='pending'")
for r in db.fetchall(): print(r)

print()
print('=== AHMED My Events tab: upcoming events with application counts ===')
db.execute("""
    SELECT e.id, e.name, e.status,
           COUNT(CASE WHEN ea.status='pending' THEN 1 END) as pending_apps,
           COUNT(CASE WHEN ea.status='approved' THEN 1 END) as approved_apps
    FROM events e
    LEFT JOIN event_applications ea ON ea.event_id=e.id AND ea.cancelled_at IS NULL
    WHERE e.created_by_supervisor_id=3
    GROUP BY e.id ORDER BY e.starts_at DESC
""")
for r in db.fetchall(): print(r)

print()
print('=== FATIMA active members sample (first 5) ===')
db.execute("SELECT v.name, u.email, ov.department, ov.status FROM org_volunteers ov JOIN volunteers v ON v.id=ov.volunteer_id JOIN users u ON u.id=v.user_id WHERE ov.org_id=2 AND ov.status='active' ORDER BY ov.joined_at DESC LIMIT 5")
for r in db.fetchall(): print(r)

print()
print('=== Check: supervisor_id set on active members ===')
db.execute("SELECT supervisor_id IS NULL as no_supervisor, COUNT(*) FROM org_volunteers WHERE org_id=2 AND status='active' GROUP BY supervisor_id IS NULL")
for r in db.fetchall(): print(r)

conn.close()
print('Done.')
