-- שלב 4 (המשך): מחיקת עמודות מתות ב-students מהמודל הישן של "משימת חובה +
-- בחירה" (choice_slot_*/grade_*), ומעקב סיום שכבר לא נכתב על ידי שום קוד חי
-- (stage, finished_at). כל 49 השורות נבדקו: choice_slot_1/2_task_id,
-- grade_required, grade_choice_1/2 ריקות בכולן; stage/finished_at אינן
-- נקראות בשום מקום בקוד. עמודת mode לא נכללת כאן — היא עדיין בשימוש בפועל
-- בפונקציית student_register.

alter table public.students
  drop column if exists choice_slot_1_task_id,
  drop column if exists choice_slot_2_task_id,
  drop column if exists grade_required,
  drop column if exists grade_choice_1,
  drop column if exists grade_choice_2,
  drop column if exists stage,
  drop column if exists finished_at;
