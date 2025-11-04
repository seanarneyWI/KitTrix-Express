-- Migration: Add What-If Scenario Planning Tables
-- Date: October 30, 2025
-- Purpose: Enable users to create "what-if" scenarios for job scheduling exploration
-- Safety: ADDITIVE ONLY - No existing tables modified

-- ====================================================================
-- SCENARIOS TABLE
-- ====================================================================
-- Stores named scenario configurations for what-if planning
-- Users can create multiple scenarios and switch between them
-- Only one scenario can be active at a time per user session

CREATE TABLE scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT false
);

-- Index for finding active scenario quickly
CREATE INDEX idx_scenarios_active ON scenarios(is_active) WHERE is_active = true;

-- ====================================================================
-- SCENARIO_CHANGES TABLE
-- ====================================================================
-- Tracks all modifications within a scenario
-- Each change represents an ADD, MODIFY, or DELETE operation on a job
-- Changes are applied atomically when scenario is committed

CREATE TABLE scenario_changes (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  job_id TEXT,  -- NULL for new jobs (ADD), job ID for MODIFY/DELETE
  operation TEXT NOT NULL CHECK (operation IN ('ADD', 'MODIFY', 'DELETE')),
  change_data JSONB NOT NULL,  -- Stores job data or field changes
  original_data JSONB,  -- Stores original state for MODIFY/DELETE (for rollback)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX idx_scenario_changes_scenario ON scenario_changes(scenario_id);
CREATE INDEX idx_scenario_changes_job ON scenario_changes(job_id);
CREATE INDEX idx_scenario_changes_operation ON scenario_changes(operation);

-- ====================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ====================================================================
-- \dt scenarios
-- \dt scenario_changes
-- \d scenarios
-- \d scenario_changes

-- ====================================================================
-- ROLLBACK SQL (Document only - DO NOT EXECUTE unless reverting)
-- ====================================================================
-- DROP INDEX IF EXISTS idx_scenario_changes_operation;
-- DROP INDEX IF EXISTS idx_scenario_changes_job;
-- DROP INDEX IF EXISTS idx_scenario_changes_scenario;
-- DROP INDEX IF EXISTS idx_scenarios_active;
-- DROP TABLE IF EXISTS scenario_changes;
-- DROP TABLE IF EXISTS scenarios;

-- ====================================================================
-- TESTING QUERIES (Use these to test the structure)
-- ====================================================================
-- Test 1: Create a scenario
-- INSERT INTO scenarios (id, name, description, is_active)
-- VALUES ('test-scenario-1', 'Material Delay Test', 'Testing 2-week material delay impact', false);

-- Test 2: Add a change to scenario
-- INSERT INTO scenario_changes (id, scenario_id, job_id, operation, change_data)
-- VALUES ('test-change-1', 'test-scenario-1', NULL, 'ADD', '{"jobNumber": "TEST-001", "customerName": "Test Customer"}');

-- Test 3: Query scenario with changes
-- SELECT s.*, COUNT(sc.id) as change_count
-- FROM scenarios s
-- LEFT JOIN scenario_changes sc ON s.id = sc.scenario_id
-- GROUP BY s.id;

-- ====================================================================
-- NOTES
-- ====================================================================
-- 1. This migration is SAFE - only adds new tables, no existing data affected
-- 2. CASCADE delete ensures scenario_changes are removed when scenario is deleted
-- 3. JSONB allows flexible storage of job data without schema changes
-- 4. CHECK constraint ensures only valid operations (ADD, MODIFY, DELETE)
-- 5. Single active scenario enforced at application level (not database constraint)
-- 6. Compatible with shared motioPGDB database - no conflicts with other apps
