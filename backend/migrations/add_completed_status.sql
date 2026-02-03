-- Update loans table to add COMPLETED status
-- Run this in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_status_check;

-- Add new constraint with COMPLETED status
ALTER TABLE public.loans ADD CONSTRAINT loans_status_check 
CHECK (status IN ('ACTIVE', 'COMPLETED', 'CLOSED', 'BAD_DEBT'));
