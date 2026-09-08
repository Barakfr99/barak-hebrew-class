import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchRunnerSubmission, fetchRunnerTask, isRunnerTaskOpen } from "@/lib/task-runner/data";

/** כרטיס כניסה גנרי לכל משימת runner — לפי taskId, בלי תלות בתוכן. */
export function RunnerTaskCard({ taskId, studentId }: { taskId: string; studentId: string }) {
  const taskQuery = useQuery({
    queryKey: ["runner-task", taskId],
    queryFn: () => fetchRunnerTask(taskId),
  });
  const task = taskQuery.data ?? null;
  const submissionQuery = useQuery({
    queryKey: ["runner-submission", taskId, studentId],
    queryFn: () => fetchRunnerSubmission(taskId, studentId),
    enabled: Boolean(task),
  });

  if (!task || !isRunnerTaskOpen(task)) return null;
  const done = Boolean(submissionQuery.data);

  return (
    <div
      className={`rounded-3xl border bg-card p-5 ${done ? "border-success/40 bg-success/5" : "border-border"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{task.title}</h3>
            {done && (
              <Badge className="bg-success text-success-foreground">
                <Check className="size-3" /> הוגשה
              </Badge>
            )}
          </div>
        </div>
        <Button asChild size="lg" variant={done ? "outline" : "default"}>
          <Link to="/task/runner/$taskId" params={{ taskId }}>
            <Sparkles className="size-4" />
            {done ? "צפייה בתשובות" : "כניסה למשימה"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
