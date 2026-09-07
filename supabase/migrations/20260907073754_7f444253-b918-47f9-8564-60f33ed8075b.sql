-- 1. Task parts + grading mode
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS grading_mode text NOT NULL DEFAULT 'weighted';

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS part_id text,
  ADD COLUMN IF NOT EXISTS weight numeric;

-- 2. Teacher notes (per question + general per task)
CREATE TABLE IF NOT EXISTS public.teacher_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_notes TO anon, authenticated;
GRANT ALL ON public.teacher_notes TO service_role;
ALTER TABLE public.teacher_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access teacher_notes" ON public.teacher_notes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS teacher_notes_unique_target
  ON public.teacher_notes (student_id, task_id, question_id) NULLS NOT DISTINCT;

CREATE TRIGGER update_teacher_notes_updated_at
  BEFORE UPDATE ON public.teacher_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Per-task speech permission
CREATE TABLE IF NOT EXISTS public.student_task_speech (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, task_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_task_speech TO anon, authenticated;
GRANT ALL ON public.student_task_speech TO service_role;
ALTER TABLE public.student_task_speech ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access student_task_speech" ON public.student_task_speech
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_student_task_speech_updated_at
  BEFORE UPDATE ON public.student_task_speech
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Feedback per task
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_unique_student;
CREATE UNIQUE INDEX IF NOT EXISTS feedback_unique_student_task
  ON public.feedback (student_id, task_id) NULLS NOT DISTINCT;

-- 5. Merge the parts-of-speech task into the opening-year task as part B
UPDATE public.questions SET part_id = 'a'
  WHERE task_id = '22222222-2222-4222-8222-000000000001' AND part_id IS NULL;

UPDATE public.answers SET task_id = '22222222-2222-4222-8222-000000000001'
  WHERE task_id = '6154bc09-b638-4b13-8027-578588386278';

UPDATE public.questions
  SET task_id = '22222222-2222-4222-8222-000000000001', part_id = 'b'
  WHERE task_id = '6154bc09-b638-4b13-8027-578588386278';

DELETE FROM public.task_completions WHERE task_id = '6154bc09-b638-4b13-8027-578588386278';
DELETE FROM public.task_grades WHERE task_id = '6154bc09-b638-4b13-8027-578588386278';

UPDATE public.tasks SET task_parts = jsonb_build_array(
    jsonb_build_object(
      'id', 'a',
      'title', 'חלק א׳ — הבנת הנקרא',
      'description', 'קריאת המאמר ומענה על כל השאלות.',
      'kind', 'questions',
      'selection_mode', 'all'
    ),
    jsonb_build_object(
      'id', 'b',
      'title', 'חלק ב׳ — זיהוי חלקי דיבר',
      'description', 'בוחרים 3 תרגילים מתוך 6 ומשלימים אותם.',
      'kind', 'parts_of_speech',
      'selection_mode', 'choose_n',
      'choose_count', 3
    )
  )
  WHERE id = '22222222-2222-4222-8222-000000000001';

DELETE FROM public.tasks WHERE id = '6154bc09-b638-4b13-8027-578588386278';