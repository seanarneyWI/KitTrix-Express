-- Migration: Add execution interface preference to kitting jobs
-- Date: 2025-10-25
-- Author: Claude Code
-- Description: Adds ExecutionInterface enum and executionInterface field to kitting_jobs table
--
-- SAFETY: This migration only ADDS new enum type and column. No data is destroyed.
--
-- Rollback SQL (if needed):
-- ALTER TABLE kitting_jobs DROP COLUMN execution_interface;
-- DROP TYPE "ExecutionInterface";

-- Step 1: Create the ExecutionInterface enum type
CREATE TYPE "ExecutionInterface" AS ENUM ('STEPS', 'TARGET', 'BASIC');

-- Step 2: Add execution_interface column to kitting_jobs table
-- Default to STEPS to maintain backward compatibility
ALTER TABLE kitting_jobs
ADD COLUMN execution_interface "ExecutionInterface" DEFAULT 'STEPS' NOT NULL;

-- Step 3: Update existing jobs to use TARGET interface (per user request)
-- This preserves the current behavior where users were toggling to circular view
UPDATE kitting_jobs
SET execution_interface = 'TARGET'
WHERE execution_interface = 'STEPS'; -- Update all current jobs

-- Step 4: Verify the changes
-- Run these queries to confirm migration success:
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'kitting_jobs' AND column_name = 'execution_interface';
-- SELECT execution_interface, COUNT(*) FROM kitting_jobs GROUP BY execution_interface;

-- Migration complete
-- Next step: Run `npx prisma generate` to update Prisma client
