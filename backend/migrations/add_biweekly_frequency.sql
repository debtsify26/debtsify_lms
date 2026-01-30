-- Migration to add BIWEEKLY frequency option (15 days)
-- Run this SQL in your Supabase SQL Editor

-- Update the check constraint for frequency column in loans table
ALTER TABLE public.loans 
DROP CONSTRAINT IF EXISTS loans_frequency_check;

ALTER TABLE public.loans 
ADD CONSTRAINT loans_frequency_check 
CHECK (frequency IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'));

-- Verify the change was applied
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%loans%';
