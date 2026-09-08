import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { setTaskSpeech } from "@/lib/teacher";
import {
  fetchRunnerAnswers,
  fetchRunnerNotes,
  fetchRunnerSubmission,
  fetchRunnerTasksForClass,
  saveRunnerNote,
  type RunnerTask,
} from "@/lib/task-runner/data";
import {
  computeEffort,
  describePosAnswer,
  optionIsCorrect,
  optionText,
  type RunnerQuestion,
  type TaskDefinition,
} from "@/lib/task-runner/types";

type StudentRow = { id: string; first_name: string; last_name: string };

/** כל כרטיסי משימות ה-runner של התלמיד/ה — נבנים מהרשם, בלי קוד לכל משימה. */
export function RunnerStudentCards({
  classSlug,
  student,
}: {
  classSlug: string | null | undefined;
  student: StudentRow;
}) {
  const tasksQuery = useQuery({
    queryKey: ["runner-tasks-admin", classSlug ?? null],
    queryFn: () => fetchRunnerTasksForClass(classSlug!),
    enabled: Boolean(classSlug),
  });

  return (
    <>
      {(tasksQuery.data ?? []).map((task) => (
        <RunnerStudentCard key={task.id} task={task} student={student} />
      ))}
    </>
  );
}

function RunnerStudentCard({ task, student }: { task: RunnerTask; student: StudentRow }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const submissionQuery = useQuery({
    queryKey: ["runner-submission", task.id, student.id],
    queryFn: () => fetchRunnerSubmission(task.id, student.id),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const notesQuery = useQuery({
    queryKey: ["runner-notes", task.id, student.id],
    queryFn: () => fetchRunnerNotes(task.id, student.id),
  });

  const answersQuery = useQuery({
    queryKey: ["runner-answers", task.id, student.id],
    queryFn: () => fetchRunnerAnswers(task.id, student.id),
  });

  const speechQuery = useQuery({
    queryKey: ["runner-speech-admin", task.id, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_task_speech")
        .select("allowed")
        .eq("task_id", task.id)
        .eq("student_id", student.id)
        .maybeSingle();
      if (error) throw error;
      return data?.allowed ?? false;
    },
  });

  const setSpeech = useMutation({
    mutationFn: (allowed: boolean) => setTaskSpeech(student.id, task.id, allowed),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["runner-speech-admin", task.id, student.id],
      });
      toast.success("ההגדרה נשמרה.");
    },
    onError: () => toast.error("לא הצלחנו לשמור את ההגדרה."),
  });

  const reopen = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("runner_submissions")
        .delete()
        .eq("task_id", task.id)
        .eq("student_id", student.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["runner-submission", task.id, student.id] }),
        queryClient.invalidateQueries({ queryKey: ["space-task-rollup"] }),
      ]);
      toast.success("המשימה נפתחה מחדש לתלמיד/ה.");
    },
    onError: () => toast.error("לא הצלחנו לפתוח מחדש את המשימה."),
  });

  const submittedAt = submissionQuery.data?.submitted_at ?? null;
  const score = notesQuery.data?.general?.score ?? null;
  const effort = useMemo(
    () => computeEffort(task.definition, answersQuery.data ?? {}),
    [task.definition, answersQuery.data],
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{task.title}</p>
        {submittedAt ? (
          <Badge className="bg-success text-success-foreground">
            <Check className="size-3" /> הוגשה לבדיקה
          </Badge>
        ) : (
          <Badge variant="secondary">בתהליך</Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {submittedAt
          ? `הוגשה ב-${new Date(submittedAt).toLocaleString("he-IL", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : task.isActive
            ? "המשימה פעילה — טרם הוגשה"
            : "המשימה כבויה"}
        {score != null ? ` · ציון ${score}` : ""}
      </p>

      {effort.hasExtra && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="size-3" /> ענה/תה על {effort.extra} מעבר לנדרש — שקול/י בונוס
        </p>
      )}

      <label className="mt-3 flex items-center gap-2 text-sm">
        <Volume2 className="size-4 text-primary" />
        הקראה קולית במשימה
        <Switch
          className="ms-1"
          checked={speechQuery.data ?? false}
          onCheckedChange={(checked) => setSpeech.mutate(checked)}
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">פתיחת חלון בדיקה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-h-[85vh] max-w-4xl overflow-y-auto text-start">
            <DialogHeader>
              <DialogTitle>
                {student.first_name} {student.last_name} · {task.title}
              </DialogTitle>
            </DialogHeader>
            <RunnerStudentReview task={task} student={student} />
          </DialogContent>
        </Dialog>
        {submittedAt && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => reopen.mutate()}
            disabled={reopen.isPending}
          >
            <Lock className="size-3" /> פתיחה מחדש
          </Button>
        )}
      </div>
    </div>
  );
}

/** חלון הבדיקה: כל התשובות לפי הגדרת המשימה, עם הערה וניקוד לכל פריט. */
function RunnerStudentReview({ task, student }: { task: RunnerTask; student: StudentRow }) {
  const queryClient = useQueryClient();
  const def: TaskDefinition = task.definition;

  const answersQuery = useQuery({
    queryKey: ["runner-answers", task.id, student.id],
    queryFn: () => fetchRunnerAnswers(task.id, student.id),
  });
  const notesQuery = useQuery({
    queryKey: ["runner-notes", task.id, student.id],
    queryFn: () => fetchRunnerNotes(task.id, student.id),
  });

  const answers = answersQuery.data ?? {};
  const notes = notesQuery.data?.map ?? {};
  const general = notesQuery.data?.general ?? { note: "", score: null };

  const [generalNote, setGeneralNote] = useState<string | null>(null);
  const [generalScore, setGeneralScore] = useState<string | null>(null);

  const saveGeneral = useMutation({
    mutationFn: async () => {
      await saveRunnerNote({
        taskId: task.id,
        studentId: student.id,
        itemKey: null,
        note: generalNote ?? general.note,
        score:
          (generalScore ?? (general.score != null ? String(general.score) : "")).trim() === ""
            ? null
            : Number(generalScore ?? general.score),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["runner-notes", task.id, student.id] }),
        queryClient.invalidateQueries({ queryKey: ["space-task-rollup"] }),
      ]);
      toast.success("ההערה והציון נשמרו.");
    },
    onError: () => toast.error("לא הצלחנו לשמור."),
  });

  if (answersQuery.isLoading) return <p className="text-muted-foreground">טוענים תשובות...</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary/30 bg-accent/30 p-4">
        <p className="font-semibold">ציון והערה למשימה כולה</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <div className="w-28">
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="ציון"
              value={generalScore ?? (general.score != null ? String(general.score) : "")}
              onChange={(e) => setGeneralScore(e.target.value)}
            />
          </div>
          <div className="min-w-56 flex-1">
            <Textarea
              rows={2}
              placeholder="הערה לתלמיד/ה"
              value={generalNote ?? general.note}
              onChange={(e) => setGeneralNote(e.target.value)}
            />
          </div>
          <Button onClick={() => saveGeneral.mutate()} disabled={saveGeneral.isPending}>
            שמירה
          </Button>
        </div>
      </section>

      {def.pages.map((page, pageIndex) => {
        const plain = page.questions ?? [];
        const groupItems = page.group?.items ?? [];
        if (plain.length === 0 && groupItems.length === 0) return null;
        return (
          <section key={pageIndex}>
            <h3 className="text-lg font-bold">{page.title}</h3>
            <div className="mt-2 space-y-3">
              {plain.map((q) => (
                <AnswerRow
                  key={q.id}
                  question={q}
                  answers={answers}
                  notes={notes}
                  taskId={task.id}
                  studentId={student.id}
                />
              ))}
              {groupItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border p-3">
                  {item.label && <p className="font-semibold text-primary">{item.label}</p>}
                  <div className="mt-2 space-y-3">
                    {item.questions.map((q) => (
                      <AnswerRow
                        key={q.id}
                        question={q}
                        answers={answers}
                        notes={notes}
                        taskId={task.id}
                        studentId={student.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {(def.feedbackQuestions ?? []).length > 0 && (
        <section>
          <h3 className="text-lg font-bold">משוב מסכם</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {(def.feedbackQuestions ?? []).map((q) => (
              <li key={q.id}>
                <span className="text-muted-foreground">
                  {q.kind === "guided"
                    ? q.label
                    : q.kind === "judge"
                      ? q.quote
                      : q.kind === "pos"
                        ? q.title
                        : q.prompt}
                  :{" "}
                </span>
                <span className="font-medium">{answers[q.id] || "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** תשובה אחת + הערה/ניקוד של המורה עליה. */
function AnswerRow({
  question,
  answers,
  notes,
  taskId,
  studentId,
}: {
  question: RunnerQuestion;
  answers: Record<string, string>;
  notes: Record<string, { note: string; score: number | null }>;
  taskId: string;
  studentId: string;
}) {
  const queryClient = useQueryClient();
  const keys =
    question.kind === "guided"
      ? question.lines.map((_, i) => `${question.id}.${i}`)
      : question.kind === "judge"
        ? [`${question.id}.verdict`]
        : [question.id];
  const primaryKey = keys[0]!;
  const posLines =
    question.kind === "pos" ? describePosAnswer(question, answers[question.id]) : null;
  const existing = notes[primaryKey] ?? { note: "", score: null };
  const [note, setNote] = useState<string | null>(null);
  const [score, setScore] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      saveRunnerNote({
        taskId,
        studentId,
        itemKey: primaryKey,
        note: note ?? existing.note,
        score:
          (score ?? (existing.score != null ? String(existing.score) : "")).trim() === ""
            ? null
            : Number(score ?? existing.score),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["runner-notes", taskId, studentId] });
      toast.success("נשמר.");
    },
    onError: () => toast.error("לא הצלחנו לשמור."),
  });

  const prompt =
    question.kind === "guided"
      ? question.label
      : question.kind === "judge"
        ? `שיפוט הניסוח: "${question.quote}"`
        : question.kind === "pos"
          ? question.title
          : question.prompt;

  /** האם התשובה נכונה — רק בשאלות שההגדרה סימנה בהן תשובה נכונה. */
  const correctness = (() => {
    if (question.kind === "choice") {
      const chosen = answers[question.id];
      const hasKey = question.options.some((o) => optionIsCorrect(o) !== undefined);
      if (!hasKey || !chosen) return null;
      const right = question.options.some((o) => optionText(o) === chosen && optionIsCorrect(o));
      return right;
    }
    if (question.kind === "judge") {
      const chosen = answers[`${question.id}.verdict`];
      if (!chosen) return null;
      return chosen === (question.correctOk ? question.okLabel : question.badLabel);
    }
    return null;
  })();

  return (
    <div className="rounded-2xl border border-border p-3">
      <p className="text-sm text-muted-foreground">{prompt}</p>
      <div className="mt-1 space-y-1">
        {posLines ? (
          posLines.length > 0 ? (
            posLines.map((line, i) => (
              <p
                key={i}
                className="reading-text whitespace-pre-wrap rounded-xl bg-secondary/40 px-2 py-1"
              >
                {line}
              </p>
            ))
          ) : (
            <p className="reading-text whitespace-pre-wrap rounded-xl bg-secondary/40 px-2 py-1">
              —
            </p>
          )
        ) : (
          keys.map((key) => (
            <p
              key={key}
              className={cn(
                "reading-text whitespace-pre-wrap rounded-xl px-2 py-1",
                correctness === true && "bg-success/10",
                correctness === false && "bg-destructive/10",
                correctness === null && "bg-secondary/40",
              )}
            >
              {answers[key] || "—"}
            </p>
          ))
        )}
        {question.kind === "judge" && answers[`${question.id}.violations`] && (
          <p className="text-xs text-muted-foreground">
            סעיפים שסומנו: {answers[`${question.id}.violations`]}
          </p>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <Input
          type="number"
          className="w-24"
          placeholder="ניקוד"
          value={score ?? (existing.score != null ? String(existing.score) : "")}
          onChange={(e) => setScore(e.target.value)}
        />
        <Input
          className="min-w-48 flex-1"
          placeholder="הערה לתשובה"
          value={note ?? existing.note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button size="sm" variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
          שמירה
        </Button>
      </div>
    </div>
  );
}
