-- שלב 4 (המשך): מחיקת טבלאות שכבר לא בשימוש בקוד בכלל.
-- כל 4 המשימות רצות על engine="runner" (שלב 3 סיים את המעבר האחרון), אז מסלול
-- ה-legacy-core וענפי ה-nb10_*/mi_* הישנים (שהוחלפו במנוע ה-runner המשותף עוד
-- לפני תחילת התיעוד הזה) הם עכשיו טבלאות מתות לגמרי: אומת 0 הפניות קוד,
-- 0 מפתחות זרים נכנסים מטבלאות חיות, 0 פונקציות/views שנסמכות עליהן.
--
-- הטבלאות עדיין החזיקו עבודת תלמידים אמיתית (193 שורות ב-answers, 350 ב-nb10_answers,
-- 287 ב-mi_answers ועוד), ולכן הן לא נמחקות "יבש": כל טבלה מועתקת קודם במלואה
-- לסכימת ארכיון נפרדת. סכימת archive_pre_runner אינה נחשפת ב-API של Supabase,
-- כך שהאפליקציה לא רואה אותה, אבל הנתונים נשארים זמינים לשליפה בכל רגע.

create schema if not exists archive_pre_runner;

-- מסלול ה-legacy-core
create table if not exists archive_pre_runner.answers          as select * from public.answers;
create table if not exists archive_pre_runner.feedback         as select * from public.feedback;
create table if not exists archive_pre_runner.questions        as select * from public.questions;
create table if not exists archive_pre_runner.task_completions as select * from public.task_completions;
create table if not exists archive_pre_runner.task_grades      as select * from public.task_grades;
create table if not exists archive_pre_runner.teacher_notes    as select * from public.teacher_notes;

-- ענף nb10 (קודם ל-runner)
create table if not exists archive_pre_runner.nb10_answers     as select * from public.nb10_answers;
create table if not exists archive_pre_runner.nb10_feedback    as select * from public.nb10_feedback;
create table if not exists archive_pre_runner.nb10_notes       as select * from public.nb10_notes;
create table if not exists archive_pre_runner.nb10_submissions as select * from public.nb10_submissions;
create table if not exists archive_pre_runner.nb10_tasks       as select * from public.nb10_tasks;

-- ענף mi (קודם ל-runner)
create table if not exists archive_pre_runner.mi_answers        as select * from public.mi_answers;
create table if not exists archive_pre_runner.mi_feedback       as select * from public.mi_feedback;
create table if not exists archive_pre_runner.mi_notes          as select * from public.mi_notes;
create table if not exists archive_pre_runner.mi_student_speech as select * from public.mi_student_speech;
create table if not exists archive_pre_runner.mi_submissions    as select * from public.mi_submissions;
create table if not exists archive_pre_runner.mi_tasks          as select * from public.mi_tasks;

-- ורק עכשיו המחיקה עצמה

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

-- הורץ בפועל על מסד הנתונים ב-2026-09-09 (דרך קונסולת ה-DB של Lovable).
-- אומת אחרי ההרצה: סכימת public מכילה 9 טבלאות חיות בלבד, וסכימת
-- archive_pre_runner מחזיקה את כל 17 הטבלאות עם ספירת שורות זהה למקור.
