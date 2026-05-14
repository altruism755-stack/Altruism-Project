"""
database.py — PostgreSQL connection layer for the Altruism platform.

  get_db()         — context manager, yields a pooled psycopg connection, auto-commits on exit
  exclusive_db()   — SERIALIZABLE transaction with automatic SerializationFailure retry (3 attempts)
  get_connection() — borrow a raw connection from the pool (use sparingly; prefer get_db)
  dict_row()       — convert one Row → dict | None
  dict_rows()      — convert list[Row] → list[dict]
  init_schema()    — idempotent: creates tables/indexes that don't yet exist (no drops)
  open_pool()      — open the connection pool (called once at startup via lifespan)
  close_pool()     — drain the pool (called at shutdown via lifespan)

Connection configuration is driven entirely by environment variables — no hardcoded defaults.
"""

import os
import sys
import time
import urllib.parse
from contextlib import contextmanager

import psycopg
import psycopg.errors
from psycopg.rows import dict_row as _psycopg_dict_row
from psycopg_pool import ConnectionPool
from fastapi import HTTPException

# ── DSN / connection string ───────────────────────────────────────────────────
# Prefer DATABASE_URL (standard Heroku/Railway/Render style).
# Fall back to individual PG* variables for local dev.
_DATABASE_URL = os.getenv("DATABASE_URL")

if not _DATABASE_URL:
    _PG_HOST = os.getenv("PGHOST", "localhost")
    _PG_PORT = os.getenv("PGPORT", "5432")
    _PG_DB   = os.getenv("PGDATABASE", "altruism")
    _PG_USER = os.getenv("PGUSER", "postgres")
    _PG_PASS = os.getenv("PGPASSWORD", "")
    _DATABASE_URL = (
        f"postgresql://{_PG_USER}:{_PG_PASS}@{_PG_HOST}:{_PG_PORT}/{_PG_DB}"
    )

_parsed = urllib.parse.urlparse(_DATABASE_URL)
print(f"[db] Connecting to PostgreSQL at {_parsed.hostname}:{_parsed.port}/{_parsed.path.lstrip('/')}", file=sys.stderr)

# ── Connection pool ───────────────────────────────────────────────────────────
_pool: ConnectionPool | None = None


def open_pool() -> None:
    """Open the connection pool. Called once at application startup."""
    global _pool
    _pool = ConnectionPool(
        _DATABASE_URL,
        min_size=2,
        max_size=10,
        kwargs={"row_factory": _psycopg_dict_row},
        open=True,
    )
    print("[db] Connection pool opened (min=2, max=10)", file=sys.stderr)


def close_pool() -> None:
    """Close the connection pool. Called at application shutdown."""
    global _pool
    if _pool:
        _pool.close()
        _pool = None


# ── Connection factory ────────────────────────────────────────────────────────

def get_connection() -> psycopg.Connection:
    """
    Borrow a connection from the pool (or open a raw connection during init_schema
    before the pool is available). Autocommit is OFF.
    Use get_db() or exclusive_db() context managers in application code.
    """
    if _pool is not None:
        # Returns a connection from the pool; caller must close() to return it.
        return _pool.getconn()
    return psycopg.connect(_DATABASE_URL, row_factory=_psycopg_dict_row)


def _return_connection(conn: psycopg.Connection) -> None:
    """Return a connection to the pool, or close it if the pool is not running."""
    if _pool is not None:
        _pool.putconn(conn)
    else:
        conn.close()


@contextmanager
def get_db():
    """
    Standard read/write context manager.
    Commits on clean exit, rolls back on any exception.
    """
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _return_connection(conn)



@contextmanager
def exclusive_db():
    """
    SERIALIZABLE transaction with automatic retry on SerializationFailure
    (up to 3 attempts, exponential back-off).

    Used for capacity-enforcement paths: apply_to_event, approve_application,
    cancel_application, promote_waitlisted, reject_application.
    """
    max_retries = 3
    for attempt in range(max_retries):
        conn = get_connection()
        try:
            conn.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
            yield conn
            conn.commit()
            _return_connection(conn)
            return
        except psycopg.errors.SerializationFailure:
            conn.rollback()
            _return_connection(conn)
            if attempt < max_retries - 1:
                time.sleep(0.05 * (2 ** attempt))
        except Exception:
            conn.rollback()
            _return_connection(conn)
            raise
    raise HTTPException(503, "Server busy, please try again")


# ── Row helpers ───────────────────────────────────────────────────────────────
# psycopg dict_row already returns plain dicts, so these are now trivial
# pass-throughs that preserve the call signature used throughout route files.

def dict_row(row) -> dict | None:
    """Return row as dict, or None if row is None. Identical signature to old SQLite helper."""
    return row  # psycopg dict_row factory already returns dict | None


def dict_rows(rows: list) -> list[dict]:
    """Return list of rows as list[dict]. Identical signature to old SQLite helper."""
    return list(rows)


# ── Schema initialisation ─────────────────────────────────────────────────────
# All statements are idempotent (IF NOT EXISTS / DO NOTHING).
# Column additions use DO $$ ... IF NOT EXISTS $$ blocks so re-runs are safe.
# No tables are ever dropped here — use numbered migration files for destructive changes.


def init_schema():
    """
    Create all tables, indexes, and constraints that don't yet exist.
    Safe to call on every application startup.
    Reflects the clean schema after migration 007.
    """
    conn = get_connection()
    try:
        # ── 1. Users ──────────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id         SERIAL PRIMARY KEY,
                email      TEXT UNIQUE NOT NULL,
                password   TEXT NOT NULL,
                role       TEXT NOT NULL CHECK (role IN (
                               'volunteer','supervisor','org_admin','platform_admin'
                           )),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # ── 2. Organizations ──────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS organizations (
                id               SERIAL PRIMARY KEY,
                name             TEXT NOT NULL,
                description      TEXT,
                official_email   TEXT,
                org_type         TEXT,
                org_size         TEXT,
                founded_year     TEXT,
                hq_city          TEXT,
                branches         JSONB,
                categories       JSONB,
                website          TEXT,
                phone            TEXT,
                social_links     TEXT,
                logo_url         TEXT,
                documents_url    TEXT,
                submitter_name   TEXT,
                submitter_role   TEXT,
                additional_notes TEXT,
                student_only     BOOLEAN NOT NULL DEFAULT FALSE,
                tracks_hours     BOOLEAN NOT NULL DEFAULT TRUE,
                status           TEXT NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending','approved','rejected')),
                rejection_reason TEXT,
                reviewed_at      TIMESTAMPTZ,
                admin_user_id    INTEGER REFERENCES users(id),
                created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # ── 3. Org admins ─────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS org_admins (
                id         SERIAL PRIMARY KEY,
                user_id    INTEGER NOT NULL REFERENCES users(id),
                org_id     INTEGER NOT NULL REFERENCES organizations(id),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (user_id, org_id)
            )
        """)

        # ── 4. Supervisors ────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS supervisors (
                id         SERIAL PRIMARY KEY,
                user_id    INTEGER UNIQUE NOT NULL REFERENCES users(id),
                name       TEXT NOT NULL,
                phone      TEXT,
                team       TEXT,
                org_id     INTEGER NOT NULL REFERENCES organizations(id),
                status     TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('active','pending')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # ── 5. Volunteers ─────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS volunteers (
                id               SERIAL PRIMARY KEY,
                user_id          INTEGER UNIQUE NOT NULL REFERENCES users(id),
                name             TEXT NOT NULL,
                phone            TEXT,
                city             TEXT,
                governorate      TEXT,
                nationality      TEXT,
                gender           TEXT,
                date_of_birth    DATE,
                national_id      TEXT,
                profile_picture  TEXT,
                health_notes     TEXT,
                about_me         TEXT,
                hours_per_week   INTEGER DEFAULT 0,
                education_level  TEXT,
                university_name  TEXT,
                faculty          TEXT,
                study_year       TEXT,
                field_of_study   TEXT,
                department       TEXT,
                prior_experience INTEGER DEFAULT 0,
                prior_org        TEXT,
                status           TEXT NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('active','pending','suspended')),
                created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # ── 5a. Volunteer attribute lookup tables ─────────────────────────────
        # These replace the JSONB array columns for a clean normalized ERD.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS volunteer_skills (
                id           SERIAL PRIMARY KEY,
                volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
                skill        TEXT NOT NULL,
                UNIQUE (volunteer_id, skill)
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS volunteer_languages (
                id           SERIAL PRIMARY KEY,
                volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
                language     TEXT NOT NULL,
                UNIQUE (volunteer_id, language)
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS volunteer_cause_areas (
                id           SERIAL PRIMARY KEY,
                volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
                cause_area   TEXT NOT NULL,
                UNIQUE (volunteer_id, cause_area)
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS volunteer_experiences (
                id           SERIAL PRIMARY KEY,
                volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
                title        TEXT NOT NULL,
                organization TEXT,
                description  TEXT,
                start_date   DATE,
                end_date     DATE
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS volunteer_availability (
                id           SERIAL PRIMARY KEY,
                volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
                day_of_week  TEXT NOT NULL,
                time_slot    TEXT NOT NULL,
                UNIQUE (volunteer_id, day_of_week, time_slot)
            )
        """)

        # ── 6. Org–Volunteer membership ───────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS org_volunteers (
                id                SERIAL PRIMARY KEY,
                org_id            INTEGER NOT NULL REFERENCES organizations(id),
                volunteer_id      INTEGER NOT NULL REFERENCES volunteers(id),
                department        TEXT,
                status            TEXT NOT NULL DEFAULT 'pending'
                                      CHECK (status IN ('active','pending','inactive','rejected')),
                join_source       TEXT DEFAULT 'other',
                joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                added_by_admin_id INTEGER REFERENCES users(id),
                notes             TEXT,
                approved_at       TIMESTAMPTZ,
                UNIQUE (org_id, volunteer_id)
            )
        """)

        # ── 7. Events ─────────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id                       SERIAL PRIMARY KEY,
                org_id                   INTEGER REFERENCES organizations(id),
                created_by_supervisor_id INTEGER REFERENCES supervisors(id) ON DELETE SET NULL,
                name                     TEXT NOT NULL,
                description              TEXT,
                location                 TEXT,
                starts_at                TIMESTAMPTZ NOT NULL,
                duration                 REAL,
                max_volunteers           INTEGER,
                required_skills          TEXT,
                acceptance_mode          TEXT NOT NULL DEFAULT 'manual',
                registration_open        BOOLEAN NOT NULL DEFAULT TRUE,
                status                   TEXT NOT NULL DEFAULT 'upcoming'
                                             CHECK (status IN ('upcoming','active','completed')),
                created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # ── 8. Event applications ─────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS event_applications (
                id                SERIAL PRIMARY KEY,
                volunteer_id      INTEGER NOT NULL REFERENCES volunteers(id),
                event_id          INTEGER NOT NULL REFERENCES events(id),
                status            TEXT NOT NULL DEFAULT 'pending'
                                      CHECK (status IN ('pending','approved','rejected','waitlisted')),
                attendance_status TEXT CHECK (attendance_status IN ('attended','absent')),
                created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                cancelled_at      TIMESTAMPTZ
            )
        """)

        # ── 9. Activities ─────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id           SERIAL PRIMARY KEY,
                volunteer_id INTEGER NOT NULL REFERENCES volunteers(id),
                event_id     INTEGER REFERENCES events(id),
                org_id       INTEGER NOT NULL REFERENCES organizations(id),
                date         DATE NOT NULL,
                hours        REAL,
                description  TEXT,
                status       TEXT NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','approved','rejected','completed')),
                reviewed_by  INTEGER REFERENCES supervisors(id),
                reviewed_at  TIMESTAMPTZ,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # ── 10. Certificates ──────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS certificates (
                id                SERIAL PRIMARY KEY,
                volunteer_id      INTEGER NOT NULL REFERENCES volunteers(id),
                org_id            INTEGER NOT NULL REFERENCES organizations(id),
                event_id          INTEGER REFERENCES events(id),
                type              TEXT CHECK (type IN ('participation','achievement','completion')),
                certificate_title TEXT,
                hours             REAL,
                issued_date       DATE NOT NULL DEFAULT CURRENT_DATE,
                file_url          TEXT,
                created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # ── 11. Event ratings ─────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS event_ratings (
                id           SERIAL PRIMARY KEY,
                event_id     INTEGER NOT NULL REFERENCES events(id),
                volunteer_id INTEGER NOT NULL REFERENCES volunteers(id),
                rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
                feedback     TEXT,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (event_id, volunteer_id)
            )
        """)

        # ── 12. Announcements ─────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS announcements (
                id         SERIAL PRIMARY KEY,
                org_id     INTEGER REFERENCES organizations(id),
                title      TEXT NOT NULL,
                content    TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # ── 13. Notifications ─────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id         SERIAL PRIMARY KEY,
                user_id    INTEGER NOT NULL REFERENCES users(id),
                type       TEXT NOT NULL,
                title      TEXT NOT NULL,
                message    TEXT NOT NULL,
                is_read    BOOLEAN NOT NULL DEFAULT FALSE,
                action_url TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # ── 14. Org profile change requests ───────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS org_profile_change_requests (
                id           SERIAL PRIMARY KEY,
                org_id       INTEGER NOT NULL REFERENCES organizations(id),
                requested_by INTEGER NOT NULL REFERENCES users(id),
                changes      JSONB NOT NULL,
                status       TEXT NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','approved','rejected')),
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                reviewed_at  TIMESTAMPTZ
            )
        """)

        # ── 15. Audit logs ────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id          SERIAL PRIMARY KEY,
                actor_id    INTEGER REFERENCES users(id),
                actor_role  TEXT,
                action      TEXT NOT NULL,
                entity_type TEXT,
                entity_id   INTEGER,
                metadata    JSONB,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # ── View: approved volunteer count per event ──────────────────────────
        conn.execute("""
            CREATE OR REPLACE VIEW event_volunteer_counts AS
            SELECT
                event_id,
                COUNT(*) AS current_volunteers
            FROM event_applications
            WHERE status = 'approved'
              AND cancelled_at IS NULL
            GROUP BY event_id
        """)

        # ── Indexes ───────────────────────────────────────────────────────────
        index_ddls = [
            # users
            "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
            # organizations
            "CREATE INDEX IF NOT EXISTS idx_organizations_status        ON organizations(status)",
            "CREATE INDEX IF NOT EXISTS idx_organizations_admin_user_id ON organizations(admin_user_id)",
            # org_admins
            "CREATE INDEX IF NOT EXISTS idx_org_admins_org_id  ON org_admins(org_id)",
            "CREATE INDEX IF NOT EXISTS idx_org_admins_user_id ON org_admins(user_id)",
            # supervisors
            "CREATE INDEX IF NOT EXISTS idx_supervisors_org_id ON supervisors(org_id)",
            # volunteers
            "CREATE INDEX IF NOT EXISTS idx_volunteers_user_id ON volunteers(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_volunteers_status  ON volunteers(status)",
            # volunteer attributes
            "CREATE INDEX IF NOT EXISTS idx_vol_skills_volunteer_id      ON volunteer_skills(volunteer_id)",
            "CREATE INDEX IF NOT EXISTS idx_vol_languages_volunteer_id   ON volunteer_languages(volunteer_id)",
            "CREATE INDEX IF NOT EXISTS idx_vol_cause_areas_volunteer_id ON volunteer_cause_areas(volunteer_id)",
            "CREATE INDEX IF NOT EXISTS idx_vol_experiences_volunteer_id ON volunteer_experiences(volunteer_id)",
            "CREATE INDEX IF NOT EXISTS idx_vol_availability_volunteer_id ON volunteer_availability(volunteer_id)",
            # org_volunteers
            "CREATE INDEX IF NOT EXISTS idx_org_volunteers_volunteer_id ON org_volunteers(volunteer_id)",
            "CREATE INDEX IF NOT EXISTS idx_org_volunteers_org_status   ON org_volunteers(org_id, status)",
            # events
            "CREATE INDEX IF NOT EXISTS idx_events_org_id           ON events(org_id)",
            "CREATE INDEX IF NOT EXISTS idx_events_supervisor        ON events(created_by_supervisor_id)",
            "CREATE INDEX IF NOT EXISTS idx_events_status_starts_at  ON events(status, starts_at)",
            # event_applications
            "CREATE INDEX IF NOT EXISTS idx_event_applications_volunteer    ON event_applications(volunteer_id)",
            "CREATE INDEX IF NOT EXISTS idx_event_applications_event_status ON event_applications(event_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_event_applications_waitlist     ON event_applications(event_id, status, created_at)",
            "CREATE INDEX IF NOT EXISTS idx_event_applications_attendance   ON event_applications(event_id, attendance_status) WHERE cancelled_at IS NULL",
            # activities
            "CREATE INDEX IF NOT EXISTS idx_activities_volunteer_date ON activities(volunteer_id, date DESC)",
            "CREATE INDEX IF NOT EXISTS idx_activities_event_id       ON activities(event_id)",
            "CREATE INDEX IF NOT EXISTS idx_activities_org_status     ON activities(org_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_activities_reviewed_by    ON activities(reviewed_by)",
            "CREATE INDEX IF NOT EXISTS idx_activities_vol_status_org ON activities(volunteer_id, status, org_id)",
            # certificates
            "CREATE INDEX IF NOT EXISTS idx_certificates_volunteer_id ON certificates(volunteer_id)",
            "CREATE INDEX IF NOT EXISTS idx_certificates_org_id       ON certificates(org_id)",
            "CREATE INDEX IF NOT EXISTS idx_certificates_event_id     ON certificates(event_id)",
            # event_ratings
            "CREATE INDEX IF NOT EXISTS idx_event_ratings_event_id ON event_ratings(event_id)",
            # announcements
            "CREATE INDEX IF NOT EXISTS idx_announcements_org_created ON announcements(org_id, created_at DESC)",
            # notifications
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC)",
            # org_profile_change_requests
            "CREATE INDEX IF NOT EXISTS idx_org_change_requests_org_id ON org_profile_change_requests(org_id)",
            "CREATE INDEX IF NOT EXISTS idx_org_change_requests_status ON org_profile_change_requests(status, created_at DESC)",
            # audit_logs
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_actor  ON audit_logs(actor_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC)",
        ]
        for ddl in index_ddls:
            conn.execute(ddl)

        # Partial unique indexes
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_unique_vol_event
            ON activities(volunteer_id, event_id)
            WHERE event_id IS NOT NULL
        """)
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_event_applications_active
            ON event_applications(volunteer_id, event_id)
            WHERE cancelled_at IS NULL
        """)
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_no_dup_event
            ON certificates(volunteer_id, org_id, event_id, certificate_title)
            WHERE event_id IS NOT NULL
        """)
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_no_dup_adhoc
            ON certificates(volunteer_id, org_id, certificate_title)
            WHERE event_id IS NULL
        """)

        conn.execute("ANALYZE")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
