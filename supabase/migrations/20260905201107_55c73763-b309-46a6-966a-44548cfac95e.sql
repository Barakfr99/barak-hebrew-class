ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS task_kind_valid;
ALTER TABLE public.tasks ADD CONSTRAINT task_kind_valid CHECK (kind IN ('required', 'choice', 'parts_of_speech'));

INSERT INTO public.tasks (kind, class_slug, title, description, paragraphs, max_points, sort_order, is_active, help_sections)
VALUES (
  'parts_of_speech',
  '11-1',
  'זיהוי חלקי דיבר',
  'תרגול קצר לזיהוי שם עצם, פועל, שם הפועל ותואר — כל המשפטים מתוך המאמר "התחלות חדשות". בוחרים 3 תרגילים מתוך 6.',
  '[]'::jsonb,
  100,
  2,
  true,
  '[]'::jsonb
);

INSERT INTO public.questions (task_id, kind, prompt, options, points, sort_order, group_label, input_size)
SELECT t.id, 'open', v.prompt, '[]'::jsonb, NULL, v.sort_order, v.group_label, 'long'
FROM public.tasks t
CROSS JOIN (VALUES
  ('selection', 'התרגילים שנבחרו (3 מתוך 6)', 0),
  ('ex1', 'תרגיל 1 — איתור 6 שמות עצם בקטע מתוך פסקה 4', 1),
  ('ex2', 'תרגיל 2 — איתור 6 פעלים בקטע מתוך פסקה 1', 2),
  ('ex3', 'תרגיל 3 — איתור 6 שמות פועל בקטע מתוך פסקאות 5–6', 3),
  ('ex4', 'תרגיל 4 — איתור 6 תארים בקטע מתוך פסקה 2', 4),
  ('ex5', 'תרגיל 5 — הפיכת פועל לשם פועל ולהפך', 5),
  ('ex6', 'תרגיל 6 — מיון משולב של 10 מילים מסומנות', 6)
) AS v(group_label, prompt, sort_order)
WHERE t.kind = 'parts_of_speech' AND t.class_slug = '11-1';