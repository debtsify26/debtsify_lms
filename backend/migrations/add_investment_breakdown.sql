-- Add Investment Breakdown Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.investment_breakdown (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    person TEXT NOT NULL,
    start_date DATE NOT NULL,
    cycle TEXT NOT NULL,
    capital DECIMAL(15, 2) NOT NULL,
    interest_percentage DECIMAL(5, 2) NOT NULL,
    received DECIMAL(15, 2) DEFAULT 0,
    mkt_principal DECIMAL(15, 2) DEFAULT 0,
    mkt_interest DECIMAL(15, 2) DEFAULT 0,
    total_market_value DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_investment_breakdown_user_id ON public.investment_breakdown(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_breakdown_loan_id ON public.investment_breakdown(loan_id);

-- Enable RLS
ALTER TABLE public.investment_breakdown ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own investment breakdowns"
    ON public.investment_breakdown
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investment breakdowns"
    ON public.investment_breakdown
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment breakdowns"
    ON public.investment_breakdown
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment breakdowns"
    ON public.investment_breakdown
    FOR DELETE
    USING (auth.uid() = user_id);
