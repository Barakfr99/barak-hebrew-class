ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS closes_at timestamptz;