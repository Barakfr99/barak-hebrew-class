/** גישה גנרית לנתוני כל משימה עם engine="runner" — טבלה אחת לכל דבר, לא טבלה למשימה. */
import { supabase } from "@/integrations/supabase/client";
import type { TaskDefinition } from "./types";

export type RunnerTask = {
  id: string;
  classSlug: string | null;
  title: string;
  description: string;
  isActive: boolean;
  opensAt: string | null;
  closesAt: string | null;
  definition: TaskDefinition;
};

export async function fetchRunnerTask(taskId: string): Promise<RunnerTask | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, class_slug, title, description, is_active, opens_at, closes_at, definition")
    .eq("id", taskId)
    .eq("engine", "runner")
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.definition) return null;
  return {
    id: data.id,
    classSlug: data.class_slug,
    title: data.title,
    description: data.description ?? "",
    isActive: data.is_active,
    opensAt: data.opens_at,
    closesAt: data.closes_at,
    definition: data.definition as unknown as TaskDefinition,
  };
}

/** כל משימות ה-runner של מרחב — לשימוש בלוח המורה. */
export async function fetchRunnerTasksForClass(classSlug: string): Promise<RunnerTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, class_slug, title, description, is_active, opens_at, closes_at, definition")
    .eq("class_slug", classSlug)
    .eq("engine", "runner")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[])
    .filter((row) => Boolean(row["definition"]))
    .map((row) => ({
      id: row["id"] as string,
      classSlug: (row["class_slug"] as string | null) ?? null,
      title: row["title"] as string,
      description: (row["description"] as string | null) ?? "",
      isActive: row["is_active"] as boolean,
      opensAt: (row["opens_at"] as string | null) ?? null,
      closesAt: (row["closes_at"] as string | null) ?? null,
      definition: row["definition"] as unknown as TaskDefinition,
    }));
}

export function isRunnerTaskOpen(task: RunnerTask | null | undefined): boolean {
  if (!task || !task.isActive) return false;
  const now = Date.now();
  if (task.opensAt && new Date(task.opensAt).getTime() > now) return false;
  if (task.closesAt && new Date(task.closesAt).getTime() < now) return false;
  return true;
}

export async function fetchRunnerAnswers(taskId: string, studentId: string) {
  const { data, error } = await supabase
    .from("runner_answers")
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

export async function saveRunnerAnswer(input: {
  taskId: string;
  studentId: string;
  itemKey: string;
  answerText: string;
}) {
  await saveRunnerAnswers({
    taskId: input.taskId,
    studentId: input.studentId,
    entries: [{ itemKey: input.itemKey, answerText: input.answerText }],
  });
}

/** שמירת כמה תשובות בבקשה אחת — מונע דריסה בין שמירות מקבילות. */
export async function saveRunnerAnswers(input: {
  taskId: string;
  studentId: string;
  entries: { itemKey: string; answerText: string }[];
}) {
  if (input.entries.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from("runner_answers").upsert(
    input.entries.map((entry) => ({
      task_id: input.taskId,
      student_id: input.studentId,
      item_key: entry.itemKey,
      answer_text: entry.answerText,
      updated_at: now,
    })),
    { onConflict: "task_id,student_id,item_key" },
  );
  if (error) throw error;
}

/** מוודא שכל התשובות המקומיות קיימות בשרת, ומחזיר את התמונה המעודכנת. */
export async function syncRunnerAnswers(
  taskId: string,
  studentId: string,
  local: Record<string, string>,
): Promise<Record<string, string>> {
  const remote = await fetchRunnerAnswers(taskId, studentId);
  const missing = Object.entries(local)
    .filter(([key, value]) => (value ?? "") !== (remote[key] ?? ""))
    .map(([itemKey, answerText]) => ({ itemKey, answerText }));
  if (missing.length === 0) return remote;
  await saveRunnerAnswers({ taskId, studentId, entries: missing });
  return fetchRunnerAnswers(taskId, studentId);
}

export async function fetchRunnerSubmission(taskId: string, studentId: string) {
  const { data, error } = await supabase
    .from("runner_submissions")
    .select("submitted_at")
    .eq("task_id", taskId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function submitRunnerTask(input: { taskId: string; studentId: string }) {
  const { error } = await supabase
    .from("runner_submissions")
    .upsert(
      { task_id: input.taskId, student_id: input.studentId },
      { onConflict: "task_id,student_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export type FeedbackAnswerRow = {
  student_id: string;
  task_id: string;
  item_key: string;
  answer_text: string;
};

/** כל תשובות המשוב (item_key שמתחיל ב-feedback.) לכמה משימות — לניתוח משובים בלוח המורה. */
export async function fetchRunnerFeedbackAnswers(taskIds: string[]): Promise<FeedbackAnswerRow[]> {
  if (taskIds.length === 0) return [];
  const { data, error } = await supabase
    .from("runner_answers")
    .select("student_id, task_id, item_key, answer_text")
    .in("task_id", taskIds)
    .like("item_key", "feedback.%");
  if (error) throw error;
  return data ?? [];
}

export type RunnerAnswerNote = { note: string; score: number | null };

export async function fetchRunnerNotes(taskId: string, studentId: string) {
  const { data, error } = await supabase
    .from("runner_notes")
    .select("item_key, note, score")
    .eq("task_id", taskId)
    .eq("student_id", studentId);
  if (error) throw error;
  const map: Record<string, RunnerAnswerNote> = {};
  let general: RunnerAnswerNote = { note: "", score: null };
  (data ?? []).forEach((row) => {
    if (row.item_key) map[row.item_key] = { note: row.note ?? "", score: row.score ?? null };
    else general = { note: row.note ?? "", score: row.score ?? null };
  });
  return { map, general };
}

/**
 * שמירת הערה/ניקוד של המורה.
 * המדדים הייחודיים בטבלה חלקיים (item_key IS NULL / IS NOT NULL), ולכן
 * מאתרים שורה קיימת ומעדכנים, או מוסיפים חדשה.
 */
export async function saveRunnerNote(input: {
  taskId: string;
  studentId: string;
  itemKey: string | null;
  note: string;
  score: number | null;
}) {
  const base = supabase
    .from("runner_notes")
    .select("id")
    .eq("task_id", input.taskId)
    .eq("student_id", input.studentId);
  const query = input.itemKey ? base.eq("item_key", input.itemKey) : base.is("item_key", null);
  const { data: existing, error: findError } = await query.limit(1).maybeSingle();
  if (findError) throw findError;

  if (existing?.id) {
    const { error } = await supabase
      .from("runner_notes")
      .update({ note: input.note, score: input.score, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("runner_notes").insert({
    task_id: input.taskId,
    student_id: input.studentId,
    item_key: input.itemKey,
    note: input.note,
    score: input.score,
  });
  if (error) throw error;
}
