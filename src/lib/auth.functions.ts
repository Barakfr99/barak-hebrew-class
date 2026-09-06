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

const listSchema = z.object({ classSlug: z.string().min(1).max(20) });

export const listClassStudents = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("students")
      .select("id, first_name, last_name, must_reset_password")
      .eq("class_slug", data.classSlug)
      .order("first_name", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashPassword } = await import("./password.server");
    const passwordHash = await hashPassword(data.password);

    const { data: existing } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("class_slug", data.classSlug)
      .ilike("first_name", data.firstName)
      .ilike("last_name", data.lastName)
      .maybeSingle();
    if (existing) {
      const { data: credentials } = await supabaseAdmin
        .from("student_credentials")
        .select("student_id")
        .eq("student_id", existing.id)
        .maybeSingle();
      if (!credentials) {
        const { error: credentialError } = await supabaseAdmin
          .from("student_credentials")
          .insert({ student_id: existing.id, password_hash: passwordHash });
        if (credentialError) throw new Error(credentialError.message);

        const { error: updateError } = await supabaseAdmin
          .from("students")
          .update({
            class_name: data.className,
            mode: data.mode,
            speech_enabled: data.speechEnabled,
            must_reset_password: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (updateError) throw new Error(updateError.message);
        return { ok: true as const, studentId: existing.id as string };
      }
      return { ok: false as const, reason: "exists" as const };
    }

    const { data: created, error } = await supabaseAdmin
      .from("students")
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        class_name: data.className,
        class_slug: data.classSlug,
        mode: data.mode,
        speech_enabled: data.speechEnabled,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "insert failed");

    const { error: credError } = await supabaseAdmin
      .from("student_credentials")
      .insert({ student_id: created.id, password_hash: passwordHash });
    if (credError) {
      await supabaseAdmin.from("students").delete().eq("id", created.id);
      throw new Error(credError.message);
    }

    return { ok: true as const, studentId: created.id as string };
  });

const loginSchema = z.object({
  studentId: z.string().uuid(),
  password: z.string().min(1).max(200),
});

export const loginStudent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPassword } = await import("./password.server");

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, must_reset_password")
      .eq("id", data.studentId)
      .maybeSingle();
    if (!student) return { ok: false as const, reason: "not_found" as const };
    if (student.must_reset_password) return { ok: false as const, reason: "must_reset" as const };

    const { data: cred } = await supabaseAdmin
      .from("student_credentials")
      .select("password_hash")
      .eq("student_id", data.studentId)
      .maybeSingle();
    if (!cred) {
      // אין סיסמה שמורה — מסמנים שצריך לבחור סיסמה חדשה.
      await supabaseAdmin
        .from("students")
        .update({ must_reset_password: true, updated_at: new Date().toISOString() })
        .eq("id", data.studentId);
      return { ok: false as const, reason: "must_reset" as const };
    }

    const valid = await verifyPassword(data.password, cred.password_hash);
    if (!valid) return { ok: false as const, reason: "bad_password" as const };
    return { ok: true as const, studentId: student.id as string };
  });

const newPasswordSchema = z.object({
  studentId: z.string().uuid(),
  password: z.string().min(1).max(200),
});

/** Used only after the teacher cleared the password. */
export const setNewPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => newPasswordSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashPassword } = await import("./password.server");

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, must_reset_password")
      .eq("id", data.studentId)
      .maybeSingle();
    if (!student) return { ok: false as const, reason: "not_found" as const };
    if (!student.must_reset_password) return { ok: false as const, reason: "not_allowed" as const };

    const { error } = await supabaseAdmin.from("student_credentials").upsert(
      {
        student_id: data.studentId,
        password_hash: await hashPassword(data.password),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );
    if (error) throw new Error(error.message);

    const { error: flagError } = await supabaseAdmin
      .from("students")
      .update({ must_reset_password: false, updated_at: new Date().toISOString() })
      .eq("id", data.studentId);
    if (flagError) throw new Error(flagError.message);

    return { ok: true as const, studentId: student.id as string };
  });

const resetSchema = z.object({
  studentId: z.string().uuid(),
  teacherCode: z.string().min(1).max(60),
});

export const teacherResetPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resetSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await supabaseAdmin
      .from("practice_settings")
      .select("teacher_code")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const expected = settings?.teacher_code ?? "5598956";
    if (data.teacherCode.trim() !== expected) {
      return { ok: false as const, reason: "bad_code" as const };
    }

    await supabaseAdmin.from("student_credentials").delete().eq("student_id", data.studentId);
    const { error } = await supabaseAdmin
      .from("students")
      .update({ must_reset_password: true, updated_at: new Date().toISOString() })
      .eq("id", data.studentId);
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });
