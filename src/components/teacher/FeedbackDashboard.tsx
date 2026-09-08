import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { fetchRunnerFeedbackAnswers, type RunnerTask } from "@/lib/task-runner/data";
import { optionText, type RunnerQuestion } from "@/lib/task-runner/types";

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {count} ({pct}%)
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Distribution({
  title,
  subtitle,
  values,
  options,
}: {
  title: string;
  subtitle?: string;
  values: string[];
  options: string[];
}) {
  const present = values.filter((v) => v.trim() !== "");
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-semibold">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      <p className="mt-1 text-sm text-muted-foreground">{present.length} תשובות</p>
      <div className="mt-3 space-y-2">
        {options.map((opt) => (
          <Bar
            key={opt}
            label={opt}
            count={present.filter((v) => v === opt).length}
            total={present.length}
          />
        ))}
      </div>
    </div>
  );
}

/** ניתוח שאלון המשוב: לכל משימת runner בנפרד ותמונה מצטברת לכיתה, ישירות מ-runner_answers. */
export function FeedbackDashboard({
  tasks,
  studentIds,
}: {
  tasks: RunnerTask[];
  studentIds: Set<string>;
}) {
  const [taskFilter, setTaskFilter] = useState("all");
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const answersQuery = useQuery({
    queryKey: ["feedback-answers", taskIds],
    queryFn: () => fetchRunnerFeedbackAnswers(taskIds),
    enabled: taskIds.length > 0,
  });

  const rows = useMemo(() => {
    const mine = (answersQuery.data ?? []).filter((r) => studentIds.has(r.student_id));
    if (taskFilter === "all") return mine;
    return mine.filter((r) => r.task_id === taskFilter);
  }, [answersQuery.data, studentIds, taskFilter]);

  const relevantTasks = taskFilter === "all" ? tasks : tasks.filter((t) => t.id === taskFilter);
  const questions = useMemo(() => {
    const map = new Map<string, RunnerQuestion>();
    relevantTasks.forEach((t) => {
      (t.definition.feedbackQuestions ?? []).forEach((q) => {
        if (!map.has(q.id)) map.set(q.id, q);
      });
    });
    return [...map.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relevantTasks.map((t) => t.id).join("|")]);

  const answersByQuestion = useMemo(() => {
    const map = new Map<string, string[]>();
    rows.forEach((r) => {
      map.set(r.item_key, [...(map.get(r.item_key) ?? []), r.answer_text]);
    });
    return map;
  }, [rows]);

  const scaleQuestions = questions.filter((q) => q.kind === "scale");
  const choiceQuestions = questions.filter((q) => q.kind === "choice");
  const openQuestions = questions.filter((q) => q.kind === "open");

  const average = (values: string[]) => {
    const nums = values.map(Number).filter((n) => !Number.isNaN(n));
    if (nums.length === 0) return "—";
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">ניתוח המשוב</h2>
          <p className="text-sm text-muted-foreground">
            {scaleQuestions.length > 0
              ? scaleQuestions
                  .map(
                    (q) =>
                      `ממוצע ${q.prompt}: ${average(answersByQuestion.get(q.id) ?? [])}${
                        q.max ? `/${q.max}` : ""
                      }`,
                  )
                  .join(" · ")
              : "אין שאלות סולם במשימות אלה."}
          </p>
        </div>
        <div className="w-64">
          <Label>משימה</Label>
          <Select value={taskFilter} onValueChange={setTaskFilter}>
            <SelectTrigger className="mt-1 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">כל המשימות</SelectItem>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {tasks.length === 0 && (
        <p className="mt-4 text-muted-foreground">אין עדיין משימות במרחב הזה.</p>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {scaleQuestions.map((q) => (
          <Distribution
            key={q.id}
            title={q.prompt}
            {...(q.hint ? { subtitle: q.hint } : {})}
            values={answersByQuestion.get(q.id) ?? []}
            options={Array.from({ length: (q.max ?? 5) - (q.min ?? 1) + 1 }, (_, i) =>
              String((q.min ?? 1) + i),
            )}
          />
        ))}
        {choiceQuestions.map((q) => (
          <Distribution
            key={q.id}
            title={q.prompt}
            values={answersByQuestion.get(q.id) ?? []}
            options={q.options.map(optionText)}
          />
        ))}
      </div>

      {openQuestions.map((q) => {
        const texts = (answersByQuestion.get(q.id) ?? []).map((t) => t.trim()).filter(Boolean);
        return (
          <div key={q.id} className="mt-3 rounded-2xl border border-border bg-card p-4">
            <p className="font-semibold">
              {q.prompt} ({texts.length})
            </p>
            <ul className="mt-2 space-y-2">
              {texts.map((text, i) => (
                <li key={i} className="reading-text rounded-xl bg-background p-3 text-sm">
                  {text}
                </li>
              ))}
              {texts.length === 0 && <li className="text-sm text-muted-foreground">אין תשובות.</li>}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
