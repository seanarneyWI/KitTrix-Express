-- Migration: Add Per-Job Scheduling Configuration
-- Date: 2025-10-28
-- Table: kitting_jobs (KitTrix-owned, safe to modify)
-- Operation: ADD COLUMN (safe, non-destructive)
--
-- Purpose:
--   Allow individual jobs to specify which shifts they can run on
--   and whether to include weekends in scheduling calculations.
--
-- Default Behavior (backward compatible):
--   - allowed_shift_ids = '{}' (empty array) → uses global active shifts
--   - include_weekends = false → Monday-Friday only
--
-- Example Use Cases:
--   1. Normal job: empty array + no weekends (current behavior)
--   2. Rush job: [shift1, shift2] + no weekends (faster completion)
--   3. Critical rush: [shift1, shift2, shift3] + weekends (maximum speed)

-- ==========================================
-- FORWARD MIGRATION (Add Columns)
-- ==========================================

-- Add allowed_shift_ids column (array of shift IDs)
ALTER TABLE kitting_jobs
ADD COLUMN IF NOT EXISTS allowed_shift_ids TEXT[] DEFAULT '{}';

COMMENT ON COLUMN kitting_jobs.allowed_shift_ids IS
  'Array of shift IDs this job can be scheduled on. Empty array = use global active shifts';

-- Add include_weekends column (boolean flag)
ALTER TABLE kitting_jobs
ADD COLUMN IF NOT EXISTS include_weekends BOOLEAN DEFAULT false;

COMMENT ON COLUMN kitting_jobs.include_weekends IS
  'Whether to schedule this job on weekends (Saturday/Sunday). Default false = weekdays only';

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'kitting_jobs'
  AND column_name IN ('allowed_shift_ids', 'include_weekends');

-- Expected Output:
--   allowed_shift_ids | ARRAY      | '{}'::text[]
--   include_weekends  | boolean    | false

-- ==========================================
-- ROLLBACK INSTRUCTIONS
-- ==========================================

-- If you need to rollback this migration, run:
--
-- ALTER TABLE kitting_jobs DROP COLUMN IF EXISTS allowed_shift_ids;
-- ALTER TABLE kitting_jobs DROP COLUMN IF EXISTS include_weekends;
--
-- WARNING: This will lose any per-job scheduling config that was set.
-- Jobs will revert to using global active shifts and weekdays only.
