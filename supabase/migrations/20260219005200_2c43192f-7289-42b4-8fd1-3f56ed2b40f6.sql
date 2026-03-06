
-- Step 2 (fixed): Create podium table and remaining setup

-- Update existing categories status
UPDATE public.categories SET status = 'setup' WHERE status = 'active';
UPDATE public.categories SET status = 'finished' WHERE status = 'archived';

-- Create the podium table
CREATE TABLE IF NOT EXISTS public.podium (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  first_place_id uuid REFERENCES public.teams(id),
  second_place_id uuid REFERENCES public.teams(id),
  third_place_id uuid REFERENCES public.teams(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);

-- Enable RLS on podium
ALTER TABLE public.podium ENABLE ROW LEVEL SECURITY;

-- RLS policies for podium
CREATE POLICY "Public read podium"
  ON public.podium FOR SELECT
  USING (true);

CREATE POLICY "Admins manage podium"
  ON public.podium FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for podium only (categories already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.podium;

-- Trigger for updated_at on matches
DROP TRIGGER IF EXISTS update_matches_updated_at ON public.matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for group_members max check
DROP TRIGGER IF EXISTS enforce_group_max_teams ON public.group_members;
CREATE TRIGGER enforce_group_max_teams
  BEFORE INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_group_max_teams();
