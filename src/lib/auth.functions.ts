import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** שמות תלמידים חייבים להיות בעברית (מותרים גם רווח, גרש ומקף). */
const HEBREW_NAME = /^[\u0590-\u05FF]+(?:[ '"׳״-][\u0590-\u05FF]+)*$/;

const nameSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(HEBREW_NAME, "יש להזין את השם בעברית");

/** לקוח צד-שרת עם המפתח הציבורי — כל פעולות הסיסמאות רצות בפונקציות מסד מאובטחות. */
async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!;
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["SUPABASE_ANON_KEY"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type RpcResult = {
  ok: boolean;
  reason?: string;
  student_id?: string;
};

const listSchema = z.object({ classSlug: z.string().min(1).max(20) });

export const listClassStudents = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    const { data: rows, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, must_reset_password")
      .eq("class_slug", data.classSlug)
      .order("first_name", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as {
      id: string;
      first_name: string;
      last_name: string;
      must_reset_password: boolean;
    }[];
  });

const registerSchema = z.object({
  classSlug: z.string().min(1).max(20),
  className: z.string().min(1).max(60),
  firstName: nameSchema,
  lastName: nameSchema,
  password: z.string().min(1).max(200),
  speechEnabled: z.boolean(),
  mode: z.enum(["regular", "adaptive"]),
});

export const registerStudent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => registerSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    const { data: result, error } = await supabase.rpc("student_register", {
      p_class_slug: data.classSlug,
      p_class_name: data.className,
      p_first_name: data.firstName,
      p_last_name: data.lastName,
      p_password: data.password,
      p_speech_enabled: data.speechEnabled,
      p_mode: data.mode,
    });
    if (error) throw new Error(error.message);
    const res = result as RpcResult;
    if (!res?.ok) return { ok: false as const, reason: (res?.reason ?? "exists") as "exists" };
    return { ok: true as const, studentId: res.student_id as string };
  });

const loginSchema = z.object({
  studentId: z.string().uuid(),
  password: z.string().min(1).max(200),
});

export const loginStudent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    const { data: result, error } = await supabase.rpc("student_login", {
      p_student_id: data.studentId,
      p_password: data.password,
    });
    if (error) throw new Error(error.message);
    const res = result as RpcResult;
    if (!res?.ok) {
      return {
        ok: false as const,
        reason: (res?.reason ?? "not_found") as "not_found" | "must_reset" | "bad_password",
      };
    }
    return { ok: true as const, studentId: res.student_id as string };
  });

const newPasswordSchema = z.object({
  studentId: z.string().uuid(),
  password: z.string().min(1).max(200),
});

/** Used only after the teacher cleared the password. */
export const setNewPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => newPasswordSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    const { data: result, error } = await supabase.rpc("student_set_password", {
      p_student_id: data.studentId,
      p_password: data.password,
    });
    if (error) throw new Error(error.message);
    const res = result as RpcResult;
    if (!res?.ok) {
      return {
        ok: false as const,
        reason: (res?.reason ?? "not_allowed") as "not_found" | "not_allowed",
      };
    }
    return { ok: true as const, studentId: res.student_id as string };
  });

const resetSchema = z.object({
  studentId: z.string().uuid(),
  teacherCode: z.string().min(1).max(60),
});

export const teacherResetPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resetSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    const { data: result, error } = await supabase.rpc("student_clear_password", {
      p_student_id: data.studentId,
      p_teacher_code: data.teacherCode,
    });
    if (error) throw new Error(error.message);
    const res = result as RpcResult;
    if (!res?.ok) return { ok: false as const, reason: "bad_code" as const };
    return { ok: true as const };
  });

export const teacherDeleteStudent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resetSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    // מנקה את הסיסמה דרך פונקציית המסד — היא גם מאמתת את קוד המורה.
    const { data: cleared, error: clearError } = await supabase.rpc("student_clear_password", {
      p_student_id: data.studentId,
      p_teacher_code: data.teacherCode,
    });
    if (clearError) throw new Error(clearError.message);
    if (!(cleared as RpcResult)?.ok) return { ok: false as const, reason: "bad_code" as const };

    await supabase.from("answers").delete().eq("student_id", data.studentId);
    await supabase.from("task_completions").delete().eq("student_id", data.studentId);
    await supabase.from("task_grades").delete().eq("student_id", data.studentId);
    await supabase.from("feedback").delete().eq("student_id", data.studentId);
    const { error } = await supabase.from("students").delete().eq("id", data.studentId);
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });
