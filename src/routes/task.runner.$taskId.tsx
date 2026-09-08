import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClearDeviceButton } from "@/components/practice/ClearDeviceButton";
import { PageNav } from "@/components/layout/PageNav";
import { rememberClassSlug } from "@/lib/session";
import { fetchStudent, readDeviceStudentId } from "@/lib/practice";
import { supabase } from "@/integrations/supabase/client";
import { fetchRunnerTask, isRunnerTaskOpen } from "@/lib/task-runner/data";
import { TaskRunnerWizard } from "@/components/task-runner/Wizard";

/**
 * עמוד ריצה גנרי לכל משימות ה-runner — לפי taskId מהכתובת.
 * משימה חדשה לא דורשת עמוד חדש: היא נכנסת דרך אותו נתיב עם מזהה אחר.
 */
export const Route = createFileRoute("/task/runner/$taskId")({
  ssr: false,
  component: RunnerTaskPage,
});

function RunnerTaskPage() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const id = readDeviceStudentId();
    if (!id) {
      navigate({ to: "/" });
      return;
    }
    setStudentId(id);
  }, [navigate]);

  const studentQuery = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => fetchStudent(studentId!),
    enabled: Boolean(studentId),
  });
  const classSlug = studentQuery.data?.class_slug ?? null;
  useEffect(() => {
    rememberClassSlug(classSlug);
  }, [classSlug]);

  const taskQuery = useQuery({
    queryKey: ["runner-task", taskId],
    queryFn: () => fetchRunnerTask(taskId),
    enabled: Boolean(taskId),
  });

  /** הקראה: מותרת רק כשההרשאה הכללית של התלמיד/ה פתוחה וגם הופעלה למשימה הזו. */
  const speechQuery = useQuery({
    queryKey: ["runner-speech", taskId, studentId],
    enabled: Boolean(studentId && taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_task_speech")
        .select("allowed")
        .eq("task_id", taskId)
        .eq("student_id", studentId!)
        .maybeSingle();
      if (error) throw error;
      return data?.allowed ?? false;
    },
  });
  const speechEnabled = Boolean(studentQuery.data?.speech_enabled) && (speechQuery.data ?? false);

  const loading = !studentId || studentQuery.isLoading || taskQuery.isLoading;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {studentQuery.data?.first_name} {studentQuery.data?.last_name}
            {studentQuery.data?.class_name ? ` · ${studentQuery.data.class_name}` : ""}
          </p>
          <h1 className="text-2xl font-bold">{taskQuery.data?.title ?? "משימה"}</h1>
        </div>
        <ClearDeviceButton />
      </div>
      <div className="mt-3">
        <PageNav classSlug={classSlug ?? undefined} />
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-muted-foreground">רגע, טוענים את המשימה...</p>
        ) : !taskQuery.data || !isRunnerTaskOpen(taskQuery.data) ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <h2 className="text-xl font-bold">המשימה סגורה כרגע</h2>
            <p className="mt-2 text-muted-foreground">
              המורה יפתח אותה בזמן השיעור. אפשר לחזור לרשימת המשימות.
            </p>
            <Button className="mt-5" onClick={() => navigate({ to: "/practice" })}>
              חזרה לרשימת המשימות
            </Button>
          </div>
        ) : (
          <TaskRunnerWizard
            task={taskQuery.data}
            studentId={studentId!}
            speechEnabled={speechEnabled}
            onExit={() => navigate({ to: "/practice" })}
          />
        )}
      </div>
    </main>
  );
}
