import { useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NB10_TASK_TITLE } from "@/components/tasks/new-beginnings-10/content";
import { MI_TASK_TITLE } from "@/components/tasks/main-idea-10-1/content";

/**
 * שכבת דיווח בין ענפי המשימות של מרחב לימוד ללוח המורה.
 * כל ענף מנהל את הנתונים שלו בעצמו ומדווח כאן, בממשק אחיד, מי הגיש ומי קיבל ציון.
 * הלוח לא יודע דבר על ענף מסוים — הוא רק מסכם.
 */
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
  title: string;
  fetchForClass: (classSlug: string) => Promise<BranchTaskState[]>;
};

/** ענף המשימות הכללי של המערך (tasks / task_completions / task_grades). */
const coreBranch: SpaceTaskBranch = {
  id: "core-tasks",
  title: "משימות המרחב",
  fetchForClass: async (classSlug) => {
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("class_slug", classSlug);
    if (tasksError) throw tasksError;
    const taskIds = (tasks ?? []).map((t) => t.id);
    if (taskIds.length === 0) return [];

    const [{ data: completions, error: cErr }, { data: grades, error: gErr }] = await Promise.all([
      supabase
        .from("task_completions")
        .select("student_id, task_id, completed_at")
        .in("task_id", taskIds),
      supabase.from("task_grades").select("student_id, task_id, grade").in("task_id", taskIds),
    ]);
    if (cErr) throw cErr;
    if (gErr) throw gErr;

    const titles = new Map((tasks ?? []).map((t) => [t.id, t.title]));
    return (completions ?? []).map((c) => ({
      branchId: "core-tasks",
      taskId: c.task_id,
      title: titles.get(c.task_id) ?? "משימה",
      studentId: c.student_id,
      submittedAt: c.completed_at,
      grade:
        (grades ?? []).find((g) => g.student_id === c.student_id && g.task_id === c.task_id)
          ?.grade ?? null,
    }));
  },
};

/** ענף המשימה "התחלות חדשות" (nb10_*). */
const newBeginnings10Branch: SpaceTaskBranch = {
  id: "new-beginnings-10",
  title: NB10_TASK_TITLE,
  fetchForClass: async (classSlug) => {
    const { data: tasks, error } = await supabase
      .from("nb10_tasks")
      .select("id")
      .eq("class_slug", classSlug);
    if (error) throw error;
    const taskIds = (tasks ?? []).map((t) => t.id);
    if (taskIds.length === 0) return [];

    const [{ data: subs, error: sErr }, { data: notes, error: nErr }] = await Promise.all([
      supabase.from("nb10_submissions").select("student_id, task_id, submitted_at").in("task_id", taskIds),
      supabase
        .from("nb10_notes")
        .select("student_id, task_id, score")
        .in("task_id", taskIds)
        .is("question_id", null),
    ]);
    if (sErr) throw sErr;
    if (nErr) throw nErr;

    return (subs ?? []).map((s) => ({
      branchId: "new-beginnings-10",
      taskId: s.task_id,
      title: NB10_TASK_TITLE,
      studentId: s.student_id,
      submittedAt: s.submitted_at,
      grade:
        (notes ?? []).find((n) => n.student_id === s.student_id && n.task_id === s.task_id)?.score ??
        null,
    }));
  },
};

/** ענף המשימה "ניסוח רעיון מרכזי — תרגול" (mi_*). */
const mainIdeaBranch: SpaceTaskBranch = {
  id: "main-idea",
  title: MI_TASK_TITLE,
  fetchForClass: async (classSlug) => {
    const { data: tasks, error } = await supabase
      .from("mi_tasks")
      .select("id")
      .eq("class_slug", classSlug);
    if (error) throw error;
    const taskIds = (tasks ?? []).map((t) => t.id);
    if (taskIds.length === 0) return [];

    const [{ data: subs, error: sErr }, { data: notes, error: nErr }] = await Promise.all([
      supabase
        .from("mi_submissions")
        .select("student_id, task_id, submitted_at")
        .in("task_id", taskIds),
      supabase
        .from("mi_notes")
        .select("student_id, task_id, score")
        .in("task_id", taskIds)
        .is("item_key", null),
    ]);
    if (sErr) throw sErr;
    if (nErr) throw nErr;

    return (subs ?? []).map((s) => ({
      branchId: "main-idea",
      taskId: s.task_id,
      title: MI_TASK_TITLE,
      studentId: s.student_id,
      submittedAt: s.submitted_at,
      grade:
        (notes ?? []).find((n) => n.student_id === s.student_id && n.task_id === s.task_id)?.score ??
        null,
    }));
  },
};

export const SPACE_TASK_BRANCHES: SpaceTaskBranch[] = [
  coreBranch,
  newBeginnings10Branch,
  mainIdeaBranch,
];


export const SPACE_ROLLUP_KEY = "space-task-rollup";

/**
 * מסכם את כל ענפי המשימות של המרחב: מי הגיש/ה וטרם קיבל/ה ציון, ואילו ציונים נרשמו.
 * הוספת ענף חדש בעתיד נספרת אוטומטית, בלי לגעת בלוח.
 */
export function useSpaceTaskRollup(classSlug: string | null | undefined) {
  const queryClient = useQueryClient();
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

  const rows = useMemo(
    () => results.flatMap((r) => r.data ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results.map((r) => r.dataUpdatedAt).join("|")],
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
      map.set(row.studentId, [...(map.get(row.studentId) ?? []), { title: row.title, grade: row.grade }]);
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

  const refresh = () => queryClient.invalidateQueries({ queryKey: [SPACE_ROLLUP_KEY] });

  return { rows, pendingByStudent, gradesByStudent, submittedByStudent, refresh };
}
