-- Migration: Add payment method, bank details and boleto attachment to finance_requests
-- Date: 2026-09-04

ALTER TABLE public.finance_requests
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS boleto_url TEXT,
  ADD COLUMN IF NOT EXISTS boleto_file_name TEXT;

-- Index on payment_method for reporting if needed
CREATE INDEX IF NOT EXISTS idx_finance_requests_payment_method ON public.finance_requests (payment_method);
