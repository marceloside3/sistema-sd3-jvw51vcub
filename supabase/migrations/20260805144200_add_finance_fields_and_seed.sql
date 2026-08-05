-- Add is_finance flag to profiles for future Finance module
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_finance BOOLEAN NOT NULL DEFAULT FALSE;

-- Add due_date, justification, is_urgent to finance_requests
ALTER TABLE public.finance_requests ADD COLUMN IF NOT EXISTS due_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.finance_requests ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE public.finance_requests ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE;

-- Re-ensure RLS policies on finance_requests (idempotent)
DROP POLICY IF EXISTS "finance_requests_select" ON public.finance_requests;
CREATE POLICY "finance_requests_select" ON public.finance_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );

DROP POLICY IF EXISTS "finance_requests_insert" ON public.finance_requests;
CREATE POLICY "finance_requests_insert" ON public.finance_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );

DROP POLICY IF EXISTS "finance_requests_update" ON public.finance_requests;
CREATE POLICY "finance_requests_update" ON public.finance_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );

DROP POLICY IF EXISTS "finance_requests_delete" ON public.finance_requests;
CREATE POLICY "finance_requests_delete" ON public.finance_requests
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );

-- Seed initial auth user (idempotent)
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'marcelo@side3.com.br') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'marcelo@side3.com.br',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Marcelo"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, full_name)
    VALUES (new_user_id, 'marcelo@side3.com.br', 'Marcelo')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
