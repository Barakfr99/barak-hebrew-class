import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NB10_TASK_TITLE } from "./content";
import { fetchNB10Submission, fetchNB10Task, isNB10Open } from "./data";

/** כרטיס הכניסה למשימה "התחלות חדשות" ברשימת המשימות של התלמיד/ה. */
export function NB10TaskCard({
  classSlug,
  studentId,
}: {
  classSlug: string | null | undefined;
  studentId: string;
}) {
  const taskQuery = useQuery({
    queryKey: ["nb10-task", classSlug ?? null],
    queryFn: () => fetchNB10Task(classSlug!),
    enabled: Boolean(classSlug),
  });
  const task = taskQuery.data ?? null;
  const submissionQuery = useQuery({
    queryKey: ["nb10-submission", task?.id, studentId],
    queryFn: () => fetchNB10Submission(task!.id, studentId),
    enabled: Boolean(task?.id),
  });

  if (!task || !isNB10Open(task)) return null;
  const done = Boolean(submissionQuery.data);

  return (
    <div
      className={`rounded-3xl border bg-card p-5 ${done ? "border-success/40 bg-success/5" : "border-border"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{NB10_TASK_TITLE}</h3>
            {done && (
              <Badge className="bg-success text-success-foreground">
                <Check className="size-3" /> הוגשה
              </Badge>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">
            תשעה עמודים קצרים: קריאה לפי פסקאות, שאלות, כתיבה מסכמת ומשוב — עם עוזר שיטה מלווה.
          </p>
        </div>
        <Button asChild size="lg" variant={done ? "outline" : "default"}>
          <Link to="/task/new-beginnings-10">
            <Sparkles className="size-4" />
            {done ? "צפייה בתשובות" : "כניסה למשימה"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
