-- Migration: Make scenarioId nullable in job_delays table
-- Purpose: Allow delays to be added to production jobs (scenarioId = NULL) or scenarios (scenarioId = value)
-- Date: 2025-11-09

-- Make scenario_id column nullable
ALTER TABLE job_delays ALTER COLUMN scenario_id DROP NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN job_delays.scenario_id IS 'NULL = production delay (applies to base job), non-null = scenario-specific delay (only applies in that scenario)';
