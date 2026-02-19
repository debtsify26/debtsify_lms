-- Add spreadsheet_id to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS spreadsheet_id TEXT;
