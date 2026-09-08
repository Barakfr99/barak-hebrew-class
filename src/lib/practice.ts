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

export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
  class_slug: string | null;
  must_reset_password: boolean;
  mode: "regular" | "adaptive";
  speech_enabled: boolean;
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

export async function fetchStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Student) ?? null;
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
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}

/** מנקה את תשובות וההגשות של תלמיד/ת הבדיקה בכל משימות ה-runner, כדי להתחיל בדיקה מחדש. */
export async function resetTeacherTestStudent(studentId: string) {
  const results = await Promise.all([
    supabase.from("runner_answers").delete().eq("student_id", studentId),
    supabase.from("runner_submissions").delete().eq("student_id", studentId),
    supabase.from("runner_notes").delete().eq("student_id", studentId),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}
