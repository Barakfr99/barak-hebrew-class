import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchSettings, fetchStudent, readDeviceStudentId } from "@/lib/practice";
import { ClearDeviceButton } from "@/components/practice/ClearDeviceButton";
import { PageNav } from "@/components/layout/PageNav";
import { rememberClassSlug } from "@/lib/session";
import { RunnerTaskCard } from "@/components/task-runner/TaskCard";
import { useSpaceTaskList } from "@/lib/space-tasks";

export const Route = createFileRoute("/practice")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "התרגול שלי — הבנת הנקרא" },
      {
        name: "description",
        content: "מסך התרגול: המשימות הפתוחות במרחב הלימוד שלי.",
      },
      { property: "og:title", content: "התרגול שלי — הבנת הנקרא" },
      { property: "og:description", content: "המשימות הפתוחות במרחב הלימוד שלי." },
    ],
  }),
  component: PracticePage,
});

function PracticePage() {
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

  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const studentQuery = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => fetchStudent(studentId!),
    enabled: Boolean(studentId),
  });
  const student = studentQuery.data;

  useEffect(() => {
    rememberClassSlug(student?.class_slug);
  }, [student?.class_slug]);

  /** רשימת המשימות הפתוחות במרחב, מהרשם — כל משימה עצמאית לגמרי. */
  const registry = useSpaceTaskList(student?.class_slug);
  const taskIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    registry.tasks.forEach((entry) => {
      if (!seen.has(entry.id)) {
        ids.push(entry.id);
        seen.add(entry.id);
      }
    });
    return ids;
  }, [registry.tasks]);

  const loading = !studentId || studentQuery.isLoading;

  if (loading) {
    return <main className="p-10 text-muted-foreground">רגע, טוענים את התרגול...</main>;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {student?.first_name} {student?.last_name}
            {student?.class_name ? ` · ${student.class_name}` : ""}
          </p>
          <h1 className="text-2xl font-bold">{settingsQuery.data?.practice_name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClearDeviceButton />
        </div>
      </div>
      <div className="mt-3">
        <PageNav classSlug={student?.class_slug} />
      </div>

      <div className="mt-8 space-y-5">
        <h2 className="text-xl font-bold">{taskIds.length > 1 ? "המשימות שלי" : "המשימה שלי"}</h2>
        {taskIds.length === 0 ? (
          <p className="text-muted-foreground">
            {registry.isLoading ? "טוענים משימות..." : "אין כרגע משימות פתוחות במרחב שלכם."}
          </p>
        ) : (
          <div className="space-y-3">
            {taskIds.map((taskId) => (
              <RunnerTaskCard key={taskId} taskId={taskId} studentId={studentId!} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
