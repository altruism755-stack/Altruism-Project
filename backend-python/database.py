import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "models", "altruism.db")


def _ensure_dir():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def get_connection() -> sqlite3.Connection:
    _ensure_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def dict_row(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None
    return dict(row)


def dict_rows(rows: list) -> list[dict]:
    return [dict(r) for r in rows]


def init_schema():
    _ensure_dir()
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('volunteer','supervisor','org_admin')),
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            color TEXT DEFAULT '#16A34A',
            secondary_color TEXT DEFAULT '#22C55E',
            initials TEXT,
            founded TEXT,
            website TEXT,
            phone TEXT,
            admin_user_id INTEGER REFERENCES users(id),
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS volunteers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE REFERENCES users(id),
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            city TEXT,
            skills TEXT,
            about_me TEXT,
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Active','Pending','Suspended')),
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS supervisors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE REFERENCES users(id),
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            team TEXT,
            org_id INTEGER REFERENCES organizations(id),
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Active','Pending')),
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS org_volunteers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER REFERENCES organizations(id),
            volunteer_id INTEGER REFERENCES volunteers(id),
            supervisor_id INTEGER REFERENCES supervisors(id),
            department TEXT,
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Active','Pending','Inactive')),
            joined_date TEXT DEFAULT (date('now')),
            UNIQUE(org_id, volunteer_id)
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER REFERENCES organizations(id),
            name TEXT NOT NULL,
            description TEXT,
            location TEXT,
            date TEXT NOT NULL,
            time TEXT,
            duration REAL,
            max_volunteers INTEGER,
            current_volunteers INTEGER DEFAULT 0,
            required_skills TEXT,
            status TEXT DEFAULT 'Upcoming' CHECK(status IN ('Upcoming','Active','Completed')),
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            volunteer_id INTEGER REFERENCES volunteers(id),
            event_id INTEGER REFERENCES events(id),
            org_id INTEGER REFERENCES organizations(id),
            date TEXT NOT NULL,
            hours REAL NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')),
            reviewed_by INTEGER REFERENCES supervisors(id),
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            volunteer_id INTEGER REFERENCES volunteers(id),
            org_id INTEGER REFERENCES organizations(id),
            event_id INTEGER REFERENCES events(id),
            type TEXT CHECK(type IN ('Participation','Achievement','Completion')),
            hours REAL,
            issued_date TEXT DEFAULT (date('now')),
            created_at TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()
