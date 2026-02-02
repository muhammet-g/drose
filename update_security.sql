-- ============================================
-- Security & Multi-Tenancy Migration Script
-- ============================================
-- Run this SQL in Supabase SQL Editor AFTER you have enabled Authentication
-- in your Supabase project (Authentication → Providers → Enable Email)
-- ============================================

-- ============================================
-- Step 1: Add user_id column to all tables
-- ============================================

-- Add user_id to students table
ALTER TABLE students
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to schedules table
ALTER TABLE schedules
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to attendance table
ALTER TABLE attendance
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- Step 2: Create indexes for user_id columns (Performance)
-- ============================================

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_schedules_user_id ON schedules(user_id);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);

-- ============================================
-- Step 3: Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 4: Create RLS Policies for STUDENTS table
-- ============================================

-- Policy: Users can view only their own students
CREATE POLICY "Users can view their own students"
ON students
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own students
CREATE POLICY "Users can insert their own students"
ON students
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own students
CREATE POLICY "Users can update their own students"
ON students
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own students
CREATE POLICY "Users can delete their own students"
ON students
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- Step 5: Create RLS Policies for SCHEDULES table
-- ============================================

-- Policy: Users can view only their own schedules
CREATE POLICY "Users can view their own schedules"
ON schedules
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own schedules
CREATE POLICY "Users can insert their own schedules"
ON schedules
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own schedules
CREATE POLICY "Users can update their own schedules"
ON schedules
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own schedules
CREATE POLICY "Users can delete their own schedules"
ON schedules
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- Step 6: Create RLS Policies for ATTENDANCE table
-- ============================================

-- Policy: Users can view only their own attendance records
CREATE POLICY "Users can view their own attendance"
ON attendance
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own attendance records
CREATE POLICY "Users can insert their own attendance"
ON attendance
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own attendance records
CREATE POLICY "Users can update their own attendance"
ON attendance
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own attendance records
CREATE POLICY "Users can delete their own attendance"
ON attendance
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- Step 7: Create function to automatically set user_id
-- ============================================
-- This function will automatically set user_id to the current authenticated user
-- when inserting new records, so the frontend doesn't need to explicitly set it

CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 8: Create triggers to auto-populate user_id
-- ============================================

-- Trigger for students table
CREATE TRIGGER set_students_user_id
  BEFORE INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Trigger for schedules table
CREATE TRIGGER set_schedules_user_id
  BEFORE INSERT ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Trigger for attendance table
CREATE TRIGGER set_attendance_user_id
  BEFORE INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- ============================================
-- Step 9: Update existing data (if any)
-- ============================================
-- IMPORTANT: If you have existing data in your tables, you need to assign
-- them to a user. If you're starting fresh, you can skip this section.

-- Example: Assign all existing records to a specific user
-- Replace 'YOUR_USER_ID_HERE' with an actual user UUID from auth.users

-- UPDATE students SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE schedules SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE attendance SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;

-- ============================================
-- Step 10: Make user_id NOT NULL (after assigning existing data)
-- ============================================
-- Run this ONLY after all existing records have a user_id assigned

-- ALTER TABLE students ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE schedules ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE attendance ALTER COLUMN user_id SET NOT NULL;

-- ============================================
-- VERIFICATION QUERIES (Optional - Run these to test)
-- ============================================

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN ('students', 'schedules', 'attendance');

-- Check policies
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- After running this script:
-- 1. Enable Email Authentication in Supabase Dashboard
-- 2. Test by creating a user and signing in
-- 3. The triggers will automatically set user_id on inserts
-- 4. RLS will ensure users only see their own data
-- ============================================
