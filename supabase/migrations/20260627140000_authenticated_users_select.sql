-- Ensure authenticated users can select from public.users to populate the participant list
DROP POLICY IF EXISTS "authenticated_select_users" ON public.users;
CREATE POLICY "authenticated_select_users" ON public.users
  FOR SELECT TO authenticated USING (true);
