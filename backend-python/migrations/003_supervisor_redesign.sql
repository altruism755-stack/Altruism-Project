-- Migration 003 — Supervisor role redesign
-- Supervisors become event/activity managers, not volunteer owners.
-- Safe to run on an existing database; all steps are idempotent.

BEGIN;

-- ── Step 1: Add event ownership column ───────────────────────────────────────
-- Tracks which supervisor created (and therefore manages) each event.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'created_by_supervisor_id'
    ) THEN
        ALTER TABLE events ADD COLUMN created_by_supervisor_id INTEGER REFERENCES supervisors(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_created_by_supervisor ON events(created_by_supervisor_id);

-- ── Step 2: Remove supervisor ownership of volunteers ────────────────────────
-- Drop the supervisor_id FK from org_volunteers so supervisors no longer
-- "own" individual volunteers. Org admins handle all membership approvals.

DROP INDEX IF EXISTS idx_org_volunteers_supervisor_id;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_volunteers' AND column_name = 'supervisor_id'
    ) THEN
        ALTER TABLE org_volunteers DROP COLUMN supervisor_id;
    END IF;
END $$;

-- ── Step 3: Nullify stale reviewed_by references (safety) ────────────────────
-- activities.reviewed_by still references supervisors(id) — that is correct
-- and intentional. No changes needed there.

ANALYZE events, org_volunteers, activities;

COMMIT;
