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

def _col_exists(conn, table: str, column: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = %s AND column_name = %s",
        (table, column),
    ).fetchone()
    return row is not None


def _add_column_if_missing(conn, table: str, column: str, ddl: str) -> None:
    if not _col_exists(conn, table, column):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")


def init_schema():
    """
    Create all tables, indexes, and constraints that don't yet exist.
    Safe to call on every application startup.
    """
    conn = get_connection()
    try:
        # ── Core tables ───────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id          SERIAL PRIMARY KEY,
                email       TEXT UNIQUE NOT NULL,
                password    TEXT NOT NULL,
                role        TEXT NOT NULL CHECK(role IN ('volunteer','supervisor','org_admin')),
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS organizations (
                id               SERIAL PRIMARY KEY,
                name             TEXT NOT NULL,
                description      TEXT,
                category         TEXT,
                color            TEXT DEFAULT '#16A34A',
                secondary_color  TEXT DEFAULT '#22C55E',
                initials         TEXT,
                founded          TEXT,
                website          TEXT,
                phone            TEXT,
                admin_user_id    INTEGER REFERENCES users(id),
                status           TEXT DEFAULT 'approved',
                rejection_reason TEXT,
                org_type         TEXT,
                official_email   TEXT,
                founded_year     TEXT,
                location         TEXT,
                social_links     TEXT,
                logo_url         TEXT,
                documents_url    TEXT,
                submitter_name   TEXT,
                submitter_role   TEXT,
                reviewed_at      TIMESTAMPTZ,
                org_size         TEXT,
                hq_city          TEXT,
                branches         TEXT,
                categories       TEXT,
                additional_notes TEXT,
                student_only     BOOLEAN NOT NULL DEFAULT FALSE,
                tracks_hours     BOOLEAN NOT NULL DEFAULT TRUE,
                created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS volunteers (
                id          SERIAL PRIMARY KEY,
                user_id     INTEGER UNIQUE REFERENCES users(id),
                name        TEXT NOT NULL,
                email       TEXT NOT NULL,
                phone       TEXT,
                city        TEXT,
                skills      TEXT,
                about_me    TEXT,
                status      TEXT DEFAULT 'Pending' CHECK(status IN ('Active','Pending','Suspended')),
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS supervisors (
                id          SERIAL PRIMARY KEY,
                user_id     INTEGER UNIQUE REFERENCES users(id),
                name        TEXT NOT NULL,
                email       TEXT NOT NULL,
                phone       TEXT,
                team        TEXT,
                org_id      INTEGER NOT NULL REFERENCES organizations(id),
                status      TEXT DEFAULT 'Pending' CHECK(status IN ('Active','Pending')),
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS org_volunteers (
                id                   SERIAL PRIMARY KEY,
                org_id               INTEGER NOT NULL REFERENCES organizations(id),
                volunteer_id         INTEGER NOT NULL REFERENCES volunteers(id),
                department           TEXT,
                status               TEXT DEFAULT 'Pending'
                                         CHECK(status IN ('Active','Pending','Inactive','Rejected')),
                joined_date          DATE NOT NULL DEFAULT CURRENT_DATE,
                source               TEXT DEFAULT 'manual_import',
                join_source          TEXT DEFAULT 'other',
                is_active            INTEGER NOT NULL DEFAULT 0,
                joined_at            TIMESTAMPTZ DEFAULT NOW(),
                channel_detail       TEXT DEFAULT '',
                governorate_snapshot TEXT DEFAULT '',
                city_snapshot        TEXT DEFAULT '',
                added_by_admin_id    INTEGER,
                notes                TEXT DEFAULT '',
                approved_at          TIMESTAMPTZ,
                UNIQUE(org_id, volunteer_id)
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id                  SERIAL PRIMARY KEY,
                org_id              INTEGER REFERENCES organizations(id),
                name                TEXT NOT NULL,
                description         TEXT,
                location            TEXT,
                date                DATE NOT NULL,
                time                TEXT,
                duration            REAL,
                max_volunteers      INTEGER,
                current_volunteers  INTEGER DEFAULT 0,
                required_skills     TEXT,
                status              TEXT DEFAULT 'Upcoming'
                                        CHECK(status IN ('Upcoming','Active','Completed')),
                acceptance_mode     TEXT NOT NULL DEFAULT 'manual',
                registration_open   BOOLEAN NOT NULL DEFAULT TRUE,
                created_by_supervisor_id INTEGER REFERENCES supervisors(id) ON DELETE SET NULL,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id            SERIAL PRIMARY KEY,
                volunteer_id  INTEGER NOT NULL REFERENCES volunteers(id),
                event_id      INTEGER REFERENCES events(id),
                org_id        INTEGER NOT NULL REFERENCES organizations(id),
                date          DATE NOT NULL,
                hours         REAL,
                description   TEXT,
                status        TEXT DEFAULT 'Pending'
                                  CHECK(status IN ('Pending','Approved','Rejected','Completed')),
                reviewed_by   INTEGER REFERENCES supervisors(id),
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                reviewed_at   TIMESTAMPTZ
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS certificates (
                id                  SERIAL PRIMARY KEY,
                volunteer_id        INTEGER REFERENCES volunteers(id),
                org_id              INTEGER REFERENCES organizations(id),
                event_id            INTEGER REFERENCES events(id),
                type                TEXT CHECK(type IN ('Participation','Achievement','Completion')),
                certificate_title   TEXT,
                hours               REAL,
                issued_date         DATE NOT NULL DEFAULT CURRENT_DATE,
                file_url            TEXT,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS event_applications (
                id             SERIAL PRIMARY KEY,
                volunteer_id   INTEGER NOT NULL REFERENCES volunteers(id),
                event_id       INTEGER NOT NULL REFERENCES events(id),
                org_id         INTEGER NOT NULL REFERENCES organizations(id),
                status             TEXT DEFAULT 'Pending'
                                       CHECK(status IN ('Pending','Approved','Rejected','Waitlisted')),
                attendance_status  TEXT CHECK(attendance_status IN ('Attended','Absent')),
                applied_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                cancelled_at       TIMESTAMPTZ
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS announcements (
                id          SERIAL PRIMARY KEY,
                org_id      INTEGER REFERENCES organizations(id),
                title       TEXT NOT NULL,
                content     TEXT,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS platform_admins (
                user_id     INTEGER PRIMARY KEY REFERENCES users(id),
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS org_profile_change_requests (
                id            SERIAL PRIMARY KEY,
                org_id        INTEGER NOT NULL REFERENCES organizations(id),
                requested_by  INTEGER NOT NULL REFERENCES users(id),
                field         TEXT NOT NULL,
                new_value     TEXT,
                status        TEXT NOT NULL DEFAULT 'pending'
                                  CHECK(status IN ('pending','approved','rejected')),
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                reviewed_at   TIMESTAMPTZ
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS org_admins (
                id          SERIAL PRIMARY KEY,
                user_id     INTEGER NOT NULL REFERENCES users(id),
                org_id      INTEGER NOT NULL REFERENCES organizations(id),
                role        TEXT NOT NULL DEFAULT 'admin',
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(user_id, org_id)
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id          SERIAL PRIMARY KEY,
                user_id     INTEGER NOT NULL REFERENCES users(id),
                type        TEXT NOT NULL,
                title       TEXT NOT NULL,
                message     TEXT NOT NULL,
                is_read     BOOLEAN NOT NULL DEFAULT FALSE,
                action_url  TEXT,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id           SERIAL PRIMARY KEY,
                actor_id     INTEGER REFERENCES users(id),
                actor_role   TEXT,
                action       TEXT NOT NULL,
                entity_type  TEXT,
                entity_id    INTEGER,
                metadata     JSONB,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS event_ratings (
                id            SERIAL PRIMARY KEY,
                event_id      INTEGER NOT NULL REFERENCES events(id),
                volunteer_id  INTEGER NOT NULL REFERENCES volunteers(id),
                rating        INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                feedback      TEXT,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(event_id, volunteer_id)
            )
        """)

        # ── Optional columns added over time (idempotent) ─────────────────────
        # volunteers
        for col, ddl in [
            ("date_of_birth",    "TEXT"),
            ("governorate",      "TEXT"),
            ("profile_picture",  "TEXT"),
            ("national_id",      "TEXT"),
            ("gender",           "TEXT"),
            ("health_notes",     "TEXT"),
            ("availability",     "TEXT"),
            ("hours_per_week",   "INTEGER DEFAULT 0"),
            ("languages",        "TEXT"),
            ("education_level",  "TEXT"),
            ("prior_experience", "INTEGER DEFAULT 0"),
            ("prior_org",        "TEXT"),
            ("cause_areas",      "TEXT"),
            ("nationality",      "TEXT"),
            ("university_name",  "TEXT"),
            ("faculty",          "TEXT"),
            ("study_year",       "TEXT"),
            ("field_of_study",   "TEXT"),
            ("department",       "TEXT"),
            ("experiences",      "TEXT"),
        ]:
            _add_column_if_missing(conn, "volunteers", col, ddl)

        # organizations
        for col, ddl in [
            ("status",            "TEXT DEFAULT 'approved'"),
            ("rejection_reason",  "TEXT"),
            ("org_type",          "TEXT"),
            ("official_email",    "TEXT"),
            ("founded_year",      "TEXT"),
            ("location",          "TEXT"),
            ("social_links",      "TEXT"),
            ("logo_url",          "TEXT"),
            ("documents_url",     "TEXT"),
            ("submitter_name",    "TEXT"),
            ("submitter_role",    "TEXT"),
            ("reviewed_at",       "TIMESTAMPTZ"),
            ("org_size",          "TEXT"),
            ("hq_city",           "TEXT"),
            ("branches",          "TEXT"),
            ("categories",        "TEXT"),
            ("additional_notes",  "TEXT"),
            ("student_only",      "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("tracks_hours",      "BOOLEAN NOT NULL DEFAULT TRUE"),
        ]:
            _add_column_if_missing(conn, "organizations", col, ddl)

        # users
        for col, ddl in [
            ("invite_token",      "TEXT"),
            ("invite_expires_at", "TIMESTAMPTZ"),
        ]:
            _add_column_if_missing(conn, "users", col, ddl)

        # org_volunteers
        for col, ddl in [
            ("source",                "TEXT DEFAULT 'manual_import'"),
            ("join_source",           "TEXT DEFAULT 'other'"),
            ("is_active",             "INTEGER NOT NULL DEFAULT 0"),
            ("joined_at",             "TIMESTAMPTZ DEFAULT NOW()"),
            ("channel_detail",        "TEXT DEFAULT ''"),
            ("governorate_snapshot",  "TEXT DEFAULT ''"),
            ("city_snapshot",         "TEXT DEFAULT ''"),
            ("added_by_admin_id",     "INTEGER"),
            ("notes",                 "TEXT DEFAULT ''"),
            ("approved_at",           "TIMESTAMPTZ"),
        ]:
            _add_column_if_missing(conn, "org_volunteers", col, ddl)

        # ── Indexes ───────────────────────────────────────────────────────────
        index_ddls = [
            "CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token)",
            "CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status)",
            "CREATE INDEX IF NOT EXISTS idx_supervisors_org_id ON supervisors(org_id)",
            "CREATE INDEX IF NOT EXISTS idx_organizations_admin_user_id ON organizations(admin_user_id)",
            "CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status)",
            "CREATE INDEX IF NOT EXISTS idx_org_volunteers_volunteer_id ON org_volunteers(volunteer_id)",
            "CREATE INDEX IF NOT EXISTS idx_org_volunteers_org_status ON org_volunteers(org_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id)",
            "CREATE INDEX IF NOT EXISTS idx_events_created_by_supervisor ON events(created_by_supervisor_id)",
            "CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, date)",
            "CREATE INDEX IF NOT EXISTS idx_activities_volunteer_id ON activities(volunteer_id, date DESC)",
            "CREATE INDEX IF NOT EXISTS idx_activities_event_id ON activities(event_id)",
            "CREATE INDEX IF NOT EXISTS idx_activities_org_status ON activities(org_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_activities_reviewed_by ON activities(reviewed_by)",
            "CREATE INDEX IF NOT EXISTS idx_certificates_volunteer_id ON certificates(volunteer_id)",
            "CREATE INDEX IF NOT EXISTS idx_certificates_org_id ON certificates(org_id)",
            "CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON certificates(event_id)",
            "CREATE INDEX IF NOT EXISTS idx_event_applications_volunteer_id ON event_applications(volunteer_id)",
            "CREATE INDEX IF NOT EXISTS idx_event_applications_event_status ON event_applications(event_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_event_applications_org_id ON event_applications(org_id)",
            "CREATE INDEX IF NOT EXISTS idx_event_applications_event_waitlist ON event_applications(event_id, status, applied_date)",
            "CREATE INDEX IF NOT EXISTS idx_announcements_org_created ON announcements(org_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_org_admins_org_id ON org_admins(org_id)",
            "CREATE INDEX IF NOT EXISTS idx_org_profile_change_requests_status ON org_profile_change_requests(status, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_org_profile_change_requests_org_id ON org_profile_change_requests(org_id)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_event_ratings_event_id ON event_ratings(event_id)",
        ]
        for ddl in index_ddls:
            conn.execute(ddl)

        # Partial unique index: one activity record per volunteer per event.
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_unique_vol_event
            ON activities(volunteer_id, event_id)
            WHERE event_id IS NOT NULL
        """)

        # Fix 3: unique active application per (volunteer, event)
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_event_applications_active
            ON event_applications(volunteer_id, event_id)
            WHERE cancelled_at IS NULL
        """)

        # Fix 4: no duplicate certificates for same volunteer+org+event+title
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_no_duplicate
            ON certificates(volunteer_id, org_id, event_id, certificate_title)
            WHERE event_id IS NOT NULL
        """)

        # DB-05: prevent duplicate ad-hoc certificates (event_id IS NULL)
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_no_dup_adhoc
            ON certificates(volunteer_id, org_id, certificate_title)
            WHERE event_id IS NULL
        """)

        # Fix 8: composite index for supervisor activity queries
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_activities_vol_status_org
            ON activities(volunteer_id, status, org_id)
        """)

        # ── Migration-002 idempotent ALTER statements (existing DBs only) ─────
        # Fix 1: promote date TEXT → DATE if not already done
        conn.execute("""
            DO $$
            BEGIN
                IF (SELECT data_type FROM information_schema.columns
                    WHERE table_name = 'events' AND column_name = 'date') = 'text' THEN
                    ALTER TABLE events ALTER COLUMN date TYPE DATE USING date::DATE;
                END IF;
            END $$
        """)
        conn.execute("""
            DO $$
            BEGIN
                IF (SELECT data_type FROM information_schema.columns
                    WHERE table_name = 'activities' AND column_name = 'date') = 'text' THEN
                    ALTER TABLE activities ALTER COLUMN date TYPE DATE USING date::DATE;
                END IF;
            END $$
        """)

        # Fix 2: add 'Rejected' to org_volunteers status check
        conn.execute("""
            DO $$
            BEGIN
                BEGIN
                    ALTER TABLE org_volunteers DROP CONSTRAINT org_volunteers_status_check;
                EXCEPTION WHEN undefined_object THEN NULL;
                END;
                BEGIN
                    ALTER TABLE org_volunteers ADD CONSTRAINT org_volunteers_status_check
                        CHECK(status IN ('Active','Pending','Inactive','Rejected'));
                EXCEPTION WHEN duplicate_object THEN NULL;
                END;
            END $$
        """)

        # Fix 5: audit_logs.metadata TEXT → JSONB
        conn.execute("""
            DO $$
            BEGIN
                IF (SELECT data_type FROM information_schema.columns
                    WHERE table_name = 'audit_logs' AND column_name = 'metadata') = 'text' THEN
                    ALTER TABLE audit_logs ALTER COLUMN metadata TYPE JSONB USING metadata::JSONB;
                END IF;
            END $$
        """)

        # Fix 6: boolean columns for student_only / tracks_hours
        conn.execute("""
            DO $$
            BEGIN
                IF (SELECT data_type FROM information_schema.columns
                    WHERE table_name = 'organizations' AND column_name = 'student_only')
                    IN ('integer','bigint') THEN
                    ALTER TABLE organizations
                        ALTER COLUMN student_only TYPE BOOLEAN USING student_only::BOOLEAN;
                END IF;
            END $$
        """)
        conn.execute("""
            DO $$
            BEGIN
                IF (SELECT data_type FROM information_schema.columns
                    WHERE table_name = 'organizations' AND column_name = 'tracks_hours')
                    IN ('integer','bigint') THEN
                    ALTER TABLE organizations
                        ALTER COLUMN tracks_hours TYPE BOOLEAN USING tracks_hours::BOOLEAN;
                END IF;
            END $$
        """)

        # Fix 7: NOT NULL on critical FKs (safe no-op if already NOT NULL)
        for table, col in [
            ("org_volunteers",     "org_id"),
            ("org_volunteers",     "volunteer_id"),
            ("supervisors",        "org_id"),
            ("activities",         "volunteer_id"),
            ("activities",         "org_id"),
            ("event_applications", "volunteer_id"),
            ("event_applications", "event_id"),
            ("event_applications", "org_id"),
        ]:
            conn.execute(
                f"ALTER TABLE {table} ALTER COLUMN {col} SET NOT NULL"
            )

        # Trigger: keep events.current_volunteers equal to the live approved count.
        # Fires after any INSERT, UPDATE, or DELETE on event_applications so the
        # counter is always correct regardless of which code path mutates the table.
        conn.execute("""
            CREATE OR REPLACE FUNCTION trg_sync_current_volunteers()
            RETURNS TRIGGER LANGUAGE plpgsql AS $$
            DECLARE
                _event_id INTEGER;
            BEGIN
                -- Determine which event_id was affected
                IF TG_OP = 'DELETE' THEN
                    _event_id := OLD.event_id;
                ELSE
                    _event_id := NEW.event_id;
                END IF;

                UPDATE events
                SET current_volunteers = (
                    SELECT COUNT(*)
                    FROM event_applications
                    WHERE event_id = _event_id
                      AND status = 'Approved'
                      AND cancelled_at IS NULL
                )
                WHERE id = _event_id;

                RETURN NULL;
            END $$
        """)

        conn.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_trigger
                    WHERE tgname = 'trg_event_applications_sync_volunteers'
                ) THEN
                    CREATE TRIGGER trg_event_applications_sync_volunteers
                    AFTER INSERT OR UPDATE OR DELETE ON event_applications
                    FOR EACH ROW EXECUTE FUNCTION trg_sync_current_volunteers();
                END IF;
            END $$
        """)

        # Backfill: reconcile any drift between the stored counter and the live
        # count. Safe to run on every startup — only updates rows where the value
        # is actually wrong, so it's a no-op on a healthy database.
        conn.execute("""
            UPDATE events e
            SET current_volunteers = live.cnt
            FROM (
                SELECT event_id,
                       COUNT(*) FILTER (WHERE status = 'Approved' AND cancelled_at IS NULL) AS cnt
                FROM event_applications
                GROUP BY event_id
            ) live
            WHERE live.event_id = e.id
              AND e.current_volunteers IS DISTINCT FROM live.cnt
        """)

        conn.execute("ANALYZE")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
