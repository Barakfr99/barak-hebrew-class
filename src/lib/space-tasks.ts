import { useMemo } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * רשם המשימות של מרחבי הלימוד.
 *
 * מקור האמת לכל משימה — בכל מרחב, מכל סוג — הוא שורה אחת בטבלת `tasks`:
 * כותרת, מרחב, מנוע (מי מרנדר אותה), מצב, מועדים, אופן ניקוד ותאריך פרסום.
 * משימות עם engine="runner" מוגדרות כ-JSON בעמודת definition ושומרות את
 * הנתונים בטבלאות המשותפות (runner_answers/submissions/notes) — בלי טבלה למשימה.
 */

export type TaskEngine = "runner";
export type RegistryGradingMode = "weighted" | "submission" | "manual";

export type RegistryTask = {
  id: string;
  classSlug: string | null;
  spaceId: string | null;
  title: string;
  description: string;
  engine: TaskEngine;
  kind: string;
  isActive: boolean;
  opensAt: string | null;
  closesAt: string | null;
  gradingMode: RegistryGradingMode;
  publishedAt: string;
  createdAt: string;
  sortOrder: number;
};

export const ENGINE_LABELS: Record<TaskEngine, string> = {
  runner: "אשף עמודים (חבילת JSON)",
};

export const GRADING_MODE_LABELS: Record<RegistryGradingMode, string> = {
  weighted: "ניקוד לכל שאלה (אחוזים)",
  submission: "ניקוד הגשה — 0 / 50 / 75 / 100",
  manual: "ציון ידני למשימה",
};

const REGISTRY_COLUMNS =
  "id, class_slug, space_id, title, description, engine, kind, is_active, opens_at, closes_at, grading_mode, published_at, created_at, sort_order";

type RegistryRow = {
  id: string;
  class_slug: string | null;
  space_id: string | null;
  title: string;
  description: string;
  engine: string;
  kind: string;
  is_active: boolean;
  opens_at: string | null;
  closes_at: string | null;
  grading_mode: string;
  published_at: string | null;
  created_at: string;
  sort_order: number;
};

function toRegistryTask(row: RegistryRow): RegistryTask {
  return {
    id: row.id,
    classSlug: row.class_slug,
    spaceId: row.space_id,
    title: row.title,
    description: row.description ?? "",
    engine: (row.engine as TaskEngine) ?? "runner",
    kind: row.kind,
    isActive: row.is_active,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    gradingMode: (row.grading_mode as RegistryGradingMode) ?? "submission",
    publishedAt: row.published_at ?? row.created_at,
    createdAt: row.created_at,
    sortOrder: row.sort_order,
  };
}

/** המשימות של מרחב, מהחדשה לישנה (לפי תאריך הפרסום). */
export async function fetchRegistry(classSlug: string): Promise<RegistryTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(REGISTRY_COLUMNS)
    .eq("class_slug", classSlug)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RegistryRow[]).map(toRegistryTask);
}

/** האם המשימה פתוחה עכשיו לתלמידים: פעילה ובתוך חלון התזמון. */
export function isRegistryTaskOpen(task: RegistryTask, now: Date = new Date()): boolean {
  if (!task.isActive) return false;
  if (task.opensAt && new Date(task.opensAt) > now) return false;
  if (task.closesAt && new Date(task.closesAt) < now) return false;
  return true;
}

export function registryStatus(task: RegistryTask): { text: string; open: boolean } {
  const open = isRegistryTaskOpen(task);
  const text = !task.isActive
    ? "לא פעילה — התלמידים לא רואים אותה"
    : open
      ? "פתוחה לתלמידים"
      : task.opensAt && new Date(task.opensAt) > new Date()
        ? "ממתינה למועד הפתיחה"
        : "נסגרה";
  return { text, open };
}

export async function setRegistryActive(
  task: Pick<RegistryTask, "id" | "engine">,
  isActive: boolean,
) {
  const { error } = await supabase
    .from("tasks")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", task.id);
  if (error) throw error;
}

export async function setRegistrySchedule(
  task: Pick<RegistryTask, "id" | "engine">,
  schedule: { opensAt?: string | null; closesAt?: string | null },
) {
  const patch: { opens_at?: string | null; closes_at?: string | null } = {};
  if (schedule.opensAt !== undefined) patch.opens_at = schedule.opensAt;
  if (schedule.closesAt !== undefined) patch.closes_at = schedule.closesAt;
  const { error } = await supabase
    .from("tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", task.id);
  if (error) throw error;
}

export async function setRegistryGradingMode(taskId: string, mode: RegistryGradingMode) {
  const { error } = await supabase
    .from("tasks")
    .update({ grading_mode: mode, updated_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw error;
}

/** סימון מחדש של תאריך הפרסום — מעלה את המשימה לראש הרשימה. */
export async function republishRegistryTask(taskId: string) {
  const { error } = await supabase
    .from("tasks")
    .update({ published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw error;
}

export const SPACE_TASK_LIST_KEY = "space-task-list";

/** רשימת המשימות של המרחב מהרשם, מהחדשה לישנה. */
export function useSpaceTaskList(classSlug: string | null | undefined) {
  const query = useQuery({
    queryKey: [SPACE_TASK_LIST_KEY, classSlug ?? null],
    queryFn: () => fetchRegistry(classSlug!),
    enabled: Boolean(classSlug),
    refetchInterval: 30000,
  });
  return { tasks: query.data ?? [], isLoading: query.isLoading, refetch: query.refetch };
}

/* ------------------------------------------------------------------ */
/* דיווח הגשות וציונים מכל ענף — מסכם ללוח המורה                        */
/* ------------------------------------------------------------------ */

export type BranchTaskState = {
  branchId: string;
  taskId: string;
  title: string;
  studentId: string;
  submittedAt: string | null;
  grade: number | null;
};

export type SpaceTaskBranch = {
  id: string;
  engine: TaskEngine;
  fetchForClass: (classSlug: string) => Promise<BranchTaskState[]>;
};

/** ענף מנוע ה-runner: כל המשימות שמוגדרות כ-JSON חיות ישירות ב-tasks, בלי טבלת ענף. */
const runnerBranch: SpaceTaskBranch = {
  id: "runner",
  engine: "runner",
  fetchForClass: async (classSlug) => {
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("class_slug", classSlug)
      .eq("engine", "runner");
    if (error) throw error;
    const taskIds = (tasks ?? []).map((t) => t.id);
    if (taskIds.length === 0) return [];

    const [{ data: subs, error: sErr }, { data: notes, error: nErr }] = await Promise.all([
      supabase
        .from("runner_submissions")
        .select("student_id, task_id, submitted_at")
        .in("task_id", taskIds),
      supabase
        .from("runner_notes")
        .select("student_id, task_id, score")
        .in("task_id", taskIds)
        .is("item_key", null),
    ]);
    if (sErr) throw sErr;
    if (nErr) throw nErr;

    const titles = new Map((tasks ?? []).map((t) => [t.id, t.title]));
    return (subs ?? []).map((s) => ({
      branchId: "runner",
      taskId: s.task_id,
      title: titles.get(s.task_id) ?? "משימה",
      studentId: s.student_id,
      submittedAt: s.submitted_at,
      grade:
        (notes ?? []).find((n) => n.student_id === s.student_id && n.task_id === s.task_id)
          ?.score ?? null,
    }));
  },
};

export const SPACE_TASK_BRANCHES: SpaceTaskBranch[] = [runnerBranch];

export const SPACE_ROLLUP_KEY = "space-task-rollup";

/**
 * מסכם את כל ענפי המשימות של המרחב: מי הגיש/ה וטרם קיבל/ה ציון, ואילו ציונים נרשמו.
 * הכותרות נלקחות מהרשם כדי שיהיו זהות בכל מקום בלוח.
 */
export function useSpaceTaskRollup(classSlug: string | null | undefined) {
  const queryClient = useQueryClient();
  const { tasks } = useSpaceTaskList(classSlug);
  const results = useQueries({
    queries: SPACE_TASK_BRANCHES.map((branch) => ({
      queryKey: [SPACE_ROLLUP_KEY, branch.id, classSlug ?? null],
      queryFn: () => branch.fetchForClass(classSlug!),
      enabled: Boolean(classSlug),
      staleTime: 0,
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
    })),
  });

  const titles = useMemo(() => new Map(tasks.map((t) => [t.id, t.title])), [tasks]);

  const rows = useMemo(
    () =>
      results
        .flatMap((r) => r.data ?? [])
        .map((row) => ({ ...row, title: titles.get(row.taskId) ?? row.title })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results.map((r) => r.dataUpdatedAt).join("|"), titles],
  );

  const pendingByStudent = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      if (!row.submittedAt || row.grade != null) return;
      map.set(row.studentId, (map.get(row.studentId) ?? 0) + 1);
    });
    return map;
  }, [rows]);

  const gradesByStudent = useMemo(() => {
    const map = new Map<string, { title: string; grade: number }[]>();
    rows.forEach((row) => {
      if (row.grade == null) return;
      map.set(row.studentId, [
        ...(map.get(row.studentId) ?? []),
        { title: row.title, grade: row.grade },
      ]);
    });
    return map;
  }, [rows]);

  const submittedByStudent = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      if (!row.submittedAt) return;
      map.set(row.studentId, (map.get(row.studentId) ?? 0) + 1);
    });
    return map;
  }, [rows]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [SPACE_ROLLUP_KEY] });
    queryClient.invalidateQueries({ queryKey: [SPACE_TASK_LIST_KEY] });
  };

  return { rows, pendingByStudent, gradesByStudent, submittedByStudent, refresh };
}

/* ------------------------------------------------------------------ */
/* פעולות ניהול לפי מנוע — עד שכל הענפים יעברו לטבלאות הליבה             */
/* ------------------------------------------------------------------ */

/** איפוס המשימה לכל תלמידי המרחב: תשובות, הגשות, הערות/ציונים ומשוב. */
export async function resetRegistryTaskForStudents(
  task: Pick<RegistryTask, "id" | "engine">,
  studentIds: string[],
) {
  if (studentIds.length === 0) return;
  const tables = ["runner_answers", "runner_submissions", "runner_notes"] as const;
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("task_id", task.id)
      .in("student_id", studentIds);
    if (error) throw error;
  }
}
