import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MI_TASK_TITLE } from "./content";
import { fetchMISubmission, fetchMITask, isMIOpen } from "./data";

/** כרטיס הכניסה למשימה "ניסוח רעיון מרכזי" ברשימת המשימות של התלמיד/ה. */
export function MITaskCard({
  classSlug,
  studentId,
}: {
  classSlug: string | null | undefined;
  studentId: string;
}) {
  const taskQuery = useQuery({
    queryKey: ["mi-task", classSlug ?? null],
    queryFn: () => fetchMITask(classSlug!),
    enabled: Boolean(classSlug),
  });
  const task = taskQuery.data ?? null;
  const submissionQuery = useQuery({
    queryKey: ["mi-submission", task?.id, studentId],
    queryFn: () => fetchMISubmission(task!.id, studentId),
    enabled: Boolean(task?.id),
  });

  if (!task || !isMIOpen(task)) return null;
  const done = Boolean(submissionQuery.data);

  return (
    <div
      className={`rounded-3xl border bg-card p-5 ${done ? "border-success/40 bg-success/5" : "border-border"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{MI_TASK_TITLE}</h3>
            {done && (
              <Badge className="bg-success text-success-foreground">
                <Check className="size-3" /> הוגשה
              </Badge>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">
            שלושה עמודים קצרים: איך מזהים רעיון מרכזי, איך בודקים ניסוח, וניסוח עצמאי.
          </p>
        </div>
        <Button asChild size="lg" variant={done ? "outline" : "default"}>
          <Link to="/task/main-idea">
            <Lightbulb className="size-4" />
            {done ? "צפייה בתשובות" : "כניסה למשימה"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
