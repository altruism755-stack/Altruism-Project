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

        CREATE TABLE IF NOT EXISTS event_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            volunteer_id INTEGER REFERENCES volunteers(id),
            event_id INTEGER REFERENCES events(id),
            org_id INTEGER REFERENCES organizations(id),
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')),
            applied_date TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER REFERENCES organizations(id),
            title TEXT NOT NULL,
            content TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
    """)

    # Add new columns to volunteers if they don't exist
    try:
        conn.execute("ALTER TABLE volunteers ADD COLUMN date_of_birth TEXT")
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE volunteers ADD COLUMN governorate TEXT")
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE volunteers ADD COLUMN profile_picture TEXT")
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE volunteers ADD COLUMN national_id TEXT")
    except Exception:
        pass

    # Organization approval workflow + enhanced registration fields
    org_extra_columns = [
        ("status", "TEXT DEFAULT 'approved'"),   # pending / approved / rejected
        ("rejection_reason", "TEXT"),
        ("org_type", "TEXT"),                    # NGO, company, student_activity, etc.
        ("official_email", "TEXT"),
        ("founded_year", "TEXT"),
        ("location", "TEXT"),                    # city / governorate
        ("social_links", "TEXT"),
        ("logo_url", "TEXT"),
        ("documents_url", "TEXT"),
        ("submitter_name", "TEXT"),
        ("submitter_role", "TEXT"),
        ("reviewed_at", "TEXT"),
    ]
    for col, ddl in org_extra_columns:
        try:
            conn.execute(f"ALTER TABLE organizations ADD COLUMN {col} {ddl}")
        except Exception:
            pass

    # Platform admins table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS platform_admins (
            user_id INTEGER PRIMARY KEY REFERENCES users(id),
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # Organization admins table — scoped per org, managed by org owners & platform admins
    # Migration: if old schema (user_id PK, no org_id) exists, recreate it
    _cols = {row[1] for row in conn.execute("PRAGMA table_info(org_admins)").fetchall()}
    if _cols and "org_id" not in _cols:
        conn.execute("DROP TABLE org_admins")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS org_admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            org_id INTEGER NOT NULL REFERENCES organizations(id),
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(user_id, org_id)
        )
    """)

    conn.commit()
    conn.close()
