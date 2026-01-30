-- Cleanup Script for Debtsify
-- Run this ONLY if you want to completely reset your database
-- WARNING: This will delete ALL your data!

-- Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_installments_updated_at ON public.installments;
DROP TRIGGER IF EXISTS update_loans_updated_at ON public.loans;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Drop all policies
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own installments" ON public.installments;
DROP POLICY IF EXISTS "Users can update their own installments" ON public.installments;
DROP POLICY IF EXISTS "Users can create their own installments" ON public.installments;
DROP POLICY IF EXISTS "Users can view their own installments" ON public.installments;
DROP POLICY IF EXISTS "Users can delete their own loans" ON public.loans;
DROP POLICY IF EXISTS "Users can update their own loans" ON public.loans;
DROP POLICY IF EXISTS "Users can create their own loans" ON public.loans;
DROP POLICY IF EXISTS "Users can view their own loans" ON public.loans;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;

-- Drop all tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.installments CASCADE;
DROP TABLE IF EXISTS public.loans CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Now you can run schema.sql again to recreate everything fresh
