/** גישה לנתוני המשימה "ניסוח רעיון מרכזי — תרגול" — טבלאות mi_* בלבד. */
import { supabase } from "@/integrations/supabase/client";
import {
  MI_MIN_TEXT_CHARS,
  MI_PARAGRAPHS,
  MI_REQUIRED_PAGE1,
  MI_REQUIRED_PAGE3,
  MI_WRITE_ITEMS,
  miMessageKey,
  miTopicKey,
  miWriteKey,
} from "./content";

export type MITask = {
  id: string;
  class_slug: string;
  is_active: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

export type MIFeedbackValues = {
  clarity_scale: number | null;
  learning_scale: number | null;
  explanation_scale: number | null;
  hardest_part: string | null;
  still_unclear: string | null;
};

export async function fetchMITask(classSlug: string): Promise<MITask | null> {
  const { data, error } = await supabase
    .from("mi_tasks")
    .select("id, class_slug, is_active, opens_at, closes_at")
    .eq("class_slug", classSlug)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchMITasks(): Promise<MITask[]> {
  const { data, error } = await supabase
    .from("mi_tasks")
    .select("id, class_slug, is_active, opens_at, closes_at")
    .order("class_slug");
  if (error) throw error;
  return data ?? [];
}

/** המשימה זמינה לתלמידים רק כשהיא מופעלת ובתוך חלון הזמן שהוגדר. */
export function isMIOpen(task: MITask | null | undefined): boolean {
  if (!task || !task.is_active) return false;
  const now = Date.now();
  if (task.opens_at && new Date(task.opens_at).getTime() > now) return false;
  if (task.closes_at && new Date(task.closes_at).getTime() < now) return false;
  return true;
}

export async function fetchMIAnswers(taskId: string, studentId: string) {
  const { data, error } = await supabase
    .from("mi_answers")
    .select("item_key, answer_text")
    .eq("task_id", taskId)
    .eq("student_id", studentId);
  if (error) throw error;
  const map: Record<string, string> = {};
  (data ?? []).forEach((row) => {
    map[row.item_key] = row.answer_text;
  });
  return map;
}

export async function saveMIAnswer(input: {
  taskId: string;
  studentId: string;
  itemKey: string;
  answerText: string;
}) {
  const { error } = await supabase.from("mi_answers").upsert(
    {
      task_id: input.taskId,
      student_id: input.studentId,
      item_key: input.itemKey,
      answer_text: input.answerText,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,task_id,item_key" },
  );
  if (error) throw error;
}

export async function fetchMISubmission(taskId: string, studentId: string) {
  const { data, error } = await supabase
    .from("mi_submissions")
    .select("submitted_at")
    .eq("task_id", taskId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function submitMI(input: {
  taskId: string;
  studentId: string;
}) {
  const { error } = await supabase
    .from("mi_submissions")
    .upsert(
      { task_id: input.taskId, student_id: input.studentId },
      { onConflict: "student_id,task_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function saveMIFeedback(input: {
  taskId: string;
  studentId: string;
  feedback: MIFeedbackValues;
}) {
  const { error } = await supabase.from("mi_feedback").upsert(
    {
      task_id: input.taskId,
      student_id: input.studentId,
      ...input.feedback,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,task_id" },
  );
  if (error) throw error;
}

export async function fetchMIFeedback(taskId: string, studentId: string) {
  const { data, error } = await supabase
    .from("mi_feedback")
    .select("clarity_scale, learning_scale, explanation_scale, hardest_part, still_unclear")
    .eq("task_id", taskId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as MIFeedbackValues | null;
}

/* ---------- ספירת תשובות מהותיות ומאמץ נוסף ---------- */

const filled = (value: string | undefined) => (value ?? "").trim().length > 0;

/** ברב-ברירה נחשבת פסקה כנענתה רק כששתי השאלות (נושא ומסר) נענו. */
export function countPage1(answers: Record<string, string>): number {
  return MI_PARAGRAPHS.filter(
    (p) => filled(answers[miTopicKey(p.n)]) && filled(answers[miMessageKey(p.n)]),
  ).length;
}

/** בכתיבה חופשית נחשבת תשובה רק כשיש בה תוכן משמעותי. */
export function countPage3(answers: Record<string, string>): number {
  return MI_WRITE_ITEMS.filter(
    (item) => (answers[miWriteKey(item.id)] ?? "").trim().length >= MI_MIN_TEXT_CHARS,
  ).length;
}

export type MIEffort = {
  page1: number;
  page3: number;
  /** מספר התשובות מעל הנדרש — 0 כשאין מאמץ נוסף. */
  extra: number;
  hasExtra: boolean;
  page1Missing: number;
  page3Missing: number;
};

export function computeMIEffort(answers: Record<string, string>): MIEffort {
  const page1 = countPage1(answers);
  const page3 = countPage3(answers);
  const extra =
    Math.max(0, page1 - MI_REQUIRED_PAGE1) + Math.max(0, page3 - MI_REQUIRED_PAGE3);
  return {
    page1,
    page3,
    extra,
    hasExtra: extra > 0,
    page1Missing: Math.max(0, MI_REQUIRED_PAGE1 - page1),
    page3Missing: Math.max(0, MI_REQUIRED_PAGE3 - page3),
  };
}

/** מספר הציטוטים בעמוד 2 שנשפטו. */
export function countQuotes(answers: Record<string, string>, keys: string[]): number {
  return keys.filter((key) => filled(answers[key])).length;
}
