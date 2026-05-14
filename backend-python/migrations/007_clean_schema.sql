-- Migration 007: Clean schema redesign
-- Removes org_theme, normalizes volunteer JSONB arrays,
-- drops redundant columns from org_admins, org_volunteers,
-- and cleans up org_profile_change_requests.
--
-- Run ONCE against a live database that has already applied migrations 001–006.
-- All phases are wrapped in idempotent DO blocks.

BEGIN;

-- ── Phase 1: Add normalized volunteer attribute tables ────────────────────────

CREATE TABLE IF NOT EXISTS volunteer_skills (
    id           SERIAL PRIMARY KEY,
    volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    skill        TEXT NOT NULL,
    UNIQUE (volunteer_id, skill)
);

CREATE TABLE IF NOT EXISTS volunteer_languages (
    id           SERIAL PRIMARY KEY,
    volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    language     TEXT NOT NULL,
    UNIQUE (volunteer_id, language)
);

CREATE TABLE IF NOT EXISTS volunteer_cause_areas (
    id           SERIAL PRIMARY KEY,
    volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    cause_area   TEXT NOT NULL,
    UNIQUE (volunteer_id, cause_area)
);

CREATE TABLE IF NOT EXISTS volunteer_experiences (
    id           SERIAL PRIMARY KEY,
    volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    organization TEXT,
    description  TEXT,
    start_date   DATE,
    end_date     DATE
);

CREATE TABLE IF NOT EXISTS volunteer_availability (
    id           SERIAL PRIMARY KEY,
    volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    day_of_week  TEXT NOT NULL,
    time_slot    TEXT NOT NULL,
    UNIQUE (volunteer_id, day_of_week, time_slot)
);

-- ── Phase 2: Backfill normalized tables from JSONB columns ────────────────────

-- volunteer_skills
INSERT INTO volunteer_skills (volunteer_id, skill)
SELECT id, elem
FROM volunteers, jsonb_array_elements_text(COALESCE(skills, '[]'::jsonb)) AS elem
ON CONFLICT DO NOTHING;

-- volunteer_languages
INSERT INTO volunteer_languages (volunteer_id, language)
SELECT id, elem
FROM volunteers, jsonb_array_elements_text(COALESCE(languages, '[]'::jsonb)) AS elem
ON CONFLICT DO NOTHING;

-- volunteer_cause_areas
INSERT INTO volunteer_cause_areas (volunteer_id, cause_area)
SELECT id, elem
FROM volunteers, jsonb_array_elements_text(COALESCE(cause_areas, '[]'::jsonb)) AS elem
ON CONFLICT DO NOTHING;

-- ── Phase 3: Drop JSONB columns from volunteers ───────────────────────────────
-- NOTE: The application still reads/writes these via the API.
-- Drop only after the API is updated to use the new tables.
-- Uncomment when ready:
--
-- ALTER TABLE volunteers
--     DROP COLUMN IF EXISTS skills,
--     DROP COLUMN IF EXISTS languages,
--     DROP COLUMN IF EXISTS cause_areas,
--     DROP COLUMN IF EXISTS experiences,
--     DROP COLUMN IF EXISTS availability;

-- ── Phase 4: Drop org_theme ───────────────────────────────────────────────────

DROP TABLE IF EXISTS org_theme CASCADE;

-- ── Phase 5: Clean up org_admins (drop unused role column) ───────────────────

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_admins' AND column_name = 'role'
    ) THEN
        ALTER TABLE org_admins DROP COLUMN role;
    END IF;
END $$;

-- ── Phase 6: Clean up org_volunteers (drop snapshot/channel_detail columns) ───

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_volunteers' AND column_name = 'governorate_snapshot'
    ) THEN
        ALTER TABLE org_volunteers DROP COLUMN governorate_snapshot;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_volunteers' AND column_name = 'city_snapshot'
    ) THEN
        ALTER TABLE org_volunteers DROP COLUMN city_snapshot;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_volunteers' AND column_name = 'channel_detail'
    ) THEN
        ALTER TABLE org_volunteers DROP COLUMN channel_detail;
    END IF;
END $$;

-- ── Phase 7: Clean up org_profile_change_requests ────────────────────────────
-- Unify field+new_value (legacy) into the changes JSONB column, then drop legacy cols.

DO $$
BEGIN
    -- Migrate any rows that still use the old field/new_value pattern
    UPDATE org_profile_change_requests
    SET changes = jsonb_build_object(field, new_value)
    WHERE changes IS NULL AND field IS NOT NULL;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_profile_change_requests' AND column_name = 'field'
    ) THEN
        ALTER TABLE org_profile_change_requests DROP COLUMN field;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'org_profile_change_requests' AND column_name = 'new_value'
    ) THEN
        ALTER TABLE org_profile_change_requests DROP COLUMN new_value;
    END IF;

    -- changes is now required
    ALTER TABLE org_profile_change_requests
        ALTER COLUMN changes SET NOT NULL;
END $$;

-- ── Phase 8: Add new indexes for normalized tables ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_role                    ON users(role);
CREATE INDEX IF NOT EXISTS idx_org_admins_user_id            ON org_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_vol_skills_volunteer_id       ON volunteer_skills(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_vol_languages_volunteer_id    ON volunteer_languages(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_vol_cause_areas_volunteer_id  ON volunteer_cause_areas(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_vol_experiences_volunteer_id  ON volunteer_experiences(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_vol_availability_volunteer_id ON volunteer_availability(volunteer_id);

ANALYZE;

COMMIT;
