-- Stores financeiro-specific demand fields (cliente, cnpj, tipo de emissão, valor,
-- prazo de pagamento, descrição da NF, observações) when a demand targets the
-- Financeiro area. Nullable jsonb; existing rows stay null.
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS financial_data JSONB;
