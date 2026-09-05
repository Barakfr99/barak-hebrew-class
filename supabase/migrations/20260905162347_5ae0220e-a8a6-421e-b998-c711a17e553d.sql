ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS help_sections jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_slug text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS must_reset_password boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS students_class_name_unique
  ON public.students (class_slug, lower(first_name), lower(last_name))
  WHERE class_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.student_credentials (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.student_credentials TO service_role;

ALTER TABLE public.student_credentials ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_student_credentials_updated_at ON public.student_credentials;
CREATE TRIGGER update_student_credentials_updated_at
BEFORE UPDATE ON public.student_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();