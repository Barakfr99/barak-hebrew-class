/** גישה גנרית לנתוני כל משימה עם engine="runner" — טבלה אחת לכל דבר, לא טבלה למשימה. */
import { supabase } from "@/integrations/supabase/client";
import type { TaskDefinition } from "./types";

export type RunnerTask = {
  id: string;
  classSlug: string | null;
  title: string;
  isActive: boolean;
  opensAt: string | null;
  closesAt: string | null;
  definition: TaskDefinition;
};

export async function fetchRunnerTask(taskId: string): Promise<RunnerTask | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, class_slug, title, is_active, opens_at, closes_at, definition")
    .eq("id", taskId)
    .eq("engine", "runner")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    classSlug: data.class_slug,
    title: data.title,
    isActive: data.is_active,
    opensAt: data.opens_at,
    closesAt: data.closes_at,
    definition: data.definition as unknown as TaskDefinition,
  };
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
  const { error } = await supabase.from("runner_answers").upsert(
    {
      task_id: input.taskId,
      student_id: input.studentId,
      item_key: input.itemKey,
      answer_text: input.answerText,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "task_id,student_id,item_key" },
  );
  if (error) throw error;
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

export type RunnerAnswerNote = { note: string; score: number | null };

export async function fetchRunnerNotes(taskId: string, studentId: string) {
  const { data, error } = await supabase
    .from("runner_notes")
    .select("item_key, note, score")
    .eq("task_id", taskId)
    .eq("student_id", studentId);
  if (error) throw error;
  const map: Record<string, RunnerAnswerNote> = {};
  let general = "";
  (data ?? []).forEach((row) => {
    if (row.item_key) map[row.item_key] = { note: row.note ?? "", score: row.score ?? null };
    else general = row.note ?? "";
  });
  return { map, general };
}
