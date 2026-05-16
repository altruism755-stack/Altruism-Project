import psycopg
conn = psycopg.connect('host=localhost port=5432 dbname=alturism user=postgres password=altruism123', row_factory=psycopg.rows.dict_row)
db = conn.cursor()

# Fix 1: 4 pending activities → approved
db.execute("UPDATE activities SET status='approved' WHERE id IN (39,44,45,46)")
print(f"Fixed pending activities: {db.rowcount} rows")

# Fix 2: Update misleading "Activity Pending Review" notifications for Ahmed (user 12)
db.execute("""
    UPDATE notifications
    SET title='Activity Hours Approved',
        message=REPLACE(message, 'submitted a', 'hours approved for')
    WHERE user_id=12 AND title='Activity Pending Review'
""")
print(f"Fixed Ahmed notifications: {db.rowcount} rows")

conn.commit()
conn.close()
print('Done.')
