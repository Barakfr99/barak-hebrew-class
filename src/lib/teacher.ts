import { supabase } from "@/integrations/supabase/client";
import type { SchoolClass } from "@/lib/classes";

export async function setTaskSpeech(studentId: string, taskId: string, allowed: boolean) {
  const { error } = await supabase
    .from("student_task_speech")
    .upsert(
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
