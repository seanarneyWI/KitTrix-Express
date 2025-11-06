-- Migration: Add JobDelay table for Y scenario delay injection
-- Date: 2025-11-05
-- Safety: ✅ SAFE - Creates new KitTrix-owned table only
-- Rollback: DROP TABLE job_delays;

-- Create job_delays table for scenario-based delay planning
CREATE TABLE job_delays (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  insert_after INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint to scenarios table
ALTER TABLE job_delays
ADD CONSTRAINT job_delays_scenario_id_fkey
FOREIGN KEY (scenario_id)
REFERENCES scenarios(id)
ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX job_delays_scenario_id_idx ON job_delays(scenario_id);
CREATE INDEX job_delays_job_id_idx ON job_delays(job_id);

-- Comments for documentation
COMMENT ON TABLE job_delays IS 'Delays injected into job route steps for Y scenario planning';
COMMENT ON COLUMN job_delays.name IS 'Human-readable delay name (e.g., "Equipment maintenance")';
COMMENT ON COLUMN job_delays.duration IS 'Delay duration in seconds';
COMMENT ON COLUMN job_delays.insert_after IS 'Insert delay after this route step order number';
