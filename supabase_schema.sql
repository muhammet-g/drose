-- ============================================
-- Private Tutor Management System - Database Schema
-- ============================================
-- Run this SQL in Supabase SQL Editor before starting the application
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: students
-- ============================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster name searches
CREATE INDEX idx_students_name ON students(name);

-- ============================================
-- Table: schedules
-- ============================================
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Composite index for efficient conflict detection queries
CREATE INDEX idx_schedules_day_time ON schedules(day_of_week, start_time, end_time);
CREATE INDEX idx_schedules_student ON schedules(student_id);

-- ============================================
-- Table: attendance
-- ============================================
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'excused', 'postponed');

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent duplicate attendance records for same student on same date
CREATE UNIQUE INDEX idx_attendance_unique ON attendance(student_id, date);

-- Index for date-based queries
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_student ON attendance(student_id);

-- ============================================
-- Trigger: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================
-- Uncomment the lines below to insert sample data

-- INSERT INTO students (name) VALUES 
--   ('أحمد محمد'),
--   ('فاطمة علي'),
--   ('محمد حسن');

-- INSERT INTO schedules (student_id, day_of_week, start_time, end_time) VALUES
--   ((SELECT id FROM students WHERE name = 'أحمد محمد'), 0, '09:00', '10:30'),
--   ((SELECT id FROM students WHERE name = 'فاطمة علي'), 0, '11:00', '12:30'),
--   ((SELECT id FROM students WHERE name = 'محمد حسن'), 1, '14:00', '15:30');

-- INSERT INTO attendance (student_id, date, status) VALUES
--   ((SELECT id FROM students WHERE name = 'أحمد محمد'), CURRENT_DATE, 'present'),
--   ((SELECT id FROM students WHERE name = 'فاطمة علي'), CURRENT_DATE, 'absent');
