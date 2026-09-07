import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { FeedbackRow } from "@/lib/teacher";
import type { Task } from "@/lib/practice";

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
  values,
  options,
}: {
  title: string;
  values: (string | number | null)[];
  options: (string | number)[];
}) {
  const present = values.filter((v) => v !== null && v !== "");
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{present.length} תשובות</p>
      <div className="mt-3 space-y-2">
        {options.map((opt) => (
          <Bar
            key={String(opt)}
            label={String(opt)}
            count={present.filter((v) => String(v) === String(opt)).length}
            total={present.length}
          />
        ))}
      </div>
    </div>
  );
}

/** ניתוח שאלון המשוב: לכל משימה בנפרד ותמונה מצטברת לכיתה. */
export function FeedbackDashboard({
  feedback,
  tasks,
  studentIds,
}: {
  feedback: FeedbackRow[];
  tasks: Task[];
  studentIds: Set<string>;
}) {
  const [taskFilter, setTaskFilter] = useState("all");

  const rows = useMemo(() => {
    const mine = feedback.filter((f) => studentIds.has(f.student_id));
    if (taskFilter === "all") return mine;
    return mine.filter((f) => (f.task_id ?? "none") === taskFilter);
  }, [feedback, studentIds, taskFilter]);

  const compareOptions = Array.from(
    new Set(rows.map((r) => r.compare_lesson).filter((v): v is string => Boolean(v))),
  );
  const helpOptions = Array.from(
    new Set(rows.map((r) => r.help_page_usage).filter((v): v is string => Boolean(v))),
  );
  const texts = rows.map((r) => (r.still_unclear ?? "").trim()).filter(Boolean);
  const average = (values: (number | null)[]) => {
    const nums = values.filter((v): v is number => typeof v === "number");
    if (nums.length === 0) return "—";
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">ניתוח המשוב</h2>
          <p className="text-sm text-muted-foreground">
            ממוצע בהירות המושגים: {average(rows.map((r) => r.clarity_scale))}/5 · ממוצע תחושת
            ההבנה: {average(rows.map((r) => r.learning_scale))}/5
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
              <SelectItem value="none">בלי שיוך למשימה</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Distribution
          title="בהירות המושגים (1–5)"
          values={rows.map((r) => r.clarity_scale)}
          options={[1, 2, 3, 4, 5]}
        />
        <Distribution
          title="תחושת ההבנה (1–5)"
          values={rows.map((r) => r.learning_scale)}
          options={[1, 2, 3, 4, 5]}
        />
        <Distribution
          title="בהשוואה לשיעור רגיל"
          values={rows.map((r) => r.compare_lesson)}
          options={compareOptions}
        />
        <Distribution
          title="שימוש בדף העזרה"
          values={rows.map((r) => r.help_page_usage)}
          options={helpOptions}
        />
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-card p-4">
        <p className="font-semibold">מה עוד לא ברור ({texts.length})</p>
        <ul className="mt-2 space-y-2">
          {texts.map((text, i) => (
            <li key={i} className="reading-text rounded-xl bg-background p-3 text-sm">
              {text}
            </li>
          ))}
          {texts.length === 0 && <li className="text-sm text-muted-foreground">אין תשובות.</li>}
        </ul>
      </div>
    </section>
  );
}
