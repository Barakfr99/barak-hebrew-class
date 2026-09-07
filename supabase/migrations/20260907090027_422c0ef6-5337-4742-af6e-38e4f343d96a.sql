CREATE TABLE public.nb10_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT false,
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nb10_tasks TO anon, authenticated;
GRANT ALL ON public.nb10_tasks TO service_role;
ALTER TABLE public.nb10_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access nb10_tasks" ON public.nb10_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_nb10_tasks_updated_at BEFORE UPDATE ON public.nb10_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.nb10_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.nb10_tasks(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  answer_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, task_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nb10_answers TO anon, authenticated;
GRANT ALL ON public.nb10_answers TO service_role;
ALTER TABLE public.nb10_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access nb10_answers" ON public.nb10_answers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_nb10_answers_updated_at BEFORE UPDATE ON public.nb10_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.nb10_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.nb10_tasks(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, task_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nb10_submissions TO anon, authenticated;
GRANT ALL ON public.nb10_submissions TO service_role;
ALTER TABLE public.nb10_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access nb10_submissions" ON public.nb10_submissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.nb10_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.nb10_tasks(id) ON DELETE CASCADE,
  clarity_scale integer,
  learning_scale integer,
  assistant_scale integer,
  compare_lesson text,
  help_page_usage text,
  still_unclear text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, task_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nb10_feedback TO anon, authenticated;
GRANT ALL ON public.nb10_feedback TO service_role;
ALTER TABLE public.nb10_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access nb10_feedback" ON public.nb10_feedback FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_nb10_feedback_updated_at BEFORE UPDATE ON public.nb10_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.nb10_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.nb10_tasks(id) ON DELETE CASCADE,
  question_id text,
  note text NOT NULL DEFAULT '',
  score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, task_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nb10_notes TO anon, authenticated;
GRANT ALL ON public.nb10_notes TO service_role;
ALTER TABLE public.nb10_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access nb10_notes" ON public.nb10_notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_nb10_notes_updated_at BEFORE UPDATE ON public.nb10_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();