CREATE OR REPLACE FUNCTION public.student_register(
  p_class_slug text,
  p_class_name text,
  p_first_name text,
  p_last_name text,
  p_password text,
  p_speech_enabled boolean DEFAULT true,
  p_mode text DEFAULT 'regular'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid;
  v_has_cred boolean;
BEGIN
  SELECT id INTO v_id
  FROM public.students
  WHERE class_slug = p_class_slug
    AND lower(btrim(first_name)) = lower(btrim(p_first_name))
    AND lower(btrim(last_name)) = lower(btrim(p_last_name))
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.student_credentials WHERE student_id = v_id) INTO v_has_cred;
    IF v_has_cred THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'exists');
    END IF;
    INSERT INTO public.student_credentials (student_id, password_hash)
    VALUES (v_id, extensions.crypt(p_password, extensions.gen_salt('bf', 10)));
    UPDATE public.students
      SET class_name = p_class_name,
          mode = p_mode,
          speech_enabled = p_speech_enabled,
          must_reset_password = false,
          updated_at = now()
      WHERE id = v_id;
    RETURN jsonb_build_object('ok', true, 'student_id', v_id);
  END IF;

  INSERT INTO public.students (first_name, last_name, class_name, class_slug, mode, speech_enabled)
  VALUES (btrim(p_first_name), btrim(p_last_name), p_class_name, p_class_slug, p_mode, p_speech_enabled)
  RETURNING id INTO v_id;

  INSERT INTO public.student_credentials (student_id, password_hash)
  VALUES (v_id, extensions.crypt(p_password, extensions.gen_salt('bf', 10)));

  RETURN jsonb_build_object('ok', true, 'student_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.student_login(p_student_id uuid, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_must boolean;
  v_hash text;
BEGIN
  SELECT must_reset_password INTO v_must FROM public.students WHERE id = p_student_id;
  IF v_must IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_must THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'must_reset');
  END IF;

  SELECT password_hash INTO v_hash FROM public.student_credentials WHERE student_id = p_student_id;
  IF v_hash IS NULL THEN
    UPDATE public.students SET must_reset_password = true, updated_at = now() WHERE id = p_student_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'must_reset');
  END IF;

  IF extensions.crypt(p_password, v_hash) = v_hash THEN
    RETURN jsonb_build_object('ok', true, 'student_id', p_student_id);
  END IF;
  RETURN jsonb_build_object('ok', false, 'reason', 'bad_password');
END;
$$;

CREATE OR REPLACE FUNCTION public.student_set_password(p_student_id uuid, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_must boolean;
BEGIN
  SELECT must_reset_password INTO v_must FROM public.students WHERE id = p_student_id;
  IF v_must IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF NOT v_must THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_allowed');
  END IF;

  INSERT INTO public.student_credentials (student_id, password_hash)
  VALUES (p_student_id, extensions.crypt(p_password, extensions.gen_salt('bf', 10)))
  ON CONFLICT (student_id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash, updated_at = now();

  UPDATE public.students SET must_reset_password = false, updated_at = now() WHERE id = p_student_id;
  RETURN jsonb_build_object('ok', true, 'student_id', p_student_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.student_clear_password(p_student_id uuid, p_teacher_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_expected text;
BEGIN
  SELECT teacher_code INTO v_expected
  FROM public.practice_settings
  WHERE is_active
  ORDER BY created_at DESC
  LIMIT 1;

  IF btrim(p_teacher_code) <> coalesce(v_expected, '5598956') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_code');
  END IF;

  DELETE FROM public.student_credentials WHERE student_id = p_student_id;
  UPDATE public.students SET must_reset_password = true, updated_at = now() WHERE id = p_student_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_register(text, text, text, text, text, boolean, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_login(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_set_password(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_clear_password(uuid, text) TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_credentials TO service_role;