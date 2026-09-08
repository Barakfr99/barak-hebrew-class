-- שלב 4 (המשך): מחיקת טבלאות שכבר לא בשימוש בקוד בכלל.
-- כל 4 המשימות רצות על engine="runner" (שלב 3 סיים את המעבר האחרון), אז מסלול
-- ה-legacy-core וענפי ה-nb10_*/mi_* הישנים (שהוחלפו במנוע ה-runner המשותף עוד
-- לפני תחילת התיעוד הזה) הם עכשיו טבלאות מתות לגמרי: גיבוי מלא נשמר לפני
-- המחיקה, ואומת (0 הפניות קוד, 0 תלויות פונקציה/מפתח זר מטבלאות אחרות).

-- מסלול ה-legacy-core
drop table if exists public.answers cascade;
drop table if exists public.feedback cascade;
drop table if exists public.questions cascade;
drop table if exists public.task_completions cascade;
drop table if exists public.task_grades cascade;
drop table if exists public.teacher_notes cascade;

-- ענף nb10 (קודם ל-runner)
drop table if exists public.nb10_answers cascade;
drop table if exists public.nb10_feedback cascade;
drop table if exists public.nb10_notes cascade;
drop table if exists public.nb10_submissions cascade;
drop table if exists public.nb10_tasks cascade;

-- ענף mi (קודם ל-runner)
drop table if exists public.mi_answers cascade;
drop table if exists public.mi_feedback cascade;
drop table if exists public.mi_notes cascade;
drop table if exists public.mi_student_speech cascade;
drop table if exists public.mi_submissions cascade;
drop table if exists public.mi_tasks cascade;
