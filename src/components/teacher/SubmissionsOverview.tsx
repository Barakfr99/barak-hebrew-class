import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { fullName } from "@/lib/practice";
import { useSpaceTaskList, useSpaceTaskRollup } from "@/lib/space-tasks";

type StudentRow = { id: string; first_name: string; last_name: string };

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * מצב ההגשות של כל משימה במרחב: מי הגיש/ה ומחכה לבדיקה, מי נבדק/ה ומה הציון, ומי עוד לא הגיש/ה.
 * הרכיב לא יודע דבר על משימה מסוימת — הוא נשען על רג'יסטרי ענפי המשימות.
 */
export function SubmissionsOverview({
  classSlug,
  students,
}: {
  classSlug: string | null | undefined;
  students: StudentRow[];
}) {
  const { tasks } = useSpaceTaskList(classSlug);
  const { rows } = useSpaceTaskRollup(classSlug);

  const studentIds = useMemo(() => new Set(students.map((s) => s.id)), [students]);

  const perTask = useMemo(
    () =>
      tasks.map((task) => {
        const taskRows = rows.filter(
          (r) => r.taskId === task.taskId && r.submittedAt && studentIds.has(r.studentId),
        );
        const byId = new Map(taskRows.map((r) => [r.studentId, r]));
        const pending: { student: StudentRow; at: string | null }[] = [];
        const graded: { student: StudentRow; at: string | null; grade: number }[] = [];
        const missing: StudentRow[] = [];
        students.forEach((student) => {
          const row = byId.get(student.id);
          if (!row) {
            missing.push(student);
          } else if (row.grade == null) {
            pending.push({ student, at: row.submittedAt });
          } else {
            graded.push({ student, at: row.submittedAt, grade: row.grade });
          }
        });
        return { task, pending, graded, missing };
      }),
    [tasks, rows, students, studentIds],
  );

  if (tasks.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-xl font-bold">מצב הגשות</h2>
      <p className="text-sm text-muted-foreground">
        לחיצה על משימה פותחת את הפירוט: מי מחכה לבדיקה, מי נבדק/ה ואיזה ציון קיבל/ה, ומי עוד לא
        הגיש/ה.
      </p>

      <Accordion type="multiple" className="mt-4 space-y-2">
        {perTask.map(({ task, pending, graded, missing }) => (
          <AccordionItem
            key={`${task.branchId}:${task.taskId}`}
            value={`${task.branchId}:${task.taskId}`}
            className="rounded-2xl border border-border bg-card px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2 text-start">
                <span className="font-semibold">{task.title}</span>
                <span className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  <Pill tone="warn">{pending.length} מחכות לבדיקה</Pill>
                  <Pill tone="ok">{graded.length} נבדקו</Pill>
                  <Pill tone="muted">{missing.length} לא הגישו</Pill>
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 pb-2 md:grid-cols-3">
                <Group title="מחכות לבדיקה">
                  {pending.length === 0 ? (
                    <Empty />
                  ) : (
                    pending.map(({ student, at }) => (
                      <Line key={student.id} name={fullName(student)} note={formatDate(at)} />
                    ))
                  )}
                </Group>
                <Group title="נבדקו">
                  {graded.length === 0 ? (
                    <Empty />
                  ) : (
                    graded.map(({ student, grade }) => (
                      <Line key={student.id} name={fullName(student)} note={`ציון ${grade}`} />
                    ))
                  )}
                </Group>
                <Group title="עוד לא הגישו">
                  {missing.length === 0 ? (
                    <Empty />
                  ) : (
                    missing.map((student) => <Line key={student.id} name={fullName(student)} />)
                  )}
                </Group>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function Pill({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "warn"
      ? "bg-destructive/10 text-destructive"
      : tone === "ok"
        ? "bg-primary/10 text-primary"
        : "bg-secondary text-muted-foreground";
  return <span className={`rounded-full px-2.5 py-1 ${cls}`}>{children}</span>;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function Line({ name, note }: { name: string; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>{name}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">—</p>;
}
