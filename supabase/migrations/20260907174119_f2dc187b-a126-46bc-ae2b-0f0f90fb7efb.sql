CREATE TABLE public.mi_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_slug text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mi_tasks TO anon, authenticated;
GRANT ALL ON public.mi_tasks TO service_role;
ALTER TABLE public.mi_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access mi_tasks" ON public.mi_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_mi_tasks_updated_at BEFORE UPDATE ON public.mi_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mi_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.mi_tasks(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  answer_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, task_id, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mi_answers TO anon, authenticated;
GRANT ALL ON public.mi_answers TO service_role;
ALTER TABLE public.mi_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access mi_answers" ON public.mi_answers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_mi_answers_updated_at BEFORE UPDATE ON public.mi_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mi_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.mi_tasks(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, task_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mi_submissions TO anon, authenticated;
GRANT ALL ON public.mi_submissions TO service_role;
ALTER TABLE public.mi_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access mi_submissions" ON public.mi_submissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.mi_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.mi_tasks(id) ON DELETE CASCADE,
  clarity_scale integer,
  learning_scale integer,
  explanation_scale integer,
  hardest_part text,
  still_unclear text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, task_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mi_feedback TO anon, authenticated;
GRANT ALL ON public.mi_feedback TO service_role;
ALTER TABLE public.mi_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access mi_feedback" ON public.mi_feedback FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_mi_feedback_updated_at BEFORE UPDATE ON public.mi_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mi_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.mi_tasks(id) ON DELETE CASCADE,
  item_key text,
  note text NOT NULL DEFAULT '',
  score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mi_notes_item_unique ON public.mi_notes (student_id, task_id, item_key) WHERE item_key IS NOT NULL;
CREATE UNIQUE INDEX mi_notes_general_unique ON public.mi_notes (student_id, task_id) WHERE item_key IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mi_notes TO anon, authenticated;
GRANT ALL ON public.mi_notes TO service_role;
ALTER TABLE public.mi_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access mi_notes" ON public.mi_notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_mi_notes_updated_at BEFORE UPDATE ON public.mi_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mi_student_speech (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.mi_tasks(id) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, task_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mi_student_speech TO anon, authenticated;
GRANT ALL ON public.mi_student_speech TO service_role;
ALTER TABLE public.mi_student_speech ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access mi_student_speech" ON public.mi_student_speech FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_mi_student_speech_updated_at BEFORE UPDATE ON public.mi_student_speech FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.mi_tasks (class_slug, is_active) VALUES ('10-1', false);