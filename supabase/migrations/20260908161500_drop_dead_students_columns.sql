-- שלב 4 (המשך): מחיקת עמודות מתות ב-students מהמודל הישן של "משימת חובה +
-- בחירה" (choice_slot_*/grade_*), ומעקב סיום שכבר לא נכתב ולא נקרא על ידי שום
-- קוד חי (stage, finished_at).
--
-- מה נבדק על כל 49 השורות: choice_slot_1/2_task_id, grade_required,
-- grade_choice_1/2 ריקות לחלוטין (0 ערכים לא-ריקים). stage ו-finished_at כן
-- מחזיקות ערכים (stage: 40 "choice" ו-9 "done"; finished_at: 9 ערכים), אבל אף
-- שורת קוד ואף פונקציה במסד הנתונים לא נוגעת בהן — ולכן הן מגובות ולא נזרקות.
--
-- עמודת mode לא נכללת כאן — היא עדיין בשימוש בפועל בפונקציית student_register.

create schema if not exists archive_pre_runner;

create table if not exists archive_pre_runner.students_dropped_columns as
  select id,
         choice_slot_1_task_id,
         choice_slot_2_task_id,
         grade_required,
         grade_choice_1,
         grade_choice_2,
         stage::text as stage,
         finished_at
  from public.students;

alter table public.students
  drop column if exists choice_slot_1_task_id,
  drop column if exists choice_slot_2_task_id,
  drop column if exists grade_required,
  drop column if exists grade_choice_1,
  drop column if exists grade_choice_2,
  drop column if exists stage,
  drop column if exists finished_at;

-- הורץ בפועל על מסד הנתונים ב-2026-09-09 (דרך קונסולת ה-DB של Lovable).
-- אומת אחרי ההרצה: ב-students נותרו 10 העמודות החיות בלבד, ו-49 השורות
-- של העמודות שירדו שמורות ב-archive_pre_runner.students_dropped_columns.
