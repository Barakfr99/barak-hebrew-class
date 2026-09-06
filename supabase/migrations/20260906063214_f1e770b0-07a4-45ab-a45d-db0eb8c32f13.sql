ALTER TABLE public.student_credentials ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_credentials TO service_role;
