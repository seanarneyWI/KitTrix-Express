-- Migration: Add shifts table for shift-based calendar scheduling
-- Date: October 27, 2025
-- Description: Create shifts table to support user-definable work shifts

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  break_start TEXT,
  break_duration INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL,
  color TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on order for efficient sorting
CREATE INDEX IF NOT EXISTS shifts_order_idx ON shifts("order");

-- Create index on isActive for filtering active shifts
CREATE INDEX IF NOT EXISTS shifts_is_active_idx ON shifts(is_active);

-- Insert default 3 shifts
INSERT INTO shifts (id, name, start_time, end_time, break_start, break_duration, is_active, "order", color)
VALUES
  ('shift_first', 'First Shift', '07:00', '15:00', '11:00', 30, true, 1, '#e3f2fd'),
  ('shift_second', 'Second Shift', '15:00', '23:00', '19:00', 30, true, 2, '#fff3e0'),
  ('shift_third', 'Third Shift', '23:00', '07:00', '03:00', 30, true, 3, '#f3e5f5')
ON CONFLICT (id) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE shifts IS 'User-definable work shifts for calendar scheduling';
