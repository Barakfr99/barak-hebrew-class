CREATE POLICY "Server service manages student credentials"
ON public.student_credentials
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
