-- מנוע המשימות הגנרי ("runner"): שלוש טבלאות משותפות לכל משימה עתידית
-- שמוגדרת כ-JSON בעמודת tasks.definition — בלי טבלה חדשה לכל משימה.
-- item_key הוא מזהה חופשי בתוך הגדרת המשימה (למשל "p1_main.0" או "feedback.clarity_scale").

create table if not exists public.runner_answers (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  item_key text not null,
  answer_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, student_id, item_key)
);

create table if not exists public.runner_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  unique (task_id, student_id)
);

-- item_key = null היא הערה/ציון כלליים על המשימה כולה (כמו ב-mi_notes).
create table if not exists public.runner_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  item_key text,
  note text not null default '',
  score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists runner_notes_item_unique
  on public.runner_notes (task_id, student_id, item_key)
  where item_key is not null;
create unique index if not exists runner_notes_general_unique
  on public.runner_notes (task_id, student_id)
  where item_key is null;

alter table public.runner_answers enable row level security;
alter table public.runner_submissions enable row level security;
alter table public.runner_notes enable row level security;

drop policy if exists "open access" on public.runner_answers;
create policy "open access" on public.runner_answers for all using (true) with check (true);
drop policy if exists "open access" on public.runner_submissions;
create policy "open access" on public.runner_submissions for all using (true) with check (true);
drop policy if exists "open access" on public.runner_notes;
create policy "open access" on public.runner_notes for all using (true) with check (true);
-- משימת הוכחת-היתכנות למנוע ה-runner: אותו תוכן בדיוק כמו "התחלות חדשות",
-- אבל דרך tasks.definition (JSON) במקום קוד ייעודי. לא פעילה כברירת מחדל —
-- ברק יכול להפעיל אותה מלוח המורה (כיתה י' 1) כדי להשוות מול המקור.
insert into public.tasks (
  id, kind, title, description, class_slug, space_id, engine,
  grading_mode, is_active, created_at, published_at, sort_order, definition
)
select
  gen_random_uuid(), 'standalone', 'התחלות חדשות (הדגמת מנוע JSON)',
  'הדגמה טכנית: אותו תוכן בדיוק כמו "התחלות חדשות", מוגש דרך מנוע המשימות הגנרי (runner) לפי הגדרת JSON.',
  '10-1', s.id, 'runner',
  'submission', false, now(), now(), 0,
  '{"version":1,"articleTitle":"התחלות חדשות","paragraphs":["רבים אינם חוששים מ\"התחלה\" עצמה, אלא מהשינוי שמתלווה אליה. שינוי הוא נושא כל כך רחב, שבמקום לחשוב עליו באופן כללי, אנחנו נוטים להתמקד ב\"התחלה\" הספציפית — למידה במסגרת חדשה, מעבר דירה, או עבודה חדשה. במבט ראשון אלה מצבים שונים לגמרי, אך לכולם יש מכנה משותף: מעבר ממצב מוכר למצב חדש, מעבר שדורש הסתגלות. בכל פעם שמשהו גורם לנו לראות את העולם אחרת מכפי שהכרנו אותו, אנחנו חווים שינוי.","יש דרכים שונות להתמודד עם שינוי — יש שחוששים ממנו, ויש שמשתמשים בו כדי לצמוח. הפחד נובע בעיקר מחוסר ודאות: לא תמיד ברור איך השינוי ישפיע על חיינו. אנחנו נוטים לחשוב עליו בקיצוניות — \"טוב\" או \"רע\" — אבל בכל שינוי יש גם וגם, ולרוב אנחנו מתמקדים רק בצד אחד. לדוגמה: אתם הולכים ברחוב מוכר, ופתאום מגלים שהוא חסום בגלל עבודות תשתית. זה לא נשמע דרמטי, אבל הדרך הישנה כבר לא זמינה, ועולות שאלות כמו: לאן מובילה הדרך החדשה? כמה זמן היא תיקח? האם היא בטוחה?","כשאנחנו נתקלים במשהו חדש ולא מוכר, זה מפחיד — כי אנחנו מתחייבים לתהליך בלי לדעת מה תהיה התוצאה שלו. קשה לדעת מראש איך נסתדר בבית ספר חדש, או אם נעמוד בציפיות בתפקיד חדש. גם ציר הזמן מוסיף לחשש: כל התחלה תיגמר מתישהו, כלומר יבוא שלב שבו נתרגל ונפסיק לפחד — אבל עד אז יש חוסר ודאות: מתי בדיוק זה יקרה? איך נרגיש בדרך?","אי אפשר לשנות את האופן שבו המוח שלנו מגיב לשינוי, אבל אפשר ללמוד להתמודד איתו טוב יותר. ראשית, כדאי לקבל שהמתח שמלווה שינוי הוא טבעי ובלתי נמנע — אי-נעימות לא צריכה לעצור אתכם. שנית, אפשר לחשוב על שינוי כתהליך של שדרוג: כמו מערכת הפעלה שמתעדכנת, גם אנחנו לפעמים צריכים \"לעדכן\" הרגלים ישנים כדי לתפקד בסביבה החדשה. ולבסוף — כדאי לחפש את הצדדים הטובים שבמצב החדש; התמקדות רק במה שאבד מונעת מאיתנו לראות מה אפשר להרוויח."],"pages":[{"title":"פסקה 1 — הרעיון המרכזי ומילות הקישור","paragraph":1,"questions":[{"kind":"guided","id":"p1_main","label":"מהו הרעיון המרכזי של פסקה 1? השלימו את המשפטים:","lines":["הפסקה עוסקת בעיקר ב:","והרעיון שהיא רוצה להעביר הוא ש-"]},{"kind":"open","id":"p1_connector","prompt":"בפסקה 1 מופיעה מילת קישור המציגה ניגוד/סתירה. מהי המילה?","rows":2}]},{"title":"פסקה 2 — הרעיון המרכזי ולשון ציורית","paragraph":2,"questions":[{"kind":"guided","id":"p2_main","label":"מהו הרעיון המרכזי של פסקה 2? השלימו את המשפטים:","lines":["הפסקה עוסקת בעיקר ב:","והרעיון שהיא רוצה להעביר הוא ש-"]},{"kind":"open","id":"p2_figurative","prompt":"בפסקה 2 הכותב משתמש בלשון ציורית המתארת מצב דמיוני כדי להמחיש את הקושי שבשינוי. הביאו דוגמה מתאימה מפסקה זו.","rows":4,"term":{"title":"לשון ציורית","body":"לשון המשתמשת בביטויים ציוריים, כמו דימויים, מטפורות, האנשות."}}]},{"title":"פסקה 3 — הרעיון המרכזי ותפקיד מילת קישור","paragraph":3,"questions":[{"kind":"open","id":"p3_main","prompt":"מהו הרעיון המרכזי של פסקה 3? כתבו במשפט או שניים.","rows":4},{"kind":"choice","id":"p3_connector","prompt":"בפסקה 3 נכתב: \"כל התחלה תיגמר מתישהו, כלומר יבוא שלב שבו נתרגל ונפסיק לפחד\". מה תפקידה של המילה \"כלומר\" במשפט?","options":["ניגוד","הסבר וניסוח מחדש","הוספת מידע חדש","סיבה ותוצאה"]}]},{"title":"פסקה 4 — הרעיון המרכזי ותפקיד מילות קישור","paragraph":4,"questions":[{"kind":"open","id":"p4_main","prompt":"מהו הרעיון המרכזי של פסקה 4? כתבו במשפט או שניים.","rows":4},{"kind":"choice","id":"p4_connector","prompt":"בפסקה 4 מופיעות המילים \"ראשית\", \"שנית\" ו\"לבסוף\". מה תפקידן של המילים האלה בפסקה?","options":["ניגוד","סימון סדר ורצף","סיבה ותוצאה","השוואה"]}]},{"title":"מטרת הטקסט","questions":[{"kind":"choice","id":"purpose","prompt":"מהי מטרתו העיקרית של הטקסט?","options":["להציע דרכים להתמודדות עם הפחד מהתחלת עבודה חדשה","להסביר את ההבדלים בין התחלות לשינויים","לשכנע ששינויים חשובים להתקדמות","להסביר את הסיבות לפחד מהתחלות ולהציע דרכי התמודדות"],"tip":{"title":"טיפ","body":"האם הכותב מבקש: למסור מידע? לשכנע? להקנות מידע כללי?"}}]},{"title":"קטע נלווה","snippet":{"title":"קטע נלווה","body":"השנה החדשה מתחילה ממש עכשיו, והיא מזכירה לרבים מאיתנו עד כמה התחלות חדשות עשויות להיות מאתגרות. שינויים, בין שהם טובים ובין שלא, יכולים לגרום ללחץ ומתח ולהחליש אותנו, לכן מומלץ לחשוב פעמיים לפני עריכת שינויים גורליים ולערוך שינויים רק אם הם הכרחיים."},"questions":[{"kind":"open","id":"snippet_compare","prompt":"האם קטע זה עולה בקנה אחד עם הרעיונות המרכזיים בטקסט? הסבירו.","rows":6,"prefix":"לדעתי הקטע... כי..."}]},{"title":"הפתגם","proverb":"כאשר נושבת רוח של שינוי, יש הבונים חומות ויש הבונים טחנות רוח.","paragraphButtons":true,"questions":[{"kind":"choice","id":"proverb_meaning","prompt":"סעיף א'': מה משמעות הפתגם?","options":["כשמגיע שינוי, יש הנסגרים ומתגוננים מפניו ויש המנצלים אותו לצמיחה","שינויים גדולים הם מסוכנים, ולכן כדאי להתגונן מפניהם מראש","אנשים חכמים בונים תוכניות מראש, ואנשים אחרים מתבלבלים בשינוי","כל שינוי מביא איתו הרבה עבודה, ולכן עדיף לחכות שיעבור"]},{"kind":"choice","id":"proverb_place","prompt":"סעיף ב'': באיזו פסקה הכי מתאים לשבץ את הפתגם?","options":["פסקה 1","פסקה 2","פסקה 3","פסקה 4"]}]},{"title":"לסיכום הפעילות","intro":"כתבו תשובה קצרה לכל אחת מהשאלות.","questions":[{"kind":"open","id":"sum_dreams","prompt":"אילו חלומות תרצו להגשים השנה?","rows":4},{"kind":"open","id":"sum_success","prompt":"במה חשוב לכם להצליח?","rows":4},{"kind":"open","id":"sum_how","prompt":"כיצד תוכלו לממש את רצונותיכם?","rows":4}]}],"assistant":{"enabled":true,"systemPrompt":"אתה עוזר לימודי לתלמידי כיתה י'' בשיעור עברית, הכולל משימת הבנת הנקרא ותרגילי דקדוק. תפקידך היחיד הוא ללמד שיטה — איך לגשת לשאלה, מהם המושגים, ואיך מזהים דברים באופן כללי. אסור לך בהחלט: (1) לתת תוכן, ניתוח, דוגמה או תשובה שקשורים לטקסט הספציפי של המשימה; (2) לזהות או להצביע עבור התלמיד על מילים ספציפיות מתוך התרגילים או מילות הקישור בטקסט; (3) לאשר או לפסול תשובה שהתלמיד כבר כתב. אתה יכול להסביר הגדרות ומבחני זיהוי כלליים, ולהדגים אותם אך ורק על משפטים שאינם מהטקסט או מהתרגילים של המשימה. כשתלמיד מבקש ממך לזהות פריט ספציפי מהתרגיל, סרב בנימוס, הזכר לו את המבחן/השיטה הרלוונטית, ועודד אותו לנסות בעצמו. שמור על טון מעודד, סבלני וקצר."}}'::jsonb
from public.spaces s where s.slug = '10-1'
on conflict do nothing
returning id, title;
