-- Migration: Add Multi-Station Tracking Support
-- Date: 2025-10-25
-- Description: Enables multiple work stations to work on the same job simultaneously
--              by tracking which station completed which kit
--
-- Tables Affected (KitTrix-owned, safe to modify):
-- - job_progress: Add next_station_number counter
-- - kit_executions: Add station_number and station_name tracking
--
-- ✅ SAFETY: Only using ADD COLUMN (no DROP or ALTER TYPE)
-- ✅ SAFETY: Only modifying KitTrix-owned tables
-- ✅ SAFETY: Using defaults and nullable columns to protect existing data

-- =============================================================================
-- FORWARD MIGRATION
-- =============================================================================

-- Add station counter to job_progress
-- Auto-increments each time a new execution interface opens for a job
ALTER TABLE job_progress
ADD COLUMN next_station_number INTEGER DEFAULT 0 NOT NULL;

-- Add station tracking to kit_executions
-- Records which station completed each kit
ALTER TABLE kit_executions
ADD COLUMN station_number INTEGER;

ALTER TABLE kit_executions
ADD COLUMN station_name VARCHAR(50);

-- Add helpful comments
COMMENT ON COLUMN job_progress.next_station_number IS 'Auto-incrementing counter for assigning station numbers to execution interfaces';
COMMENT ON COLUMN kit_executions.station_number IS 'Numeric ID of the station that completed this kit (1, 2, 3, etc.)';
COMMENT ON COLUMN kit_executions.station_name IS 'Display name of the station (e.g., "Station 1", "Station 2")';

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================

-- ROLLBACK SQL (uncomment to reverse this migration):
-- ALTER TABLE kit_executions DROP COLUMN station_name;
-- ALTER TABLE kit_executions DROP COLUMN station_number;
-- ALTER TABLE job_progress DROP COLUMN next_station_number;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify columns were added:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'job_progress' AND column_name = 'next_station_number';
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'kit_executions' AND column_name IN ('station_number', 'station_name');
