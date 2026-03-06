
-- Step 1: Add new enum values only (must be committed before use)
ALTER TYPE public.category_status ADD VALUE IF NOT EXISTS 'setup';
ALTER TYPE public.category_status ADD VALUE IF NOT EXISTS 'groups';
ALTER TYPE public.category_status ADD VALUE IF NOT EXISTS 'playoffs';
ALTER TYPE public.category_status ADD VALUE IF NOT EXISTS 'finished';
