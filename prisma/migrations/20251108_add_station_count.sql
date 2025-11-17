-- Add station_count column to kitting_jobs table
-- Migration created: November 8, 2025
-- Purpose: Add planning station count to support multi-station job execution
--          Default to 1 station for all existing jobs

-- Add the column with default value
ALTER TABLE kitting_jobs
ADD COLUMN station_count INTEGER NOT NULL DEFAULT 1;

-- Add constraint to ensure valid station counts
ALTER TABLE kitting_jobs
ADD CONSTRAINT station_count_positive CHECK (station_count > 0);

-- Create index for potential future queries filtering by station count
CREATE INDEX idx_kitting_jobs_station_count ON kitting_jobs(station_count);

-- Rollback SQL (if needed):
-- DROP INDEX idx_kitting_jobs_station_count;
-- ALTER TABLE kitting_jobs DROP CONSTRAINT station_count_positive;
-- ALTER TABLE kitting_jobs DROP COLUMN station_count;
