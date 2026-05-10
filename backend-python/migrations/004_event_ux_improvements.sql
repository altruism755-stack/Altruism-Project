-- Migration 004 — Event UX improvements
-- Adds registration_open flag and attendance_status to event_applications.
-- All steps are idempotent.

BEGIN;

-- ── Step 1: registration_open on events ──────────────────────────────────────
-- TRUE  = volunteers can apply (default)
-- FALSE = supervisor closed registration manually

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'registration_open'
    ) THEN
        ALTER TABLE events ADD COLUMN registration_open BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;

-- ── Step 2: attendance_status on event_applications ──────────────────────────
-- NULL      = not yet marked (before or during event)
-- Attended  = supervisor confirmed volunteer was present
-- Absent    = supervisor marked volunteer as absent

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_applications' AND column_name = 'attendance_status'
    ) THEN
        ALTER TABLE event_applications ADD COLUMN attendance_status TEXT
            CHECK (attendance_status IN ('Attended', 'Absent'));
    END IF;
END $$;

-- ── Step 3: index to speed up attendance queries ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_event_applications_attendance
    ON event_applications(event_id, attendance_status)
    WHERE cancelled_at IS NULL;

ANALYZE events, event_applications;

COMMIT;
