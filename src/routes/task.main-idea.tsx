import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClearDeviceButton } from "@/components/practice/ClearDeviceButton";
import { PageNav } from "@/components/layout/PageNav";
import { rememberClassSlug } from "@/lib/session";
import { fetchStudent, readDeviceStudentId } from "@/lib/practice";
import { supabase } from "@/integrations/supabase/client";
import { MI_TASK_TITLE } from "@/components/tasks/main-idea-10-1/content";
import { fetchMITask, isMIOpen } from "@/components/tasks/main-idea-10-1/data";
import { MainIdeaWizard } from "@/components/tasks/main-idea-10-1/Wizard";

export const Route = createFileRoute("/task/main-idea")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ניסוח רעיון מרכזי — תרגול" },
      {
        name: "description",
        content:
          "תרגול ניסוח רעיון מרכזי: זיהוי נושא ומסר, בדיקת ניסוחים לפי צ'ק-ליסט וניסוח עצמאי בשלושה עמודים קצרים.",
      },
      { property: "og:title", content: "ניסוח רעיון מרכזי — תרגול" },
      {
        property: "og:description",
        content: "שלושה עמודים קצרים לתרגול זיהוי וניסוח של רעיון מרכזי, עם שמירה אוטומטית.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MainIdeaPage,
});

function MainIdeaPage() {
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
    queryKey: ["mi-task", classSlug],
    queryFn: () => fetchMITask(classSlug!),
    enabled: Boolean(classSlug),
  });
  const task = taskQuery.data ?? null;

  /** הקראה מופעלת רק אם המורה אישר/ה אותה לתלמיד/ה במשימה הזו. */
  const speechQuery = useQuery({
    queryKey: ["mi-speech", task?.id, studentId],
    enabled: Boolean(task?.id && studentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mi_student_speech")
        .select("allowed")
        .eq("task_id", task!.id)
        .eq("student_id", studentId!)
        .maybeSingle();
      if (error) throw error;
      return data?.allowed ?? false;
    },
  });

  const loading = !studentId || studentQuery.isLoading || taskQuery.isLoading;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {studentQuery.data?.first_name} {studentQuery.data?.last_name}
            {studentQuery.data?.class_name ? ` · ${studentQuery.data.class_name}` : ""}
          </p>
          <h1 className="text-2xl font-bold">{MI_TASK_TITLE}</h1>
        </div>
        <ClearDeviceButton />
      </div>
      <div className="mt-3">
        <PageNav classSlug={classSlug ?? undefined} />
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-muted-foreground">רגע, טוענים את המשימה...</p>
        ) : !task || !isMIOpen(task) ? (
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
          <MainIdeaWizard
            task={task}
            studentId={studentId!}
            speechEnabled={speechQuery.data ?? false}
            onExit={() => navigate({ to: "/practice" })}
          />
        )}
      </div>
    </main>
  );
}
