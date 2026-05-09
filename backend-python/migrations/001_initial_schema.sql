-- Migration 001 — Initial PostgreSQL schema for the Altruism platform
-- Run once on a fresh database, or via a migration runner (psql, Flyway, etc.).
-- All statements are idempotent (IF NOT EXISTS).
-- Supersedes: all SQLite inline ALTER TABLE migrations in the old database.py.

BEGIN;

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id               SERIAL PRIMARY KEY,
    email            TEXT UNIQUE NOT NULL,
    password         TEXT NOT NULL,
    role             TEXT NOT NULL CHECK(role IN ('volunteer','supervisor','org_admin')),
    invite_token     TEXT,
    invite_expires_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token);

-- ── Organizations ─────────────────────────────────────────────────────────────

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
    -- Approval workflow
    status           TEXT DEFAULT 'approved',   -- pending / approved / rejected
    rejection_reason TEXT,
    -- Registration fields
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
    branches         TEXT,    -- JSON-encoded list of governorates
    categories       TEXT,    -- JSON-encoded list of category names
    additional_notes TEXT,
    -- Eligibility & feature flags
    student_only     BOOLEAN NOT NULL DEFAULT FALSE,
    tracks_hours     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_admin_user_id ON organizations(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status        ON organizations(status);

-- ── Volunteers ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS volunteers (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER UNIQUE REFERENCES users(id),
    name             TEXT NOT NULL,
    email            TEXT NOT NULL,
    phone            TEXT,
    city             TEXT,
    skills           TEXT,
    about_me         TEXT,
    status           TEXT DEFAULT 'Pending' CHECK(status IN ('Active','Pending','Suspended')),
    -- Extended profile
    date_of_birth    TEXT,
    governorate      TEXT,
    profile_picture  TEXT,
    national_id      TEXT,
    gender           TEXT,
    health_notes     TEXT,
    availability     TEXT,
    hours_per_week   INTEGER DEFAULT 0,
    languages        TEXT,
    education_level  TEXT,
    prior_experience INTEGER DEFAULT 0,
    prior_org        TEXT,
    cause_areas      TEXT,
    nationality      TEXT,
    university_name  TEXT,
    faculty          TEXT,
    study_year       TEXT,
    field_of_study   TEXT,
    department       TEXT,
    experiences      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);

-- ── Supervisors ───────────────────────────────────────────────────────────────

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
);

CREATE INDEX IF NOT EXISTS idx_supervisors_org_id ON supervisors(org_id);

-- ── Org ↔ Volunteer membership ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_volunteers (
    id                   SERIAL PRIMARY KEY,
    org_id               INTEGER NOT NULL REFERENCES organizations(id),
    volunteer_id         INTEGER NOT NULL REFERENCES volunteers(id),
    supervisor_id        INTEGER REFERENCES supervisors(id),
    department           TEXT,
    status               TEXT DEFAULT 'Pending'
                             CHECK(status IN ('Active','Pending','Inactive','Rejected')),
    joined_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Tracking & analytics
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
);

CREATE INDEX IF NOT EXISTS idx_org_volunteers_volunteer_id ON org_volunteers(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_org_volunteers_supervisor_id ON org_volunteers(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_org_volunteers_org_status    ON org_volunteers(org_id, status);

-- ── Events ────────────────────────────────────────────────────────────────────

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
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_org_id      ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, date);

-- ── Activities ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activities (
    id            SERIAL PRIMARY KEY,
    volunteer_id  INTEGER NOT NULL REFERENCES volunteers(id),
    event_id      INTEGER REFERENCES events(id),
    org_id        INTEGER NOT NULL REFERENCES organizations(id),
    date          DATE NOT NULL,
    hours         REAL,               -- nullable: participation-only orgs omit hours
    description   TEXT,
    status        TEXT DEFAULT 'Pending'
                      CHECK(status IN ('Pending','Approved','Rejected','Completed')),
    reviewed_by   INTEGER REFERENCES supervisors(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_activities_volunteer_id ON activities(volunteer_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_event_id     ON activities(event_id);
CREATE INDEX IF NOT EXISTS idx_activities_org_status   ON activities(org_id, status);
CREATE INDEX IF NOT EXISTS idx_activities_reviewed_by  ON activities(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_activities_vol_status_org ON activities(volunteer_id, status, org_id);

-- One activity per (volunteer, event) — partial so ad-hoc activities (event_id IS NULL) are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_unique_vol_event
    ON activities(volunteer_id, event_id) WHERE event_id IS NOT NULL;

-- ── Certificates ──────────────────────────────────────────────────────────────

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
);

CREATE INDEX IF NOT EXISTS idx_certificates_volunteer_id ON certificates(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_certificates_org_id       ON certificates(org_id);
CREATE INDEX IF NOT EXISTS idx_certificates_event_id     ON certificates(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_no_duplicate
    ON certificates(volunteer_id, org_id, event_id, certificate_title)
    WHERE event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_no_dup_adhoc
    ON certificates(volunteer_id, org_id, certificate_title)
    WHERE event_id IS NULL;

-- ── Event applications & waitlist ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_applications (
    id             SERIAL PRIMARY KEY,
    volunteer_id   INTEGER NOT NULL REFERENCES volunteers(id),
    event_id       INTEGER NOT NULL REFERENCES events(id),
    org_id         INTEGER NOT NULL REFERENCES organizations(id),
    status         TEXT DEFAULT 'Pending'
                       CHECK(status IN ('Pending','Approved','Rejected','Waitlisted')),
    applied_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_event_applications_volunteer_id  ON event_applications(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_event_applications_event_status  ON event_applications(event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_applications_org_id        ON event_applications(org_id);
-- FIFO waitlist promotion index
CREATE INDEX IF NOT EXISTS idx_event_applications_event_waitlist
    ON event_applications(event_id, status, applied_date);
-- Prevent duplicate active applications
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_applications_active
    ON event_applications(volunteer_id, event_id)
    WHERE cancelled_at IS NULL;

-- ── Announcements ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS announcements (
    id          SERIAL PRIMARY KEY,
    org_id      INTEGER REFERENCES organizations(id),
    title       TEXT NOT NULL,
    content     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_org_created ON announcements(org_id, created_at DESC);

-- ── Platform admins ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_admins (
    user_id     INTEGER PRIMARY KEY REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Org profile change requests ───────────────────────────────────────────────

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
);

CREATE INDEX IF NOT EXISTS idx_org_profile_change_requests_status
    ON org_profile_change_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_profile_change_requests_org_id
    ON org_profile_change_requests(org_id);

-- ── Org admins ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_admins (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    org_id      INTEGER NOT NULL REFERENCES organizations(id),
    role        TEXT NOT NULL DEFAULT 'admin',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_admins_org_id ON org_admins(org_id);

-- ── Notifications ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    action_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- ── Audit logs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
    id           SERIAL PRIMARY KEY,
    actor_id     INTEGER REFERENCES users(id),
    actor_role   TEXT,
    action       TEXT NOT NULL,
    entity_type  TEXT,
    entity_id    INTEGER,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor  ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);

-- ── Event ratings ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_ratings (
    id            SERIAL PRIMARY KEY,
    event_id      INTEGER NOT NULL REFERENCES events(id),
    volunteer_id  INTEGER NOT NULL REFERENCES volunteers(id),
    rating        INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    feedback      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, volunteer_id)
);

CREATE INDEX IF NOT EXISTS idx_event_ratings_event_id ON event_ratings(event_id);

-- ── Warm up query planner statistics ─────────────────────────────────────────

ANALYZE;

COMMIT;
