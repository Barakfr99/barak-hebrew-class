import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClearDeviceButton } from "@/components/practice/ClearDeviceButton";
import { PageNav } from "@/components/layout/PageNav";
import { rememberClassSlug } from "@/lib/session";
import { fetchStudent, readDeviceStudentId } from "@/lib/practice";
import { NB10_TASK_TITLE } from "@/components/tasks/new-beginnings-10/content";
import { fetchNB10Task, isNB10Open } from "@/components/tasks/new-beginnings-10/data";
import { NewBeginnings10Wizard } from "@/components/tasks/new-beginnings-10/Wizard";

export const Route = createFileRoute("/task/new-beginnings-10")({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'התחלות חדשות — משימת הבנת הנקרא' },
      {
        name: "description",
        content:
          "משימת הבנת הנקרא 'התחלות חדשות' לכיתות י': תשעה עמודים קצרים, שמירה אוטומטית ועוזר AI מלווה.",
      },
      { property: "og:title", content: 'התחלות חדשות — משימת הבנת הנקרא' },
      {
        property: "og:description",
        content: "תשעה עמודי תרגול קצרים עם שמירה אוטומטית ועוזר AI מלווה.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NB10Page,
});

function NB10Page() {
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
  const taskQuery = useQuery({
    queryKey: ["nb10-task", classSlug],
    queryFn: () => fetchNB10Task(classSlug!),
    enabled: Boolean(classSlug),
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
          <h1 className="text-2xl font-bold">{NB10_TASK_TITLE}</h1>
        </div>
        <ClearDeviceButton />
      </div>
      <div className="mt-3">
        <PageNav classSlug={classSlug ?? undefined} />
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-muted-foreground">רגע, טוענים את המשימה...</p>
        ) : !taskQuery.data || !isNB10Open(taskQuery.data) ? (
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
          <NewBeginnings10Wizard
            task={taskQuery.data}
            studentId={studentId!}
            onExit={() => navigate({ to: "/practice" })}
          />
        )}
      </div>
    </main>
  );
}
