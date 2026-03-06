
-- Drop the permissive policy that allows anyone to insert their own admin role
DROP POLICY IF EXISTS "Allow initial role insert" ON public.user_roles;

-- Create a secure function to bootstrap the first admin (used by edge function with service role)
-- No client-callable RLS bypass remains
