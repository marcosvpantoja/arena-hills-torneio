
-- Allow users to insert their own role (needed for first-time admin registration)
-- In production this should be restricted, but for tournament setup we allow self-registration
CREATE POLICY "Allow initial role insert" ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to manage all roles
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
