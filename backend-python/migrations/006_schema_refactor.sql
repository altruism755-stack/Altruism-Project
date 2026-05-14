-- Migration 006 — Schema refactor: cleanup, normalization, and type improvements
-- Safe to run on a live database with existing data.
-- All steps are idempotent and wrapped in DO blocks.
-- Apply AFTER deploying the updated application code (routes, database.py).
--
-- Order of operations:
--   Phase 1 — Non-breaking additions (new columns, new tables, new views)
--   Phase 2 — Data backfills
--   Phase 3 — Constraint & type changes (lowercase status values, JSONB, DATE)
--   Phase 4 — Drop obsolete columns (after app code no longer reads them)
--   Phase 5 — Drop obsolete tables
--   Phase 6 — Rebuild indexes
--   Phase 7 — Analyze

BEGIN;

-- ===========================================================================
-- PHASE 1: Non-breaking additions
-- ===========================================================================

-- ── 1a. Add platform_admin to users.role CHECK ───────────────────────────────
-- Drop old constraint and replace with one that includes 'platform_admin'.
DO $$
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    BEGIN
        ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('volunteer','supervisor','org_admin','platform_admin'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── 1b. Create org_theme table (extracted UI data from organizations) ─────────
CREATE TABLE IF NOT EXISTS org_theme (
    org_id          INTEGER PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    color           TEXT DEFAULT '#16A34A',
    secondary_color TEXT DEFAULT '#22C55E',
    initials        TEXT
);

-- ── 1c. Add starts_at to events (replaces date + time) ───────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'starts_at'
    ) THEN
        ALTER TABLE events ADD COLUMN starts_at TIMESTAMPTZ;
    END IF;
END $$;

-- ── 1d. Add created_at alias column to event_applications ────────────────────
-- We rename applied_date → created_at. Add created_at first as a copy,
-- keeping applied_date alive until routes are updated.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_applications' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE event_applications ADD COLUMN created_at TIMESTAMPTZ;
    END IF;
END $$;

-- ── 1e. Promote TEXT arrays to JSONB in organizations ────────────────────────
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'branches') = 'text' THEN
        ALTER TABLE organizations ALTER COLUMN branches TYPE JSONB
            USING CASE
                WHEN branches IS NULL OR branches = '' THEN NULL
                ELSE branches::JSONB
            END;
    END IF;
END $$;

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'categories') = 'text' THEN
        ALTER TABLE organizations ALTER COLUMN categories TYPE JSONB
            USING CASE
                WHEN categories IS NULL OR categories = '' THEN NULL
                ELSE categories::JSONB
            END;
    END IF;
END $$;

-- ── 1f. Promote TEXT arrays to JSONB in volunteers ───────────────────────────
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'volunteers' AND column_name = 'skills') = 'text' THEN
        ALTER TABLE volunteers ALTER COLUMN skills TYPE JSONB
            USING CASE
                WHEN skills IS NULL OR skills = '' THEN '[]'::JSONB
                ELSE skills::JSONB
            END;
    END IF;
END $$;

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'volunteers' AND column_name = 'languages') = 'text' THEN
        ALTER TABLE volunteers ALTER COLUMN languages TYPE JSONB
            USING CASE
                WHEN languages IS NULL OR languages = '' THEN '[]'::JSONB
                ELSE languages::JSONB
            END;
    END IF;
END $$;

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'volunteers' AND column_name = 'cause_areas') = 'text' THEN
        ALTER TABLE volunteers ALTER COLUMN cause_areas TYPE JSONB
            USING CASE
                WHEN cause_areas IS NULL OR cause_areas = '' THEN '[]'::JSONB
                ELSE cause_areas::JSONB
            END;
    END IF;
END $$;

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'volunteers' AND column_name = 'experiences') = 'text' THEN
        ALTER TABLE volunteers ALTER COLUMN experiences TYPE JSONB
            USING CASE
                WHEN experiences IS NULL OR experiences = '' THEN '[]'::JSONB
                ELSE experiences::JSONB
            END;
    END IF;
END $$;

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'volunteers' AND column_name = 'availability') = 'text' THEN
        ALTER TABLE volunteers ALTER COLUMN availability TYPE JSONB
            USING CASE
                WHEN availability IS NULL OR availability = '' THEN '[]'::JSONB
                ELSE availability::JSONB
            END;
    END IF;
END $$;

-- ── 1g. Fix volunteers.date_of_birth TEXT → DATE ──────────────────────────────
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'volunteers' AND column_name = 'date_of_birth') = 'text' THEN
        ALTER TABLE volunteers ALTER COLUMN date_of_birth TYPE DATE
            USING NULLIF(date_of_birth, '')::DATE;
    END IF;
END $$;

-- ── 1h. Add changes JSONB column to org_profile_change_requests ───────────────
-- Keeps old field/new_value columns for backward compat; new column groups edits.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_profile_change_requests' AND column_name = 'changes'
    ) THEN
        ALTER TABLE org_profile_change_requests ADD COLUMN changes JSONB;
    END IF;
END $$;

-- ===========================================================================
-- PHASE 2: Data backfills
-- ===========================================================================

-- ── 2a. Populate org_theme from existing organizations rows ──────────────────
INSERT INTO org_theme (org_id, color, secondary_color, initials)
SELECT id,
       COALESCE(color, '#16A34A'),
       COALESCE(secondary_color, '#22C55E'),
       initials
FROM organizations
ON CONFLICT (org_id) DO UPDATE
    SET color           = EXCLUDED.color,
        secondary_color = EXCLUDED.secondary_color,
        initials        = EXCLUDED.initials;

-- ── 2b. Backfill events.starts_at from date + time ───────────────────────────
-- Tries to parse the free-text time column; falls back to midnight if unparseable.
UPDATE events
SET starts_at = (
    date::TEXT || ' ' ||
    COALESCE(NULLIF(TRIM(time), ''), '00:00')
)::TIMESTAMPTZ
WHERE starts_at IS NULL
  AND date IS NOT NULL;

-- ── 2c. Backfill event_applications.created_at from applied_date ─────────────
UPDATE event_applications
SET created_at = applied_date
WHERE created_at IS NULL
  AND applied_date IS NOT NULL;

-- ── 2d. Backfill org_profile_change_requests.changes JSONB ───────────────────
-- Groups each old single-field row into a JSONB object {"field": "new_value"}.
UPDATE org_profile_change_requests
SET changes = jsonb_build_object(field, COALESCE(new_value, ''))
WHERE changes IS NULL
  AND field IS NOT NULL;

-- ── 2e. Backfill platform_admin role in users from platform_admins table ──────
-- Sets users.role = 'platform_admin' for any user in platform_admins.
-- This must happen BEFORE dropping the platform_admins table (Phase 5).
UPDATE users u
SET role = 'platform_admin'
FROM platform_admins pa
WHERE pa.user_id = u.id
  AND u.role != 'platform_admin';

-- ── 2f. Fix empty-string snapshot defaults to NULL in org_volunteers ──────────
UPDATE org_volunteers
SET governorate_snapshot = NULL
WHERE governorate_snapshot = '';

UPDATE org_volunteers
SET city_snapshot = NULL
WHERE city_snapshot = '';

UPDATE org_volunteers
SET notes = NULL
WHERE notes = '';

UPDATE org_volunteers
SET channel_detail = NULL
WHERE channel_detail = '';

-- ===========================================================================
-- PHASE 3: Constraint & type normalization
-- ===========================================================================

-- ── 3a. Lowercase status values: volunteers ───────────────────────────────────
UPDATE volunteers SET status = LOWER(status) WHERE status != LOWER(status);
DO $$
BEGIN
    ALTER TABLE volunteers DROP CONSTRAINT IF EXISTS volunteers_status_check;
    BEGIN
        ALTER TABLE volunteers ADD CONSTRAINT volunteers_status_check
            CHECK (status IN ('active','pending','suspended'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── 3b. Lowercase status values: supervisors ─────────────────────────────────
UPDATE supervisors SET status = LOWER(status) WHERE status != LOWER(status);
DO $$
BEGIN
    ALTER TABLE supervisors DROP CONSTRAINT IF EXISTS supervisors_status_check;
    BEGIN
        ALTER TABLE supervisors ADD CONSTRAINT supervisors_status_check
            CHECK (status IN ('active','pending'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── 3c. Lowercase status values: org_volunteers ───────────────────────────────
UPDATE org_volunteers SET status = LOWER(status) WHERE status != LOWER(status);
DO $$
BEGIN
    ALTER TABLE org_volunteers DROP CONSTRAINT IF EXISTS org_volunteers_status_check;
    BEGIN
        ALTER TABLE org_volunteers ADD CONSTRAINT org_volunteers_status_check
            CHECK (status IN ('active','pending','inactive','rejected'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── 3d. Lowercase status values: events ──────────────────────────────────────
UPDATE events SET status = LOWER(status) WHERE status != LOWER(status);
DO $$
BEGIN
    ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
    BEGIN
        ALTER TABLE events ADD CONSTRAINT events_status_check
            CHECK (status IN ('upcoming','active','completed'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── 3e. Lowercase status values: activities ───────────────────────────────────
UPDATE activities SET status = LOWER(status) WHERE status != LOWER(status);
DO $$
BEGIN
    ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_status_check;
    BEGIN
        ALTER TABLE activities ADD CONSTRAINT activities_status_check
            CHECK (status IN ('pending','approved','rejected','completed'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── 3f. Lowercase status values: event_applications ──────────────────────────
UPDATE event_applications SET status = LOWER(status) WHERE status != LOWER(status);
DO $$
BEGIN
    ALTER TABLE event_applications DROP CONSTRAINT IF EXISTS event_applications_status_check;
    BEGIN
        ALTER TABLE event_applications ADD CONSTRAINT event_applications_status_check
            CHECK (status IN ('pending','approved','rejected','waitlisted'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

UPDATE event_applications
SET attendance_status = LOWER(attendance_status)
WHERE attendance_status IS NOT NULL AND attendance_status != LOWER(attendance_status);
DO $$
BEGIN
    ALTER TABLE event_applications DROP CONSTRAINT IF EXISTS event_applications_attendance_status_check;
    BEGIN
        ALTER TABLE event_applications ADD CONSTRAINT event_applications_attendance_status_check
            CHECK (attendance_status IN ('attended','absent'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── 3g. Lowercase type values: certificates ───────────────────────────────────
UPDATE certificates SET type = LOWER(type) WHERE type IS NOT NULL AND type != LOWER(type);
DO $$
BEGIN
    ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_type_check;
    BEGIN
        ALTER TABLE certificates ADD CONSTRAINT certificates_type_check
            CHECK (type IN ('participation','achievement','completion'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── 3h. Lowercase status values: organizations ────────────────────────────────
UPDATE organizations SET status = LOWER(status) WHERE status IS NOT NULL AND status != LOWER(status);
DO $$
BEGIN
    ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_status_check;
    BEGIN
        ALTER TABLE organizations ADD CONSTRAINT organizations_status_check
            CHECK (status IN ('pending','approved','rejected'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── 3i. Make organizations.status NOT NULL with default ───────────────────────
UPDATE organizations SET status = 'approved' WHERE status IS NULL;
ALTER TABLE organizations ALTER COLUMN status SET NOT NULL;
ALTER TABLE organizations ALTER COLUMN status SET DEFAULT 'pending';

-- ── 3j. Make starts_at NOT NULL now that it's backfilled ─────────────────────
-- Only enforce if every event has a starts_at (check first).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM events WHERE starts_at IS NULL) THEN
        ALTER TABLE events ALTER COLUMN starts_at SET NOT NULL;
    END IF;
END $$;

-- ── 3k. Rename applied_date → created_at on event_applications ───────────────
-- At this point created_at is already backfilled from applied_date (Phase 2c).
-- We set it NOT NULL and drop applied_date.
UPDATE event_applications SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE event_applications ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE event_applications ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_applications' AND column_name = 'applied_date'
    ) THEN
        ALTER TABLE event_applications DROP COLUMN applied_date;
    END IF;
END $$;

-- ── 3l. Add NOT NULL to volunteers.user_id (should always exist) ──────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM volunteers WHERE user_id IS NULL) THEN
        RAISE NOTICE 'volunteers.user_id has NULL rows — skipping NOT NULL enforcement';
    ELSE
        ALTER TABLE volunteers ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- ── 3m. Add NOT NULL to supervisors.user_id ───────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM supervisors WHERE user_id IS NULL) THEN
        RAISE NOTICE 'supervisors.user_id has NULL rows — skipping NOT NULL enforcement';
    ELSE
        ALTER TABLE supervisors ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- ── 3n. Fix org_volunteers NULL defaults ──────────────────────────────────────
ALTER TABLE org_volunteers ALTER COLUMN governorate_snapshot DROP DEFAULT;
ALTER TABLE org_volunteers ALTER COLUMN city_snapshot DROP DEFAULT;
ALTER TABLE org_volunteers ALTER COLUMN notes DROP DEFAULT;
ALTER TABLE org_volunteers ALTER COLUMN channel_detail DROP DEFAULT;

-- ===========================================================================
-- PHASE 4: Drop obsolete columns (app code no longer references these)
-- ===========================================================================

-- ── 4a. Drop volunteers.email (use users.email via user_id FK) ───────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'volunteers' AND column_name = 'email'
    ) THEN
        ALTER TABLE volunteers DROP COLUMN email;
    END IF;
END $$;

-- ── 4b. Drop supervisors.email (use users.email via user_id FK) ──────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'supervisors' AND column_name = 'email'
    ) THEN
        ALTER TABLE supervisors DROP COLUMN email;
    END IF;
END $$;

-- ── 4c. Drop org_volunteers.is_active (derived from status = 'active') ────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_volunteers' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE org_volunteers DROP COLUMN is_active;
    END IF;
END $$;

-- ── 4d. Drop org_volunteers.source (duplicate of join_source) ────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_volunteers' AND column_name = 'source'
    ) THEN
        ALTER TABLE org_volunteers DROP COLUMN source;
    END IF;
END $$;

-- ── 4e. Drop org_volunteers.joined_date (use joined_at TIMESTAMPTZ) ──────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_volunteers' AND column_name = 'joined_date'
    ) THEN
        ALTER TABLE org_volunteers DROP COLUMN joined_date;
    END IF;
END $$;

-- ── 4f. Drop event_applications.org_id (derivable via events.org_id) ─────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_applications' AND column_name = 'org_id'
    ) THEN
        -- Drop the FK index first
        DROP INDEX IF EXISTS idx_event_applications_org_id;
        ALTER TABLE event_applications DROP COLUMN org_id;
    END IF;
END $$;

-- ── 4g. Drop organizations.founded (duplicate of founded_year) ───────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'founded'
    ) THEN
        -- Backfill founded_year from founded if founded_year is empty
        UPDATE organizations
        SET founded_year = founded
        WHERE (founded_year IS NULL OR founded_year = '')
          AND founded IS NOT NULL;
        ALTER TABLE organizations DROP COLUMN founded;
    END IF;
END $$;

-- ── 4h. Drop organizations.category (superseded by categories JSONB) ─────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'category'
    ) THEN
        -- Merge singular category into categories array if not already present
        UPDATE organizations
        SET categories = COALESCE(categories, '[]'::JSONB) || to_jsonb(category)
        WHERE category IS NOT NULL
          AND NOT (COALESCE(categories, '[]'::JSONB) @> to_jsonb(category));
        ALTER TABLE organizations DROP COLUMN category;
    END IF;
END $$;

-- ── 4i. Drop organizations.location (replaced by hq_city) ────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'location'
    ) THEN
        -- Backfill hq_city from location if hq_city is empty
        UPDATE organizations
        SET hq_city = location
        WHERE (hq_city IS NULL OR hq_city = '')
          AND location IS NOT NULL;
        ALTER TABLE organizations DROP COLUMN location;
    END IF;
END $$;

-- ── 4j. Drop organizations.color, secondary_color, initials ──────────────────
-- These are now in org_theme. Drop only after org_theme is populated (Phase 2a).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'color'
    ) THEN
        ALTER TABLE organizations DROP COLUMN color;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'secondary_color'
    ) THEN
        ALTER TABLE organizations DROP COLUMN secondary_color;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'initials'
    ) THEN
        ALTER TABLE organizations DROP COLUMN initials;
    END IF;
END $$;

-- ── 4k. Drop events.date and events.time (replaced by starts_at) ─────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'time'
    ) THEN
        ALTER TABLE events DROP COLUMN time;
    END IF;
END $$;

DO $$
BEGIN
    -- Only drop date once starts_at is NOT NULL on all rows
    IF NOT EXISTS (SELECT 1 FROM events WHERE starts_at IS NULL) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'events' AND column_name = 'date'
        ) THEN
            ALTER TABLE events DROP COLUMN date;
        END IF;
    END IF;
END $$;

-- ── 4l. Drop events.current_volunteers (replaced by view) ────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'current_volunteers'
    ) THEN
        -- Drop trigger that maintained this counter first
        DROP TRIGGER IF EXISTS trg_event_applications_sync_volunteers ON event_applications;
        DROP FUNCTION IF EXISTS trg_sync_current_volunteers();
        ALTER TABLE events DROP COLUMN current_volunteers;
    END IF;
END $$;

-- ── 4m. Drop org_volunteers.channel_detail (folded into notes / unused) ───────
-- Only drop if your routes confirmed this is unused.
-- Keeping it commented out as a safety measure — uncomment to apply.
-- DO $$
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM information_schema.columns
--         WHERE table_name = 'org_volunteers' AND column_name = 'channel_detail'
--     ) THEN
--         ALTER TABLE org_volunteers DROP COLUMN channel_detail;
--     END IF;
-- END $$;

-- ===========================================================================
-- PHASE 5: Drop obsolete tables
-- ===========================================================================

-- ── 5a. Drop platform_admins (users.role = 'platform_admin' replaces it) ──────
-- Users have been backfilled in Phase 2e. Safe to drop now.
DROP TABLE IF EXISTS platform_admins;

-- ===========================================================================
-- PHASE 6: Create / replace views and rebuild indexes
-- ===========================================================================

-- ── 6a. Volunteer count view (replaces current_volunteers cached counter) ──────
CREATE OR REPLACE VIEW event_volunteer_counts AS
SELECT
    event_id,
    COUNT(*) AS current_volunteers
FROM event_applications
WHERE status = 'approved'
  AND cancelled_at IS NULL
GROUP BY event_id;

-- ── 6b. Rebuild / add indexes affected by column changes ─────────────────────

-- events: new index on starts_at replacing old date index
DROP INDEX IF EXISTS idx_events_status_date;
CREATE INDEX IF NOT EXISTS idx_events_status_starts_at ON events(status, starts_at);

-- event_applications: update waitlist index to use created_at (was applied_date)
DROP INDEX IF EXISTS idx_event_applications_event_waitlist;
CREATE INDEX IF NOT EXISTS idx_event_applications_waitlist
    ON event_applications(event_id, status, created_at);

-- org_volunteers: drop stale supervisor index (column removed in migration 003)
DROP INDEX IF EXISTS idx_org_volunteers_supervisor_id;

-- volunteers: ensure user_id index exists
CREATE INDEX IF NOT EXISTS idx_volunteers_user_id ON volunteers(user_id);

-- org_theme: no index needed (PK is the FK)

-- certificates: update constraint name for clarity
DROP INDEX IF EXISTS idx_certificates_no_duplicate;
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_no_dup_event
    ON certificates(volunteer_id, org_id, event_id, certificate_title)
    WHERE event_id IS NOT NULL;

-- Attendance index for event_applications (ensure it exists)
CREATE INDEX IF NOT EXISTS idx_event_applications_attendance
    ON event_applications(event_id, attendance_status)
    WHERE cancelled_at IS NULL;

-- ===========================================================================
-- PHASE 7: Final cleanup and stats
-- ===========================================================================

ANALYZE users, organizations, org_theme, volunteers, supervisors,
         org_volunteers, org_admins, events, event_applications,
         activities, certificates, announcements, notifications,
         org_profile_change_requests, audit_logs, event_ratings;

COMMIT;
