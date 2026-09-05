import { supabase } from "@/integrations/supabase/client";

export type SpeechMode = "two_tracks" | "always" | "off";

export type Settings = {
  id: string;
  practice_name: string;
  teacher_code: string;
  speech_mode: SpeechMode;
  required_choice_count: number;
};

export type Question = {
  id: string;
  task_id: string;
  kind: "open" | "multiple_choice";
  prompt: string;
  options: string[];
  points: number;
  sort_order: number;
};

export type Task = {
  id: string;
  kind: "required" | "choice";
  title: string;
  description: string;
  paragraphs: string[];
  max_points: number;
  sort_order: number;
  questions: Question[];
};

export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
  mode: "regular" | "adaptive";
  speech_enabled: boolean;
  stage: string;
  choice_slot_1_task_id: string | null;
  choice_slot_2_task_id: string | null;
  grade_required: number | null;
  grade_choice_1: number | null;
  grade_choice_2: number | null;
  finished_at: string | null;
  created_at: string;
};

export const DEVICE_STUDENT_KEY = "reading-practice.student-id";

export function readDeviceStudentId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEVICE_STUDENT_KEY);
}

export function writeDeviceStudentId(id: string) {
  window.localStorage.setItem(DEVICE_STUDENT_KEY, id);
}

export function clearDeviceStudentId() {
  window.localStorage.removeItem(DEVICE_STUDENT_KEY);
}

/** Splits a paragraph into readable sentences for click-to-speak. */
export function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?:])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from("practice_settings")
    .select("id, practice_name, teacher_code, speech_mode, required_choice_count")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return {
      id: "default",
      practice_name: "תרגול הבנת הנקרא",
      teacher_code: "1234",
      speech_mode: "two_tracks",
      required_choice_count: 2,
    };
  }
  return data as Settings;
}

export async function fetchTasks(): Promise<Task[]> {
  const [tasksRes, questionsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, kind, title, description, paragraphs, max_points, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("questions")
      .select("id, task_id, kind, prompt, options, points, sort_order")
      .order("sort_order", { ascending: true }),
  ]);
  if (tasksRes.error) throw tasksRes.error;
  if (questionsRes.error) throw questionsRes.error;

  const questions = (questionsRes.data ?? []).map((q) => ({
    ...q,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
  })) as Question[];

  return (tasksRes.data ?? []).map((t) => ({
    ...t,
    paragraphs: Array.isArray(t.paragraphs) ? (t.paragraphs as string[]) : [],
    questions: questions.filter((q) => q.task_id === t.id),
  })) as Task[];
}

export async function fetchStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Student) ?? null;
}

export async function fetchAnswers(studentId: string) {
  const { data, error } = await supabase
    .from("answers")
    .select("question_id, task_id, answer_text")
    .eq("student_id", studentId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchCompletions(studentId: string) {
  const { data, error } = await supabase
    .from("task_completions")
    .select("task_id, completed_at")
    .eq("student_id", studentId)
    .order("completed_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveAnswer(input: {
  studentId: string;
  taskId: string;
  questionId: string;
  answerText: string;
}) {
  const { error } = await supabase.from("answers").upsert(
    {
      student_id: input.studentId,
      task_id: input.taskId,
      question_id: input.questionId,
      answer_text: input.answerText,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,question_id" },
  );
  if (error) throw error;
}

export function fullName(student: { first_name: string; last_name: string }) {
  return `${student.first_name} ${student.last_name}`.trim();
}
