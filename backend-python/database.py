import sqlite3
import os
import sys
import inspect
from contextlib import contextmanager

# Single source of truth: backend-python/data/altruism.db
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_THIS_FILE = os.path.abspath(__file__)
_DEFAULT_DB_PATH = os.path.join(_BACKEND_DIR, "data", "altruism.db")
DB_PATH = os.path.abspath(os.getenv("ALTRUISM_DB_PATH", _DEFAULT_DB_PATH))

# Guard: refuse to use a path outside backend-python/data — prevents stray
# SQLite files (e.g. backend-python/models/altruism.db) from being recreated
# if the working directory shifts or a relative path sneaks in.
_ALLOWED_DIR = os.path.join(_BACKEND_DIR, "data")
if not DB_PATH.startswith(_ALLOWED_DIR + os.sep) and DB_PATH != os.path.join(_ALLOWED_DIR, "altruism.db"):
    raise RuntimeError(
        f"Refusing to use database path outside backend-python/data/: {DB_PATH}. "
        f"Set ALTRUISM_DB_PATH only to a file inside {_ALLOWED_DIR}."
    )

print(f"[db] Using database at: {DB_PATH}", file=sys.stderr)


# ── Runtime safeguard: block direct sqlite3.connect from anywhere but database.py
# Any other module must use get_db() / get_connection() so the path guard above
# always applies and no stray .db files can be created.
_real_sqlite_connect = sqlite3.connect


def _guarded_sqlite_connect(*args, **kwargs):
    caller = inspect.stack()[1].filename
    if os.path.abspath(caller) != _THIS_FILE:
        raise RuntimeError(
            "Direct sqlite3.connect() is not allowed outside database.py. "
            "Use database.get_db() or database.get_connection() instead. "
            f"(called from {caller})"
        )
    return _real_sqlite_connect(*args, **kwargs)


sqlite3.connect = _guarded_sqlite_connect


def _ensure_dir():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def get_connection() -> sqlite3.Connection:
    _ensure_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    # Performance pragmas: WAL + NORMAL synchronous is the standard durable-but-fast
    # combo (still crash-safe; only loses last txn on power loss). Larger cache and
    # mmap reduce I/O for read-heavy routes (lists, joins, reports).
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA temp_store = MEMORY")
    conn.execute("PRAGMA cache_size = -20000")  # ~20 MB page cache
    conn.execute("PRAGMA mmap_size = 134217728")  # 128 MB memory-mapped reads
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

    # Extended volunteer profile fields
    new_vol_columns = [
        ("gender", "TEXT"),
        ("health_notes", "TEXT"),
        ("availability", "TEXT"),
        ("hours_per_week", "INTEGER DEFAULT 0"),
        ("languages", "TEXT"),
        ("education_level", "TEXT"),
        ("prior_experience", "INTEGER DEFAULT 0"),
        ("prior_org", "TEXT"),
        ("cause_areas", "TEXT"),
        ("nationality", "TEXT"),
        ("university_name", "TEXT"),
        ("faculty", "TEXT"),
        ("study_year", "TEXT"),
        ("field_of_study", "TEXT"),
        ("department", "TEXT"),
        ("experiences", "TEXT"),
    ]
    for col, ddl in new_vol_columns:
        try:
            conn.execute(f"ALTER TABLE volunteers ADD COLUMN {col} {ddl}")
        except Exception:
            pass

    # Organization approval workflow + enhanced registration fields
    org_extra_columns = [
        ("status", "TEXT DEFAULT 'approved'"),   # pending / approved / rejected
        ("rejection_reason", "TEXT"),
        ("org_type", "TEXT"),                    # NGO, company, student_activity, etc.
        ("official_email", "TEXT"),
        ("founded_year", "TEXT"),
        ("location", "TEXT"),                    # HQ governorate (legacy column name)
        ("social_links", "TEXT"),
        ("logo_url", "TEXT"),
        ("documents_url", "TEXT"),
        ("submitter_name", "TEXT"),
        ("submitter_role", "TEXT"),
        ("reviewed_at", "TEXT"),
        # Mirror of org-registration form (single source of truth with profile)
        ("org_size", "TEXT"),
        ("hq_city", "TEXT"),
        ("branches", "TEXT"),                    # JSON-encoded list of governorates
        ("categories", "TEXT"),                  # JSON-encoded list of category names
        ("additional_notes", "TEXT"),
    ]
    for col, ddl in org_extra_columns:
        try:
            conn.execute(f"ALTER TABLE organizations ADD COLUMN {col} {ddl}")
        except Exception:
            pass

    # Eligibility restriction: when 1, only current university students may apply.
    try:
        conn.execute("ALTER TABLE organizations ADD COLUMN student_only INTEGER NOT NULL DEFAULT 0")
    except Exception:
        pass

    # Certificate file upload support
    try:
        conn.execute("ALTER TABLE certificates ADD COLUMN file_url TEXT")
    except Exception:
        pass

    # Platform admins table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS platform_admins (
            user_id INTEGER PRIMARY KEY REFERENCES users(id),
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # Organization profile change requests — for sensitive fields (name, official_email)
    # that need platform-admin review before being applied.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS org_profile_change_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER NOT NULL REFERENCES organizations(id),
            requested_by INTEGER NOT NULL REFERENCES users(id),
            field TEXT NOT NULL,
            new_value TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
            created_at TEXT DEFAULT (datetime('now')),
            reviewed_at TEXT
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

    # Invite token columns for CSV-imported users (Phase 1 onboarding pipeline)
    for col, ddl in [("invite_token", "TEXT"), ("invite_expires_at", "TEXT")]:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {ddl}")
        except Exception:
            pass

    # Source tracking on org_volunteers
    try:
        conn.execute("ALTER TABLE org_volunteers ADD COLUMN source TEXT DEFAULT 'manual_import'")
    except Exception:
        pass

    # Analytics-ready join_source (ENUM: website | referral | campaign | other)
    # Separate from 'source' which tracks technical import method.
    try:
        conn.execute("ALTER TABLE org_volunteers ADD COLUMN join_source TEXT DEFAULT 'other'")
    except Exception:
        pass

    # Derived analytics flag: 1 when membership is Active, 0 for all other states.
    # Stored explicitly so Power BI can filter without a CASE expression.
    try:
        conn.execute("ALTER TABLE org_volunteers ADD COLUMN is_active INTEGER NOT NULL DEFAULT 0")
    except Exception:
        pass

    # Full UTC timestamp at join time — higher precision than the date-only joined_date.
    # Format: YYYY-MM-DDTHH:MM:SSZ (ISO 8601 UTC, Power BI compatible).
    # SQLite forbids non-constant defaults in ALTER TABLE ADD COLUMN, so we add
    # the column without a default and backfill existing rows.
    try:
        conn.execute("ALTER TABLE org_volunteers ADD COLUMN joined_at TEXT")
        conn.execute(
            "UPDATE org_volunteers SET joined_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') "
            "WHERE joined_at IS NULL"
        )
    except Exception:
        pass

    # Optional campaign detail — meaningful when join_source = 'campaign'.
    # Examples: facebook_ad, whatsapp, university_event
    try:
        conn.execute("ALTER TABLE org_volunteers ADD COLUMN channel_detail TEXT DEFAULT ''")
    except Exception:
        pass

    # Location snapshot at time of join — immutable, decoupled from mutable volunteer profile.
    try:
        conn.execute("ALTER TABLE org_volunteers ADD COLUMN governorate_snapshot TEXT DEFAULT ''")
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE org_volunteers ADD COLUMN city_snapshot TEXT DEFAULT ''")
    except Exception:
        pass

    # Manual volunteer addition tracking
    try:
        conn.execute("ALTER TABLE org_volunteers ADD COLUMN added_by_admin_id INTEGER")
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE org_volunteers ADD COLUMN notes TEXT DEFAULT ''")
    except Exception:
        pass

    # Lifecycle transition timestamps — applied_at = joined_date (when they applied)
    try:
        conn.execute("ALTER TABLE org_volunteers ADD COLUMN approved_at TEXT")
    except Exception:
        pass

    # Timestamp when an activity was reviewed (approved or rejected).
    # Required for days_to_review metric in the analytics star schema.
    try:
        conn.execute("ALTER TABLE activities ADD COLUMN reviewed_at TEXT")
    except Exception:
        pass

    # Role column on org_admins — future-ready for creator/admin distinction.
    # Existing rows default to 'admin'; registration path sets 'creator' explicitly.
    try:
        conn.execute("ALTER TABLE org_admins ADD COLUMN role TEXT DEFAULT 'admin'")
    except Exception:
        pass

    # Notifications table — in-app alerts for org admins.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            action_url TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    try:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)")
    except Exception:
        pass

    # ── Indexes ─────────────────────────────────────────────────────────────
    # SQLite does not auto-index foreign keys. Every FK used in a JOIN, WHERE,
    # or correlated subquery below was a full table scan before this block.
    # Composite indexes are ordered by selectivity / how the routes filter.
    index_ddls = [
        # users — auth lookups by token (CSV-import onboarding)
        "CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token)",

        # volunteers — every "who am I" lookup goes through user_id (already UNIQUE,
        # auto-indexed). Status filter is used on admin listings.
        "CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status)",

        # supervisors — same pattern as volunteers
        "CREATE INDEX IF NOT EXISTS idx_supervisors_org_id ON supervisors(org_id)",

        # organizations — admin lookup + approval-queue filter
        "CREATE INDEX IF NOT EXISTS idx_organizations_admin_user_id ON organizations(admin_user_id)",
        "CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status)",

        # org_volunteers — central join hub. UNIQUE(org_id,volunteer_id) covers
        # org_id-leading queries; add the reverse and supervisor indexes.
        "CREATE INDEX IF NOT EXISTS idx_org_volunteers_volunteer_id ON org_volunteers(volunteer_id)",
        "CREATE INDEX IF NOT EXISTS idx_org_volunteers_supervisor_id ON org_volunteers(supervisor_id)",
        "CREATE INDEX IF NOT EXISTS idx_org_volunteers_org_status ON org_volunteers(org_id, status)",

        # events — listed/filtered by org + status, ordered by date
        "CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id)",
        "CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, date)",

        # activities — heaviest read path (volunteer history, supervisor queue, reports)
        "CREATE INDEX IF NOT EXISTS idx_activities_volunteer_id ON activities(volunteer_id, date DESC)",
        "CREATE INDEX IF NOT EXISTS idx_activities_event_id ON activities(event_id)",
        "CREATE INDEX IF NOT EXISTS idx_activities_org_status ON activities(org_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_activities_reviewed_by ON activities(reviewed_by)",

        # certificates — fetched by volunteer (profile) and by org (admin reports)
        "CREATE INDEX IF NOT EXISTS idx_certificates_volunteer_id ON certificates(volunteer_id)",
        "CREATE INDEX IF NOT EXISTS idx_certificates_org_id ON certificates(org_id)",
        "CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON certificates(event_id)",

        # event_applications — listed per volunteer, per event, per org
        "CREATE INDEX IF NOT EXISTS idx_event_applications_volunteer_id ON event_applications(volunteer_id)",
        "CREATE INDEX IF NOT EXISTS idx_event_applications_event_status ON event_applications(event_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_event_applications_org_id ON event_applications(org_id)",

        # announcements — per-org feed, newest first
        "CREATE INDEX IF NOT EXISTS idx_announcements_org_created ON announcements(org_id, created_at DESC)",

        # org_admins — UNIQUE(user_id,org_id) already indexes (user_id, org_id);
        # add the reverse for "who admins this org" lookups.
        "CREATE INDEX IF NOT EXISTS idx_org_admins_org_id ON org_admins(org_id)",

        # org_profile_change_requests — admin queue filtered by status, then org
        "CREATE INDEX IF NOT EXISTS idx_org_profile_change_requests_status ON org_profile_change_requests(status, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_org_profile_change_requests_org_id ON org_profile_change_requests(org_id)",

        # notifications — unread badge counts query (user_id, is_read)
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC)",
    ]
    for ddl in index_ddls:
        try:
            conn.execute(ddl)
        except Exception:
            pass

    # ANALYZE lets the query planner pick the right index when multiple cover a query.
    try:
        conn.execute("ANALYZE")
    except Exception:
        pass

    conn.commit()
    conn.close()
