-- Migration 002 — Schema improvements
-- Safe to run on an existing database with live data.
-- All steps are idempotent or wrapped in DO blocks to skip already-applied changes.

BEGIN;

-- ── Fix 1: date columns to proper DATE type ───────────────────────────────────

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'date') = 'text' THEN
        ALTER TABLE events ALTER COLUMN date TYPE DATE USING date::DATE;
    END IF;
END $$;

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'activities' AND column_name = 'date') = 'text' THEN
        ALTER TABLE activities ALTER COLUMN date TYPE DATE USING date::DATE;
    END IF;
END $$;

-- ── Fix 2: add 'Rejected' to org_volunteers status check ─────────────────────

DO $$
BEGIN
    -- Drop old constraint (ignore if already gone)
    BEGIN
        ALTER TABLE org_volunteers DROP CONSTRAINT org_volunteers_status_check;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
    -- Add updated constraint (ignore if already correct)
    BEGIN
        ALTER TABLE org_volunteers ADD CONSTRAINT org_volunteers_status_check
            CHECK(status IN ('Active','Pending','Inactive','Rejected'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ── Fix 3: unique active application per volunteer+event ─────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_applications_active
    ON event_applications(volunteer_id, event_id)
    WHERE cancelled_at IS NULL;

-- ── Fix 4: no duplicate certificates for the same volunteer+org+event+title ──

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_no_duplicate
    ON certificates(volunteer_id, org_id, event_id, certificate_title)
    WHERE event_id IS NOT NULL;

-- ── Fix 5: audit_logs.metadata as JSONB ──────────────────────────────────────

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'metadata') = 'text' THEN
        ALTER TABLE audit_logs ALTER COLUMN metadata TYPE JSONB USING metadata::JSONB;
    END IF;
END $$;

-- ── Fix 6: boolean columns for student_only and tracks_hours ─────────────────

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'student_only') IN ('integer','bigint') THEN
        ALTER TABLE organizations ALTER COLUMN student_only TYPE BOOLEAN USING student_only::BOOLEAN;
    END IF;
END $$;

DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'tracks_hours') IN ('integer','bigint') THEN
        ALTER TABLE organizations ALTER COLUMN tracks_hours TYPE BOOLEAN USING tracks_hours::BOOLEAN;
    END IF;
END $$;

-- ── Fix 7: NOT NULL on critical foreign keys ──────────────────────────────────

ALTER TABLE org_volunteers       ALTER COLUMN org_id       SET NOT NULL;
ALTER TABLE org_volunteers       ALTER COLUMN volunteer_id  SET NOT NULL;
ALTER TABLE supervisors          ALTER COLUMN org_id        SET NOT NULL;
ALTER TABLE activities           ALTER COLUMN volunteer_id  SET NOT NULL;
ALTER TABLE activities           ALTER COLUMN org_id        SET NOT NULL;
ALTER TABLE event_applications   ALTER COLUMN volunteer_id  SET NOT NULL;
ALTER TABLE event_applications   ALTER COLUMN event_id      SET NOT NULL;
ALTER TABLE event_applications   ALTER COLUMN org_id        SET NOT NULL;

-- ── Fix 8: composite index for supervisor activity queries ────────────────────

CREATE INDEX IF NOT EXISTS idx_activities_vol_status_org
    ON activities(volunteer_id, status, org_id);

ANALYZE;

COMMIT;
