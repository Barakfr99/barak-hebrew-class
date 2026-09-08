import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpToLine, RotateCcw } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fullName } from "@/lib/practice";
import {
  ENGINE_LABELS,
  GRADING_MODE_LABELS,
  registryStatus,
  republishRegistryTask,
  resetRegistryTaskForStudents,
  setRegistryActive,
  setRegistryGradingMode,
  setRegistrySchedule,
  useSpaceTaskList,
  useSpaceTaskRollup,
  type RegistryGradingMode,
  type RegistryTask,
} from "@/lib/space-tasks";

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

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * ניהול המשימות של המרחב — כרטיס אחד לכל משימה, מהחדשה לישנה.
 * כל מה שנוגע למשימה אחת יושב בתוך הכרטיס שלה: מצב והפעלה, מועדים, אופן ניקוד,
 * מצב הגשות, ופעולות ניהול. הרשימה מגיעה מרשם המשימות ולא יודעת דבר על משימה מסוימת.
 */
export function TaskRegistryPanel({
  classSlug,
  students,
  onChanged,
}: {
  classSlug: string | null | undefined;
  students: StudentRow[];
  onChanged: () => Promise<void> | void;
}) {
  const { tasks, isLoading } = useSpaceTaskList(classSlug);
  const { rows, refresh } = useSpaceTaskRollup(classSlug);
  const studentIds = useMemo(() => new Set(students.map((s) => s.id)), [students]);

  const changed = async () => {
    refresh();
    await onChanged();
  };

  if (!classSlug) return <p className="text-muted-foreground">בחרו מרחב לימוד.</p>;
  if (isLoading) return <p className="text-muted-foreground">טוענים את המשימות...</p>;
  if (tasks.length === 0) {
    return <p className="text-muted-foreground">אין עדיין משימות במרחב הלימוד הזה.</p>;
  }

  return (
    <section>
      <h2 className="text-xl font-bold">ניהול המשימות</h2>
      <p className="text-sm text-muted-foreground">
        כרטיס לכל משימה, מהחדשה לישנה. לחיצה על משימה פותחת את כל מה שנוגע אליה: הפעלה, תזמון, אופן
        הניקוד, מצב ההגשות ופעולות ניהול.
      </p>

      <Accordion type="multiple" className="mt-4 space-y-2">
        {tasks.map((task) => {
          const taskRows = rows.filter(
            (r) => r.taskId === task.id && r.submittedAt && studentIds.has(r.studentId),
          );
          const byId = new Map(taskRows.map((r) => [r.studentId, r]));
          const pending: { student: StudentRow; at: string | null }[] = [];
          const graded: { student: StudentRow; grade: number }[] = [];
          const missing: StudentRow[] = [];
          students.forEach((student) => {
            const row = byId.get(student.id);
            if (!row) missing.push(student);
            else if (row.grade == null) pending.push({ student, at: row.submittedAt });
            else graded.push({ student, grade: row.grade });
          });
          const status = registryStatus(task);

          return (
            <AccordionItem
              key={task.id}
              value={task.id}
              className="rounded-2xl border border-border bg-card px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 flex-wrap items-center justify-between gap-2 text-start">
                  <span>
                    <span className="font-semibold">{task.title}</span>
                    <span className="ms-2 text-xs text-muted-foreground">
                      {ENGINE_LABELS[task.engine]} · פורסמה {formatDate(task.publishedAt)}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs font-medium">
                    <Pill tone={status.open ? "ok" : "muted"}>{status.text}</Pill>
                    <Pill tone="warn">{pending.length} מחכות לבדיקה</Pill>
                    <Pill tone="ok">{graded.length} נבדקו</Pill>
                    <Pill tone="muted">{missing.length} לא הגישו</Pill>
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <TaskControls task={task} onChanged={changed} />

                <div className="mt-4 grid gap-4 md:grid-cols-3">
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
                <p className="mt-2 text-xs text-muted-foreground">
                  בדיקת התשובות, הערות וציון לכל תלמיד/ה — בכרטיס התלמיד/ה בלשונית "כיתות ותלמידים".
                </p>

                <TaskDangerZone task={task} studentIds={[...studentIds]} onChanged={changed} />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}

/** הפעלה, תזמון, אופן ניקוד והעלאה לראש הרשימה — זהים לכל סוגי המשימות. */
function TaskControls({
  task,
  onChanged,
}: {
  task: RegistryTask;
  onChanged: () => Promise<void> | void;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const invalidateStudentSide = async () => {
    await queryClient.invalidateQueries({ queryKey: ["runner-task"] });
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 md:flex-col md:items-start">
        <Label className="text-sm">פעילה — התלמידים רואים אותה</Label>
        <Switch
          checked={task.isActive}
          disabled={busy}
          onCheckedChange={async (checked) => {
            setBusy(true);
            try {
              await setRegistryActive(task, checked);
              await invalidateStudentSide();
              await onChanged();
              toast.success(checked ? "המשימה הופעלה" : "המשימה כובתה");
            } catch {
              toast.error("העדכון לא נשמר");
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
      <ScheduleField
        label="מועד פתיחה"
        value={task.opensAt}
        onSave={async (iso) => {
          await setRegistrySchedule(task, { opensAt: iso });
          await invalidateStudentSide();
          await onChanged();
        }}
      />
      <ScheduleField
        label="מועד סגירה"
        value={task.closesAt}
        onSave={async (iso) => {
          await setRegistrySchedule(task, { closesAt: iso });
          await invalidateStudentSide();
          await onChanged();
        }}
      />
      <div>
        <Label className="text-sm">אופן הניקוד</Label>
        <Select
          value={task.gradingMode}
          onValueChange={async (value) => {
            try {
              await setRegistryGradingMode(task.id, value as RegistryGradingMode);
              await onChanged();
              toast.success("אופן הניקוד עודכן");
            } catch {
              toast.error("העדכון לא נשמר");
            }
          }}
        >
          <SelectTrigger className="mt-1 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {(Object.keys(GRADING_MODE_LABELS) as RegistryGradingMode[])
              .filter((mode) => mode !== "weighted")
              .map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {GRADING_MODE_LABELS[mode]}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={async () => {
            try {
              await republishRegistryTask(task.id);
              await onChanged();
              toast.success("המשימה הועלתה לראש הרשימה");
            } catch {
              toast.error("לא הצלחתי לעדכן את תאריך הפרסום");
            }
          }}
        >
          <ArrowUpToLine className="size-3" /> להעלות לראש הרשימה (פרסום מחדש)
        </button>
      </div>
    </div>
  );
}

function TaskDangerZone({
  task,
  studentIds,
  onChanged,
}: {
  task: RegistryTask;
  studentIds: string[];
  onChanged: () => Promise<void> | void;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          if (
            !window.confirm(
              `לאפס את "${task.title}" לכל תלמידי הכיתה? כל התשובות, ההגשות, ההערות והמשוב במשימה יימחקו.`,
            )
          )
            return;
          setBusy(true);
          try {
            await resetRegistryTaskForStudents(task, studentIds);
            await queryClient.invalidateQueries();
            await onChanged();
            toast.success("המשימה אופסה לכל הכיתה");
          } catch {
            toast.error("האיפוס לא הצליח");
          } finally {
            setBusy(false);
          }
        }}
      >
        <RotateCcw className="size-4" /> איפוס המשימה לכל הכיתה
      </Button>
    </div>
  );
}

function ScheduleField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string | null;
  onSave: (iso: string | null) => Promise<void>;
}) {
  const initial = toLocalInput(value);
  const [draft, setDraft] = useState(initial);
  useEffect(() => setDraft(initial), [initial]);

  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <Input
        type="datetime-local"
        value={draft}
        className="mt-1 bg-background"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={async () => {
          if (draft === initial) return;
          try {
            await onSave(fromLocalInput(draft));
            toast.success("התזמון נשמר");
          } catch {
            toast.error("התזמון לא נשמר");
          }
        }}
      />
      <p className="mt-1 text-xs text-muted-foreground">ריק = בלי הגבלה</p>
    </div>
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
