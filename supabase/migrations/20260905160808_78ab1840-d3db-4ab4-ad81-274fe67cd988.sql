CREATE TABLE public.practice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  practice_name text NOT NULL DEFAULT 'תרגול הבנת הנקרא',
  teacher_code text NOT NULL DEFAULT '1234',
  speech_mode text NOT NULL DEFAULT 'two_tracks',
  required_choice_count integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT speech_mode_valid CHECK (speech_mode IN ('two_tracks','always','off'))
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  paragraphs jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_points integer NOT NULL DEFAULT 20,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_kind_valid CHECK (kind IN ('required','choice'))
);

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  kind text NOT NULL,
  prompt text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  points integer NOT NULL DEFAULT 5,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_kind_valid CHECK (kind IN ('open','multiple_choice'))
);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  class_name text,
  mode text NOT NULL DEFAULT 'regular',
  speech_enabled boolean NOT NULL DEFAULT false,
  stage text NOT NULL DEFAULT 'choice',
  choice_slot_1_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  choice_slot_2_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  grade_required integer,
  grade_choice_1 integer,
  grade_choice_2 integer,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_mode_valid CHECK (mode IN ('regular','adaptive')),
  CONSTRAINT grade_required_range CHECK (grade_required IS NULL OR (grade_required BETWEEN 0 AND 60)),
  CONSTRAINT grade_choice_1_range CHECK (grade_choice_1 IS NULL OR (grade_choice_1 BETWEEN 0 AND 20)),
  CONSTRAINT grade_choice_2_range CHECK (grade_choice_2 IS NULL OR (grade_choice_2 BETWEEN 0 AND 20))
);

CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT answers_unique_question UNIQUE (student_id, question_id)
);

CREATE TABLE public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_completions_unique UNIQUE (student_id, task_id)
);

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  clarity_scale integer,
  learning_scale integer,
  compare_lesson text,
  help_page_usage text,
  still_unclear text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_unique_student UNIQUE (student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_settings TO anon, authenticated;
GRANT ALL ON public.practice_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO anon, authenticated;
GRANT ALL ON public.questions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO anon, authenticated;
GRANT ALL ON public.students TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO anon, authenticated;
GRANT ALL ON public.answers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_completions TO anon, authenticated;
GRANT ALL ON public.task_completions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO anon, authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.practice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open access practice_settings" ON public.practice_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open access tasks" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open access questions" ON public.questions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open access students" ON public.students FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open access answers" ON public.answers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open access task_completions" ON public.task_completions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open access feedback" ON public.feedback FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;

INSERT INTO public.practice_settings (practice_name, teacher_code, speech_mode, required_choice_count)
VALUES ('תרגול הבנת הנקרא — תוכן דמו', '1234', 'two_tracks', 2);

INSERT INTO public.tasks (id, kind, title, description, paragraphs, max_points, sort_order) VALUES
('11111111-1111-4111-8111-000000000001','required','משימת חובה: רעיון מרכזי בקטע','קטע קריאה קצר ושאלות על הרעיון המרכזי ועל הסקת מסקנות.','["טקסט דמו: בכל טקסט יש רעיון מרכזי אחד שהכותב רוצה למסור. הרעיון המרכזי הוא לא כל פרט שמופיע בקטע. הוא המשפט שאפשר לומר בו במה עוסק הקטע כולו.","כדי למצוא את הרעיון המרכזי כדאי לקרוא את הפסקה הראשונה ואת הפסקה האחרונה. לרוב הכותב פותח ברעיון וחוזר אליו בסיום. אחר כך בודקים אם שאר הפסקאות תומכות ברעיון הזה.","פרטים תומכים הם דוגמאות, מספרים והסברים. הם חשובים אבל הם משרתים את הרעיון המרכזי ולא מחליפים אותו."]',60,0),
('11111111-1111-4111-8111-000000000002','choice','משימת בחירה 1: הבחנה בין עיקר לטפל','תרגול זיהוי מה עיקרי ומה פרט תומך בקטע קצר.','["טקסט דמו: בכיתה נערך סקר על שעות השינה של התלמידים. מתוך שלושים תלמידים ענו עשרים ושמונה.","רוב התלמידים דיווחו על שש שעות שינה בלילה בממוצע. חלקם ציינו שהם נשארים ערים בגלל הטלפון.","המסקנה של עורכי הסקר הייתה שתלמידים ישנים פחות מהמומלץ, ושהסיבה המרכזית קשורה לשימוש במסכים בשעות הלילה."]',20,1),
('11111111-1111-4111-8111-000000000003','choice','משימת בחירה 2: הסקת מסקנות','תרגול הסקת מסקנה שאינה כתובה במפורש בקטע.','["טקסט דמו: דנה יצאה מהבית בשש בבוקר עם מזוודה קטנה ומעיל עבה. היא הביטה בשעון פעמיים בדרך לתחנה.","באוטובוס היא חזרה וקראה דף מודפס ובו רשימה של פריטים. ליד שני פריטים היה סימון וי, וליד אחד היה סימן שאלה.","כשהגיעה לתחנה המרכזית היא נשמה עמוק וחייכה."]',20,2),
('11111111-1111-4111-8111-000000000004','choice','משימת בחירה 3: מבנה הפסקה','תרגול זיהוי משפט פותח ומשפטי הרחבה בפסקה.','["טקסט דמו: פסקה טובה נפתחת במשפט שמציג את הנושא שלה. המשפט הזה נקרא משפט פותח.","אחרי המשפט הפותח באים משפטי הרחבה. הם מסבירים, מדגימים או מוכיחים את מה שנאמר בפתיחה.","לעיתים הפסקה נחתמת במשפט מסכם שחוזר לרעיון של הפתיחה במילים אחרות."]',20,3),
('11111111-1111-4111-8111-000000000005','choice','משימת בחירה 4: מילות קישור','תרגול זיהוי הקשר הלוגי שמילת הקישור יוצרת.','["טקסט דמו: מילות קישור הן מילים קטנות שמחברות בין רעיונות. הן מסמנות לקורא איזה סוג של קשר יש בין שני חלקי הטקסט.","המילים אבל ואולם מסמנות ניגוד. המילים לכן ולפיכך מסמנות תוצאה. המילים למשל וכגון מסמנות דוגמה.","מי שמזהה את מילות הקישור מבין את מהלך הטקסט גם כשהמשפטים ארוכים."]',20,4),
('11111111-1111-4111-8111-000000000006','choice','משימת בחירה 5: עמדת הכותב','תרגול זיהוי עמדה ורגש בטקסט טיעון.','["טקסט דמו: בעיר החליטו לסגור רחוב אחד למכוניות ולהפוך אותו לרחוב להליכה בלבד.","יש הטוענים שהמעבר יפגע בחנויות ברחוב, כי לקוחות לא יוכלו לחנות בקרבת מקום.","לעומתם, אחרים מזכירים שברחובות הליכה עולה מספר המבקרים, והשהות בהם ארוכה יותר. לדעתי, כדאי לנסות את המתווה לחצי שנה ואז להחליט."]',20,5);

INSERT INTO public.questions (task_id, kind, prompt, options, points, sort_order) VALUES
('11111111-1111-4111-8111-000000000001','open','מהו הרעיון המרכזי של הקטע? כתבו במשפט אחד.','[]'::jsonb,20,0),
('11111111-1111-4111-8111-000000000001','multiple_choice','לפי הקטע, איפה כדאי לחפש את הרעיון המרכזי?','["רק בכותרת","בפסקה הראשונה ובפסקה האחרונה","בפרטים המספריים","במשפט הארוך ביותר"]'::jsonb,20,1),
('11111111-1111-4111-8111-000000000001','open','הסבירו במשפט אחד מה תפקידם של הפרטים התומכים.','[]'::jsonb,20,2),
('11111111-1111-4111-8111-000000000002','multiple_choice','מה הפרט העיקרי בקטע?','["כמה תלמידים ענו לסקר","המסקנה על שעות שינה ומסכים","שהסקר נערך בכיתה","שחלק מהתלמידים מחזיקים טלפון"]'::jsonb,10,0),
('11111111-1111-4111-8111-000000000002','open','ציינו פרט אחד שהוא תומך בלבד, והסבירו מדוע.','[]'::jsonb,10,1),
('11111111-1111-4111-8111-000000000003','multiple_choice','מה אפשר להסיק מהקטע?','["דנה יצאה לנסיעה שהתכוננה אליה","דנה איחרה לבית הספר","דנה עברה דירה","דנה חיפשה עבודה"]'::jsonb,10,0),
('11111111-1111-4111-8111-000000000003','open','אילו שני פרטים בקטע הובילו אתכם למסקנה?','[]'::jsonb,10,1),
('11111111-1111-4111-8111-000000000004','multiple_choice','מהו תפקידו של משפט פותח?','["להביא דוגמה","להציג את נושא הפסקה","לסיים את הפסקה","להאריך את הטקסט"]'::jsonb,10,0),
('11111111-1111-4111-8111-000000000004','open','כתבו משפט פותח לפסקה בנושא שאתם מכירים.','[]'::jsonb,10,1),
('11111111-1111-4111-8111-000000000005','multiple_choice','איזה קשר מסמנת המילה "לכן"?','["ניגוד","תוצאה","דוגמה","זמן"]'::jsonb,10,0),
('11111111-1111-4111-8111-000000000005','open','כתבו משפט שבו מופיעה מילת קישור שמסמנת ניגוד.','[]'::jsonb,10,1),
('11111111-1111-4111-8111-000000000006','multiple_choice','מהי עמדת הכותב בקטע?','["להתנגד לסגירת הרחוב","לתמוך בניסיון של חצי שנה","להישאר בלי עמדה","לסגור את כל רחובות העיר"]'::jsonb,10,0),
('11111111-1111-4111-8111-000000000006','open','מהו הטיעון החזק ביותר לדעתכם בקטע, ומדוע?','[]'::jsonb,10,1);