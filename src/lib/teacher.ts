import { supabase } from "@/integrations/supabase/client";
import type { GradingMode } from "@/lib/practice";
import type { SchoolClass } from "@/lib/classes";

export type TeacherNote = {
  id: string;
  student_id: string;
  task_id: string;
  question_id: string | null;
  note: string;
  score: number | null;
};

export async function fetchTeacherNotes(): Promise<TeacherNote[]> {
  const { data, error } = await supabase
    .from("teacher_notes")
    .select("id, student_id, task_id, question_id, note, score");
  if (error) throw error;
  return (data ?? []) as TeacherNote[];
}

/** שמירת הערה או ניקוד לשאלה (question_id=null → הערה כללית למשימה). */
export async function saveTeacherNote(input: {
  studentId: string;
  taskId: string;
  questionId: string | null;
  note?: string;
  score?: number | null;
}) {
  const base = supabase
    .from("teacher_notes")
    .select("id")
    .eq("student_id", input.studentId)
    .eq("task_id", input.taskId);
  const query = input.questionId
    ? base.eq("question_id", input.questionId)
    : base.is("question_id", null);
  const { data: existing, error: findError } = await query.limit(1).maybeSingle();
  if (findError) throw findError;

  const patch: { updated_at: string; note?: string; score?: number | null } = {
    updated_at: new Date().toISOString(),
  };
  if (input.note !== undefined) patch.note = input.note;
  if (input.score !== undefined) patch.score = input.score;

  if (existing?.id) {
    const { error } = await supabase.from("teacher_notes").update(patch).eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("teacher_notes").insert({
    student_id: input.studentId,
    task_id: input.taskId,
    question_id: input.questionId,
    note: input.note ?? "",
    score: input.score ?? null,
  });
  if (error) throw error;
}

export type TaskSpeech = { student_id: string; task_id: string; allowed: boolean };

export async function fetchTaskSpeech(): Promise<TaskSpeech[]> {
  const { data, error } = await supabase
    .from("student_task_speech")
    .select("student_id, task_id, allowed");
  if (error) throw error;
  return (data ?? []) as TaskSpeech[];
}

export async function setTaskSpeech(studentId: string, taskId: string, allowed: boolean) {
  const { error } = await supabase.from("student_task_speech").upsert(
    { student_id: studentId, task_id: taskId, allowed, updated_at: new Date().toISOString() },
    { onConflict: "student_id,task_id" },
  );
  if (error) throw error;
}

/** ההרשאה הכללית של התלמיד/ה להקראה. */
export async function setStudentSpeech(studentId: string, enabled: boolean) {
  const { error } = await supabase
    .from("students")
    .update({ speech_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", studentId);
  if (error) throw error;
}

export async function saveQuestionWeight(questionId: string, weight: number | null) {
  const { error } = await supabase.from("questions").update({ weight }).eq("id", questionId);
  if (error) throw error;
}

export async function setTaskGradingMode(taskId: string, mode: GradingMode) {
  const { error } = await supabase.from("tasks").update({ grading_mode: mode }).eq("id", taskId);
  if (error) throw error;
}

export async function moveStudentClass(studentId: string, cls: SchoolClass) {
  const { error } = await supabase
    .from("students")
    .update({
      class_slug: cls.slug,
      class_name: cls.name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);
  if (error) throw error;
}

/** הוספת תלמיד/ה ידנית: בלי סיסמה — בכניסה הראשונה יבחר/תבחר סיסמה. */
export async function createStudentManually(input: {
  firstName: string;
  lastName: string;
  cls: SchoolClass;
}) {
  const { error } = await supabase.from("students").insert({
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    class_name: input.cls.name,
    class_slug: input.cls.slug,
    mode: "regular",
    speech_enabled: false,
    stage: "choice",
    must_reset_password: true,
  });
  if (error) throw error;
}

export type FeedbackRow = {
  id: string;
  student_id: string;
  task_id: string | null;
  clarity_scale: number | null;
  learning_scale: number | null;
  compare_lesson: string | null;
  help_page_usage: string | null;
  still_unclear: string | null;
};

export async function fetchFeedbackRows(): Promise<FeedbackRow[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select(
      "id, student_id, task_id, clarity_scale, learning_scale, compare_lesson, help_page_usage, still_unclear",
    );
  if (error) throw error;
  return (data ?? []) as FeedbackRow[];
}

/** הפעלה/כיבוי של משימה לתלמידים. */
export async function setTaskActive(taskId: string, isActive: boolean) {
  const { error } = await supabase.from("tasks").update({ is_active: isActive }).eq("id", taskId);
  if (error) throw error;
}

/** תזמון פתיחה וסגירה של משימה (null = בלי הגבלה). */
export async function setTaskSchedule(
  taskId: string,
  schedule: { opensAt?: string | null; closesAt?: string | null },
) {
  const patch: { opens_at?: string | null; closes_at?: string | null } = {};
  if (schedule.opensAt !== undefined) patch.opens_at = schedule.opensAt;
  if (schedule.closesAt !== undefined) patch.closes_at = schedule.closesAt;
  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
  if (error) throw error;
}

/** איפוס המשימה לכל התלמידים: מחיקת תשובות, הגשות, ציונים, הערות ומשוב. */
export async function resetTaskForAllStudents(taskId: string) {
  for (const table of ["answers", "task_completions", "task_grades", "teacher_notes", "feedback"] as const) {
    const { error } = await supabase.from(table).delete().eq("task_id", taskId);
    if (error) throw error;
  }
  const { error } = await supabase
    .from("students")
    .update({ finished_at: null, updated_at: new Date().toISOString() })
    .not("finished_at", "is", null);
  if (error) throw error;
}

/** מחיקת משימה לגמרי, כולל השאלות והנתונים של התלמידים בה. */
export async function deleteTask(taskId: string) {
  await resetTaskForAllStudents(taskId);
  const { error: speechError } = await supabase
    .from("student_task_speech")
    .delete()
    .eq("task_id", taskId);
  if (speechError) throw speechError;
  const { error: slot1Error } = await supabase
    .from("students")
    .update({ choice_slot_1_task_id: null })
    .eq("choice_slot_1_task_id", taskId);
  if (slot1Error) throw slot1Error;
  const { error: slot2Error } = await supabase
    .from("students")
    .update({ choice_slot_2_task_id: null })
    .eq("choice_slot_2_task_id", taskId);
  if (slot2Error) throw slot2Error;
  const { error: questionsError } = await supabase.from("questions").delete().eq("task_id", taskId);
  if (questionsError) throw questionsError;
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}
