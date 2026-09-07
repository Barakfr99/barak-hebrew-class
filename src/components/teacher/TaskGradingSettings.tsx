import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taskParts, type GradingMode, type Question, type Task } from "@/lib/practice";
import { weightsSum } from "@/lib/task-parts";
import { saveQuestionWeight, setTaskGradingMode } from "@/lib/teacher";

/** הגדרות ניקוד לכל משימה: אופן הניקוד וחלוקת המשקלים בין השאלות. */
export function TaskGradingSettings({
  tasks,
  onChanged,
}: {
  tasks: Task[];
  onChanged: () => Promise<void> | void;
}) {
  if (tasks.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">ניקוד המשימות</h2>
      <p className="text-sm text-muted-foreground">
        לכל משימה: אופן הניקוד, וחלוקת המשקל באחוזים בין השאלות (הסכום צריך להיות 100).
      </p>
      <div className="mt-4 space-y-4">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}

function TaskCard({ task, onChanged }: { task: Task; onChanged: () => Promise<void> | void }) {
  const sum = weightsSum(task.questions);
  const parts = taskParts(task);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-semibold">{task.title}</p>
          <p className="text-sm text-muted-foreground">
            {task.questions.length} שאלות · {parts.length} חלקים
          </p>
        </div>
        <div className="w-64">
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
              <SelectItem value="weighted">חלוקת אחוזים בין השאלות</SelectItem>
              <SelectItem value="submission">הגשה — 0 או 100</SelectItem>
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
