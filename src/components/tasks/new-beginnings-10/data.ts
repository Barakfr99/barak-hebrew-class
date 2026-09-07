/** גישה לנתוני המשימה "התחלות חדשות" — טבלאות nb10_* בלבד. */
import { supabase } from "@/integrations/supabase/client";

export type NB10Task = {
  id: string;
  class_slug: string;
  is_active: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

export type NB10Feedback = {
  student_id: string;
  task_id: string;
  clarity_scale: number | null;
  learning_scale: number | null;
  assistant_scale: number | null;
  compare_lesson: string | null;
  help_page_usage: string | null;
  still_unclear: string | null;
};

export async function fetchNB10Task(classSlug: string): Promise<NB10Task | null> {
  const { data, error } = await supabase
    .from("nb10_tasks")
    .select("id, class_slug, is_active, opens_at, closes_at")
    .eq("class_slug", classSlug)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchNB10Tasks(): Promise<NB10Task[]> {
  const { data, error } = await supabase
    .from("nb10_tasks")
    .select("id, class_slug, is_active, opens_at, closes_at")
    .order("class_slug");
  if (error) throw error;
  return data ?? [];
}

/** המשימה זמינה לתלמידים רק כשהיא מופעלת ובתוך חלון הזמן שהוגדר. */
export function isNB10Open(task: NB10Task | null | undefined): boolean {
  if (!task || !task.is_active) return false;
  const now = Date.now();
  if (task.opens_at && new Date(task.opens_at).getTime() > now) return false;
  if (task.closes_at && new Date(task.closes_at).getTime() < now) return false;
  return true;
}

export async function fetchNB10Answers(taskId: string, studentId: string) {
  const { data, error } = await supabase
    .from("nb10_answers")
    .select("question_id, answer_text")
    .eq("task_id", taskId)
    .eq("student_id", studentId);
  if (error) throw error;
  const map: Record<string, string> = {};
  (data ?? []).forEach((row) => {
    map[row.question_id] = row.answer_text;
  });
  return map;
}

export async function saveNB10Answer(input: {
  taskId: string;
  studentId: string;
  questionId: string;
  answerText: string;
}) {
  const { error } = await supabase.from("nb10_answers").upsert(
    {
      task_id: input.taskId,
      student_id: input.studentId,
      question_id: input.questionId,
      answer_text: input.answerText,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,task_id,question_id" },
  );
  if (error) throw error;
}

export async function fetchNB10Submission(taskId: string, studentId: string) {
  const { data, error } = await supabase
    .from("nb10_submissions")
    .select("submitted_at")
    .eq("task_id", taskId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function submitNB10(input: {
  taskId: string;
  studentId: string;
  feedback: {
    clarity_scale: number | null;
    learning_scale: number | null;
    assistant_scale: number | null;
    compare_lesson: string | null;
    help_page_usage: string | null;
    still_unclear: string | null;
  };
}) {
  const { error: feedbackError } = await supabase.from("nb10_feedback").upsert(
    {
      task_id: input.taskId,
      student_id: input.studentId,
      ...input.feedback,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,task_id" },
  );
  if (feedbackError) throw feedbackError;

  const { error } = await supabase
    .from("nb10_submissions")
    .upsert(
      { task_id: input.taskId, student_id: input.studentId },
      { onConflict: "student_id,task_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}
