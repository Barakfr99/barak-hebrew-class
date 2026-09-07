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
  part_id: string | null;
  weight: number | null;
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

/** אופן חישוב ציון המשימה: חלוקת אחוזים בין השאלות, או הגשה (0/100). */
export type GradingMode = "weighted" | "submission";

/** חלק פנימי בתוך משימה: "הכול חובה" או "בחירה של X מתוך Y". */
export type TaskPart = {
  id: string;
  title: string;
  description?: string;
  kind?: "questions" | "parts_of_speech";
  selection_mode: "all" | "choose_n";
  choose_count?: number;
};

export type Task = {
  id: string;
  kind: "required" | "choice" | "parts_of_speech";
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
  task_parts: TaskPart[];
  grading_mode: GradingMode;
  is_active: boolean;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
  questions: Question[];
};

/** האם המשימה פתוחה עכשיו לתלמידים: פעילה ובתוך חלון התזמון. */
export function isTaskOpen(task: Task, now: Date = new Date()): boolean {
  if (!task.is_active) return false;
  if (task.opens_at && new Date(task.opens_at) > now) return false;
  if (task.closes_at && new Date(task.closes_at) < now) return false;
  return true;
}

/** רשימת החלקים של משימה. משימה בלי חלקים מוגדרים נחשבת כחלק אחד. */
export function taskParts(task: Task): TaskPart[] {
  if (task.task_parts.length > 0) return task.task_parts;
  return [
    {
      id: "a",
      title: task.title,
      description: task.description,
      kind: task.kind === "parts_of_speech" ? "parts_of_speech" : "questions",
      selection_mode: "all",
    },
  ];
}

/** השאלות של חלק מסוים. חלק ראשון אוסף גם שאלות בלי שיוך. */
export function questionsForPart(task: Task, part: TaskPart, index: number): Question[] {
  return task.questions.filter((q) =>
    q.part_id ? q.part_id === part.id : index === 0,
  );
}

/** משימה "וירטואלית" לחלק בודד, לשימוש ברכיבי התרגול הקיימים. */
export function partAsTask(task: Task, part: TaskPart, index: number): Task {
  return {
    ...task,
    title: part.title,
    description: part.description ?? "",
    questions: questionsForPart(task, part, index),
  };
}

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
      teacher_code: "5598956",
      speech_mode: "two_tracks",
      required_choice_count: 2,
    };
  }
  return data as Settings;
}

const TASK_COLUMNS =
  "id, kind, class_slug, title, article_title, source_note, footnote, description, paragraphs, max_points, sort_order, help_sections, task_parts, grading_mode, is_active, opens_at, closes_at, created_at";

/** כל המשימות, כולל לא פעילות ומחוץ לחלון התזמון — לשימוש לוח המורה. */
export async function fetchAllTasks(): Promise<Task[]> {
  const [tasksRes, questionsRes] = await Promise.all([
    supabase.from("tasks").select(TASK_COLUMNS).order("created_at", { ascending: false }),
    supabase
      .from("questions")
      .select(
        "id, task_id, kind, prompt, options, points, sort_order, note, passage, paragraph_refs, group_label, parent_key, input_size, part_id, weight",
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
    task_parts: Array.isArray(t.task_parts) ? (t.task_parts as TaskPart[]) : [],
    grading_mode: (t.grading_mode ?? "weighted") as GradingMode,
    is_active: t.is_active ?? true,
    opens_at: t.opens_at ?? null,
    closes_at: t.closes_at ?? null,
    questions: questions.filter((q) => q.task_id === t.id),
  })) as Task[];
}

/** המשימות הפתוחות לתלמידים בלבד. */
export async function fetchTasks(): Promise<Task[]> {
  const all = await fetchAllTasks();
  return all.filter((t) => isTaskOpen(t));
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

/** שם משפחה שמסמן תלמיד/ת בדיקה של המורה (לא מוצג לתלמידים ולא נספר בלוח). */
export const TEACHER_TEST_LAST_NAME = "בדיקת מורה";

export function isTeacherTestStudent(student: { last_name: string }) {
  return student.last_name === TEACHER_TEST_LAST_NAME;
}

/** מחזיר (ויוצר בפעם הראשונה) תלמיד/ת בדיקה לכיתה, כדי לפתוח את המשימות בלי רישום. */
export async function ensureTeacherTestStudent(cls: {
  slug: string;
  name: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("students")
    .select("id")
    .eq("class_slug", cls.slug)
    .eq("last_name", TEACHER_TEST_LAST_NAME)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return data.id;

  const { data: created, error: insertError } = await supabase
    .from("students")
    .insert({
      first_name: cls.name,
      last_name: TEACHER_TEST_LAST_NAME,
      class_name: cls.name,
      class_slug: cls.slug,
      mode: "regular",
      speech_enabled: false,
      stage: "choice",
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}

/**
 * פתיחה מחדש של המשימה לתלמיד/ה להגשה חוזרת ותיקון:
 * התשובות והציונים נשמרים, אבל סימוני הסיום והמשוב מתאפסים כדי שיוכל/תוכל לתקן ולהגיש שוב.
 */
export async function reopenStudentTasks(studentId: string) {
  const results = await Promise.all([
    supabase.from("task_completions").delete().eq("student_id", studentId),
    supabase.from("feedback").delete().eq("student_id", studentId),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  const { error } = await supabase
    .from("students")
    .update({
      stage: "choice",
      finished_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);
  if (error) throw error;
}

/** מנקה את התשובות וההתקדמות של תלמיד/ת הבדיקה, כדי להתחיל בדיקה מחדש. */
export async function resetTeacherTestStudent(studentId: string) {
  const results = await Promise.all([
    supabase.from("answers").delete().eq("student_id", studentId),
    supabase.from("task_completions").delete().eq("student_id", studentId),
    supabase.from("feedback").delete().eq("student_id", studentId),
    supabase.from("task_grades").delete().eq("student_id", studentId),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  const { error } = await supabase
    .from("students")
    .update({
      stage: "choice",
      choice_slot_1_task_id: null,
      choice_slot_2_task_id: null,
      grade_required: null,
      grade_choice_1: null,
      grade_choice_2: null,
      finished_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);
  if (error) throw error;
}


export type TaskGrade = { student_id: string; task_id: string; grade: number | null };

export async function fetchTaskGrades(): Promise<TaskGrade[]> {
  const { data, error } = await supabase.from("task_grades").select("student_id, task_id, grade");
  if (error) throw error;
  return (data ?? []) as TaskGrade[];
}

export async function saveTaskGrade(input: {
  studentId: string;
  taskId: string;
  grade: number | null;
}) {
  const { error } = await supabase.from("task_grades").upsert(
    {
      student_id: input.studentId,
      task_id: input.taskId,
      grade: input.grade,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,task_id" },
  );
  if (error) throw error;
}
