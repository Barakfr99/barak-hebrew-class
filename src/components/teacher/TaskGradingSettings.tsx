import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isTaskOpen, taskParts, type GradingMode, type Question, type Task } from "@/lib/practice";
import { weightsSum } from "@/lib/task-parts";
import {
  deleteTask,
  resetTaskForAllStudents,
  saveQuestionWeight,
  setTaskActive,
  setTaskGradingMode,
  setTaskSchedule,
} from "@/lib/teacher";

/** ממיר תאריך מהמסד לפורמט של שדה datetime-local (בשעון המקומי). */
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

function statusOf(task: Task): { text: string; open: boolean } {
  const open = isTaskOpen(task);
  const text = !task.is_active
    ? "לא פעילה — התלמידים לא רואים אותה"
    : open
      ? "פתוחה לתלמידים"
      : task.opens_at && new Date(task.opens_at) > new Date()
        ? "ממתינה למועד הפתיחה"
        : "נסגרה";
  return { text, open };
}

/** ניהול המשימות של הכיתה: רשימה, ולחיצה על משימה פותחת חלון ניהול. */
export function TaskGradingSettings({
  tasks,
  onChanged,
}: {
  tasks: Task[];
  onChanged: () => Promise<void> | void;
}) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  if (tasks.length === 0) {
    return <p className="text-muted-foreground">אין משימות במרחב הלימוד הזה.</p>;
  }

  return (
    <section>
      <h2 className="text-xl font-bold">ניהול המשימות</h2>
      <p className="text-sm text-muted-foreground">
        לחיצה על משימה פותחת חלון ניהול: זמינות, תזמון, אופן הניקוד, איפוס לכל התלמידים ומחיקה.
      </p>
      <div className="mt-4 space-y-2">
        {tasks.map((task) => {
          const { text, open } = statusOf(task);
          const parts = taskParts(task);
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => setOpenTaskId(task.id)}
              className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-start transition hover:border-primary/60 hover:bg-secondary/40"
            >
              <div>
                <p className="font-semibold">{task.title}</p>
                <p className="text-sm text-muted-foreground">
                  {task.questions.length} שאלות · {parts.length} חלקים ·{" "}
                  {task.grading_mode === "submission" ? "ניקוד הגשה" : "ניקוד לכל שאלה"}
                </p>
              </div>
              <span
                className={
                  open
                    ? "rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                    : "rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground"
                }
              >
                {text}
              </span>
            </button>
          );
        })}
      </div>

      <Dialog open={Boolean(openTask)} onOpenChange={(v) => !v && setOpenTaskId(null)}>
        <DialogContent dir="rtl" className="max-h-[85vh] max-w-3xl overflow-y-auto text-start">
          {openTask && (
            <>
              <DialogHeader className="text-start">
                <DialogTitle>{openTask.title}</DialogTitle>
                <DialogDescription>{statusOf(openTask).text}</DialogDescription>
              </DialogHeader>
              <TaskCard
                task={openTask}
                onChanged={onChanged}
                onDeleted={() => setOpenTaskId(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TaskCard({
  task,
  onChanged,
  onDeleted,
}: {
  task: Task;
  onChanged: () => Promise<void> | void;
  onDeleted?: () => void;
}) {
  const sum = weightsSum(task.questions);
  const parts = taskParts(task);
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {task.questions.length} שאלות · {parts.length} חלקים
        </p>
        <div className="flex items-center gap-2">
          <Label className="text-sm">פעילה</Label>
          <Switch
            checked={task.is_active}
            disabled={busy}
            onCheckedChange={async (checked) => {
              setBusy(true);
              try {
                await setTaskActive(task.id, checked);
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
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ScheduleField
          label="מועד פתיחה"
          value={task.opens_at}
          onSave={async (iso) => {
            await setTaskSchedule(task.id, { opensAt: iso });
            await onChanged();
          }}
        />
        <ScheduleField
          label="מועד סגירה"
          value={task.closes_at}
          onSave={async (iso) => {
            await setTaskSchedule(task.id, { closesAt: iso });
            await onChanged();
          }}
        />
        <div>
          <Label className="text-sm">אופן הניקוד</Label>
          <Select
            value={task.grading_mode}
            onValueChange={async (value) => {
              try {
                await setTaskGradingMode(task.id, value as GradingMode);
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
              <SelectItem value="weighted">ניקוד לכל שאלה (אחוזים)</SelectItem>
              <SelectItem value="submission">ניקוד הגשה — 0 / 50 / 75 / 100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {task.grading_mode === "weighted" && (
        <>
          {sum !== 100 && (
            <Alert className="mt-3 border-warning/50 bg-warning/10">
              <AlertDescription>
                סכום המשקלים הוא {sum}% ולא 100%. שאלה בלי משקל מקבלת חלק שווה מהיתרה.
              </AlertDescription>
            </Alert>
          )}
          <div className="mt-3 space-y-4">
            {parts.map((part, partIndex) => {
              const partQuestions = task.questions.filter((q) =>
                q.part_id ? q.part_id === part.id : partIndex === 0,
              );
              if (partQuestions.length === 0) return null;
              return (
                <div key={part.id}>
                  {parts.length > 1 && <p className="text-sm font-semibold">{part.title}</p>}
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {partQuestions.map((q) => (
                      <WeightRow key={q.id} question={q} onChanged={onChanged} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={async () => {
            if (
              !window.confirm(
                `לאפס את "${task.title}" לכל התלמידים? כל התשובות, ההגשות, הציונים וההערות במשימה יימחקו.`,
              )
            )
              return;
            setBusy(true);
            try {
              await resetTaskForAllStudents(task.id);
              await onChanged();
              toast.success("המשימה אופסה לכל התלמידים");
            } catch {
              toast.error("האיפוס לא הצליח");
            } finally {
              setBusy(false);
            }
          }}
        >
          <RotateCcw className="size-4" /> איפוס לכל התלמידים
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          className="text-destructive hover:text-destructive"
          onClick={async () => {
            if (
              !window.confirm(
                `למחוק את "${task.title}" לגמרי? המשימה, השאלות וכל התשובות יימחקו ולא ניתן לשחזר.`,
              )
            )
              return;
            setBusy(true);
            try {
              await deleteTask(task.id);
              onDeleted?.();
              await onChanged();
              toast.success("המשימה נמחקה");
            } catch {
              toast.error("המחיקה לא הצליחה");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Trash2 className="size-4" /> מחיקת המשימה
        </Button>
      </div>
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

function WeightRow({
  question,
  onChanged,
}: {
  question: Question;
  onChanged: () => Promise<void> | void;
}) {
  const initial = question.weight === null ? "" : String(question.weight);
  const [draft, setDraft] = useState(initial);
  useEffect(() => setDraft(initial), [initial]);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2">
      <p className="line-clamp-2 flex-1 text-sm">
        {question.group_label ? `${question.group_label} — ` : ""}
        {question.prompt}
      </p>
      <Input
        type="number"
        min={0}
        max={100}
        value={draft}
        className="w-20 bg-card"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={async () => {
          if (draft === initial) return;
          const parsed = draft.trim() === "" ? null : Number(draft);
          if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > 100)) {
            toast.error("המשקל חייב להיות בין 0 ל-100");
            return;
          }
          try {
            await saveQuestionWeight(question.id, parsed);
            await onChanged();
          } catch {
            toast.error("המשקל לא נשמר");
          }
        }}
      />
      <span className="text-sm text-muted-foreground">%</span>
    </div>
  );
}
