-- Migration: 0001_add_cutoff_hours_before.sql
-- Purpose: Add optional per-slot cutoff_hours_before column to delivery_time_slots
-- Up: add column and populate sensible defaults (10h for early slots <=08:00, else 4h)
-- Down: drop the column (see bottom of file)

BEGIN;

-- Add nullable integer column
ALTER TABLE delivery_time_slots
  ADD COLUMN IF NOT EXISTS cutoff_hours_before integer;

-- Populate defaults for existing rows (set to 10 hours for morning slots <=08:00, else 4 hours)
UPDATE delivery_time_slots
SET cutoff_hours_before = CASE
  WHEN CAST(substring(start_time FROM 1 FOR 2) AS integer) <= 8 THEN 10
  ELSE 4
END
WHERE cutoff_hours_before IS NULL;

COMMIT;

-- ROLLBACK (manual):
-- To remove the column, run:
-- ALTER TABLE delivery_time_slots DROP COLUMN IF EXISTS cutoff_hours_before;
