import { supabase } from "@/integrations/supabase/client";

export type SpeechMode = "two_tracks" | "always" | "off";

export type Settings = {
  id: string;
  practice_name: string;
  teacher_code: string;
  speech_mode: SpeechMode;
  required_choice_count: number;
};

export type QuestionNote = { kind: "tip" | "info"; title: string; body: string };

export type Question = {
  id: string;
  task_id: string;
  kind: "open" | "multiple_choice";
  prompt: string;
  options: string[];
  points: number | null;
  sort_order: number;
  note: QuestionNote | null;
  passage: string | null;
  paragraph_refs: number[];
  group_label: string | null;
  parent_key: string | null;
  input_size: "short" | "long" | "essay";
};

/** שאלה בודדת או קבוצת שדות (שורות טבלה / סעיפי משנה) המוצגות יחד. */
export type QuestionGroup = {
  key: string;
  prompt: string;
  note: QuestionNote | null;
  passage: string | null;
  items: Question[];
};

export type HelpSection = { title: string; body: string };

export type Task = {
  id: string;
  kind: "required" | "choice";
  class_slug: string | null;
  title: string;
  article_title: string | null;
  source_note: string | null;
  footnote: string | null;
  description: string;
  paragraphs: string[];
  max_points: number;
  sort_order: number;
  help_sections: HelpSection[];
  questions: Question[];
};

/** מקבץ שאלות לפי parent_key, כדי להציג טבלאות וסעיפי משנה תחת שאלה אחת. */
export function groupQuestions(questions: Question[]): QuestionGroup[] {
  const groups: QuestionGroup[] = [];
  questions.forEach((question) => {
    const key = question.parent_key ?? question.id;
    const existing = groups.find((g) => g.key === key);
    if (existing) {
      existing.items.push(question);
      if (!existing.passage && question.passage) existing.passage = question.passage;
      if (!existing.note && question.note) existing.note = question.note;
      return;
    }
    groups.push({
      key,
      prompt: question.prompt,
      note: question.note,
      passage: question.passage,
      items: [question],
    });
  });
  return groups;
}

/**
 * משימות לפי כיתה: אם לכיתה יש משימות משויכות — הן בלבד מוצגות,
 * אחרת מוצגות המשימות הכלליות (ללא שיוך).
 */
export function tasksForClass(tasks: Task[], classSlug: string | null | undefined): Task[] {
  const classTasks = classSlug ? tasks.filter((t) => t.class_slug === classSlug) : [];
  if (classTasks.length > 0) return classTasks;
  return tasks.filter((t) => !t.class_slug);
}

export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
  class_slug: string | null;
  must_reset_password: boolean;
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
      .select(
        "id, kind, class_slug, title, article_title, source_note, footnote, description, paragraphs, max_points, sort_order, help_sections",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("questions")
      .select(
        "id, task_id, kind, prompt, options, points, sort_order, note, passage, paragraph_refs, group_label, parent_key, input_size",
      )
      .order("sort_order", { ascending: true }),
  ]);
  if (tasksRes.error) throw tasksRes.error;
  if (questionsRes.error) throw questionsRes.error;

  const questions = (questionsRes.data ?? []).map((q) => ({
    ...q,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    paragraph_refs: Array.isArray(q.paragraph_refs) ? (q.paragraph_refs as number[]) : [],
    note: (q.note ?? null) as QuestionNote | null,
  })) as Question[];

  return (tasksRes.data ?? []).map((t) => ({
    ...t,
    paragraphs: Array.isArray(t.paragraphs) ? (t.paragraphs as string[]) : [],
    help_sections: Array.isArray(t.help_sections) ? (t.help_sections as HelpSection[]) : [],
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
