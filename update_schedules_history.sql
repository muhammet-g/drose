-- ============================================
-- SQL Migration: Add history tracking to schedules
-- ============================================
-- Run this in Supabase SQL Editor

-- 1. Add valid_from and valid_until columns
ALTER TABLE schedules ADD COLUMN valid_from DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE schedules ADD COLUMN valid_until DATE DEFAULT NULL;

-- 2. Update existing records to be valid from the past
UPDATE schedules SET valid_from = '2000-01-01' WHERE valid_from = CURRENT_DATE;

-- 3. Create index to speed up validity queries
CREATE INDEX idx_schedules_validity ON schedules(valid_from, valid_until);
