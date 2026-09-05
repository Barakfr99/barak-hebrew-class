ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS class_slug text,
  ADD COLUMN IF NOT EXISTS article_title text,
  ADD COLUMN IF NOT EXISTS source_note text,
  ADD COLUMN IF NOT EXISTS footnote text;

ALTER TABLE public.questions
  ALTER COLUMN points DROP DEFAULT,
  ALTER COLUMN points DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS note jsonb,
  ADD COLUMN IF NOT EXISTS passage text,
  ADD COLUMN IF NOT EXISTS paragraph_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS group_label text,
  ADD COLUMN IF NOT EXISTS parent_key text,
  ADD COLUMN IF NOT EXISTS input_size text NOT NULL DEFAULT 'short';

CREATE TABLE IF NOT EXISTS public.task_grades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  grade integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_id, task_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_grades TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_grades TO authenticated;
GRANT ALL ON public.task_grades TO service_role;

ALTER TABLE public.task_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open access task_grades" ON public.task_grades FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_task_grades_updated_at
BEFORE UPDATE ON public.task_grades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();