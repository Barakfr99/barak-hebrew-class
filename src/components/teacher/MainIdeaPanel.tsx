import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AnswerNoteBox, type AnswerNoteValue } from "@/components/teacher/AnswerNoteBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  MI_CHECKLIST_LABELS,
  MI_PARAGRAPHS,
  MI_QUOTES,
  MI_REQUIRED_PAGE1,
  MI_REQUIRED_PAGE3,
  MI_TASK_TITLE,
  MI_VERDICT_BAD,
  MI_VERDICT_OK,
  MI_WRITE_ITEMS,
  miMessageKey,
  miTopicKey,
  miVerdictKey,
  miViolationsKey,
  miWriteKey,
} from "@/components/tasks/main-idea-10-1/content";
import { computeMIEffort, fetchMITask, saveMINote } from "@/components/tasks/main-idea-10-1/data";

export type MIStudentRow = { id: string; first_name: string; last_name: string };

/** תוויות קריאה לכל פריט תשובה במשימה, לפי עמוד. */
type ItemLabel = { key: string; label: string; page: number; expected?: string | undefined };

function itemLabels(): ItemLabel[] {
  const rows: ItemLabel[] = [];
  MI_PARAGRAPHS.forEach((p) => {
    rows.push({
      key: miTopicKey(p.n),
      label: `פסקה ${p.n} · נושא`,
      page: 1,
      expected: p.topic.find((o) => o.correct)?.text ?? "",
    });
    rows.push({
      key: miMessageKey(p.n),
      label: `פסקה ${p.n} · מסר`,
      page: 1,
      expected: p.message.find((o) => o.correct)?.text ?? "",
    });
  });
  MI_QUOTES.forEach((q) => {
    rows.push({
      key: miVerdictKey(q.n),
      label: `ניסוח ${q.n}: "${q.text}"`,
      page: 2,
      expected: q.ok ? MI_VERDICT_OK : MI_VERDICT_BAD,
    });
  });
  MI_WRITE_ITEMS.forEach((item) => {
    rows.push({ key: miWriteKey(item.id), label: `${item.label} · ניסוח עצמאי`, page: 3 });
  });
  return rows;
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ניהול המשימה "ניסוח רעיון מרכזי" — טבלאות mi_* בלבד. */
export function MainIdeaPanel({
  classSlug,
  students,
}: {
  classSlug: string | null | undefined;
  students: MIStudentRow[];
}) {
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: ["mi-task-admin", classSlug ?? null],
    queryFn: () => fetchMITask(classSlug!),
    enabled: Boolean(classSlug),
  });
  const task = taskQuery.data ?? null;
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);

  const submissionsQuery = useQuery({
    queryKey: ["mi-submissions", task?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mi_submissions")
        .select("student_id, submitted_at")
        .eq("task_id", task!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(task?.id),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const updateTask = useMutation({
    mutationFn: async (patch: {
      is_active?: boolean;
      opens_at?: string | null;
      closes_at?: string | null;
    }) => {
      const { error } = await supabase.from("mi_tasks").update(patch).eq("id", task!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mi-task-admin", classSlug ?? null] });
      await queryClient.invalidateQueries({ queryKey: ["mi-task", classSlug ?? null] });
      toast.success("ההגדרות נשמרו.");
    },
    onError: () => toast.error("לא הצלחנו לשמור את ההגדרות."),
  });

  const resetAll = useMutation({
    mutationFn: async () => {
      if (studentIds.length === 0) return;
      for (const table of ["mi_answers", "mi_submissions", "mi_feedback"] as const) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("task_id", task!.id)
          .in("student_id", studentIds);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mi-submissions", task?.id] });
      await queryClient.invalidateQueries({ queryKey: ["space-task-rollup"] });
      toast.success("המשימה אופסה לכל תלמידי הכיתה.");
    },
    onError: () => toast.error("לא הצלחנו לאפס את המשימה."),
  });

  if (!classSlug) return <p className="text-muted-foreground">בחרו מרחב לימוד.</p>;
  if (taskQuery.isLoading) return <p className="text-muted-foreground">טוענים...</p>;
  if (!task) {
    return (
      <p className="text-muted-foreground">
        המשימה "{MI_TASK_TITLE}" לא מוגדרת למרחב הלימוד הזה. היא זמינה בשלב זה לכיתה י' 1.
      </p>
    );
  }

  const submittedCount = (submissionsQuery.data ?? []).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{MI_TASK_TITLE}</h3>
            <p className="text-sm text-muted-foreground">
              שלושה עמודים: זיהוי נושא ומסר ({MI_REQUIRED_PAGE1} מתוך 7), שיפוט ניסוחים, וניסוח
              עצמאי ({MI_REQUIRED_PAGE3} מתוך 4). המשימה מוצגת לתלמידים רק כשהיא מופעלת.
            </p>
          </div>
          <label className="flex items-center gap-3">
            <span className="text-sm font-medium">{task.is_active ? "פעילה" : "כבויה"}</span>
            <Switch
              checked={task.is_active}
              onCheckedChange={(checked) => updateTask.mutate({ is_active: checked })}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="mi-opens">מועד פתיחה (ריק = בלי הגבלה)</Label>
            <Input
              id="mi-opens"
              type="datetime-local"
              className="mt-1"
              defaultValue={toLocalInput(task.opens_at)}
              onBlur={(e) =>
                updateTask.mutate({
                  opens_at: e.target.value === "" ? null : new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="mi-closes">מועד סגירה (ריק = בלי הגבלה)</Label>
            <Input
              id="mi-closes"
              type="datetime-local"
              className="mt-1"
              defaultValue={toLocalInput(task.closes_at)}
              onBlur={(e) =>
                updateTask.mutate({
                  closes_at: e.target.value === "" ? null : new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>
        </div>

        <div className="mt-5">
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("לאפס את המשימה לכל תלמידי הכיתה? כל התשובות והמשוב יימחקו.")) {
                resetAll.mutate();
              }
            }}
            disabled={resetAll.isPending}
          >
            <RotateCcw className="size-4" /> איפוס המשימה לכל הכיתה
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">מצב הגשות</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {submittedCount} מתוך {students.length} תלמידים הגישו לבדיקה. בדיקת התשובות וההערות
              נעשית בכרטיס התלמיד/ה בלשונית "כיתות ותלמידים".
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void submissionsQuery.refetch()}
            disabled={submissionsQuery.isFetching}
          >
            <RotateCcw className="size-3" />{" "}
            {submissionsQuery.isFetching ? "מרעננים..." : "רענון הגשות"}
          </Button>
        </div>
      </section>
    </div>
  );
}

/** חלון בדיקת המשימה של תלמיד/ה: תשובות, נכון/שגוי, הערות וניקוד. */
export function MIStudentReview({
  taskId,
  student,
}: {
  taskId: string;
  student: MIStudentRow;
}) {
  const queryClient = useQueryClient();
  const labels = useMemo(itemLabels, []);
  const [generalNote, setGeneralNote] = useState<string | null>(null);
  const [generalScore, setGeneralScore] = useState<string | null>(null);

  const answersQuery = useQuery({
    queryKey: ["mi-review-answers", taskId, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mi_answers")
        .select("item_key, answer_text")
        .eq("task_id", taskId)
        .eq("student_id", student.id);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((row) => {
        map[row.item_key] = row.answer_text;
      });
      return map;
    },
  });

  const feedbackQuery = useQuery({
    queryKey: ["mi-review-feedback", taskId, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mi_feedback")
        .select("clarity_scale, learning_scale, explanation_scale, hardest_part, still_unclear")
        .eq("task_id", taskId)
        .eq("student_id", student.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const notesQuery = useQuery({
    queryKey: ["mi-review-notes", taskId, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mi_notes")
        .select("item_key, note, score")
        .eq("task_id", taskId)
        .eq("student_id", student.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveNote = useMutation({
    mutationFn: async (input: { itemKey: string | null; value: AnswerNoteValue }) =>
      saveMINote({
        taskId,
        studentId: student.id,
        itemKey: input.itemKey,
        note: input.value.note,
        score: input.value.score,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mi-review-notes", taskId, student.id] }),
        queryClient.invalidateQueries({ queryKey: ["mi-student-note", taskId, student.id] }),
        queryClient.invalidateQueries({ queryKey: ["mi-student-notes", taskId, student.id] }),
        queryClient.invalidateQueries({ queryKey: ["space-task-rollup"] }),
      ]);
    },
    onError: () => toast.error("ההערה לא נשמרה."),
  });

  const answers = answersQuery.data ?? {};
  const noteRows = notesQuery.data ?? [];
  const noteFor = (key: string): AnswerNoteValue => {
    const row = noteRows.find((r) => r.item_key === key);
    return { note: row?.note ?? "", score: row?.score ?? null };
  };
  const general = noteRows.find((r) => r.item_key == null);
  const effort = computeMIEffort(answers);
  const itemScoreSum = noteRows
    .filter((r) => r.item_key != null && r.score != null)
    .reduce((sum, r) => sum + Number(r.score), 0);

  if (answersQuery.isLoading) return <p className="text-muted-foreground">טוענים תשובות...</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-secondary/60 p-4 text-sm">
        <span>
          עמוד 1: {effort.page1} מתוך 7 · עמוד 3: {effort.page3} מתוך 4
        </span>
        {effort.hasExtra && (
          <Badge className="bg-primary text-primary-foreground">
            <Sparkles className="size-3" /> ענה/תה על יותר מהנדרש — לשקול בונוס
          </Badge>
        )}
        <span className="ms-auto font-semibold">סכום ניקוד התשובות: {itemScoreSum}</span>
      </div>

      {[1, 2, 3].map((page) => (
        <section key={page} className="space-y-3">
          <h4 className="font-bold text-primary">עמוד {page}</h4>
          {labels
            .filter((item) => item.page === page)
            .map((item) => {
              const value = answers[item.key] ?? "";
              const correct = item.expected ? value === item.expected : null;
              const violations =
                page === 2 ? (answers[miViolationsKey(Number(item.key.split(".")[1]))] ?? "") : "";
              return (
                <div key={item.key} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="reading-text mt-1 whitespace-pre-wrap">
                    {value || <span className="text-muted-foreground">— לא נענה —</span>}
                  </p>
                  {violations && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      סימן/ה: {violations.split(",").map((v) => MI_CHECKLIST_LABELS[v] ?? v).join(", ")}
                    </p>
                  )}
                  {item.expected && value && (
                    <p className={`mt-1 text-sm ${correct ? "text-success" : "text-destructive"}`}>
                      {correct ? "✅ נכון" : `❌ התשובה הנכונה: ${item.expected}`}
                    </p>
                  )}
                  <AnswerNoteBox
                    id={item.key}
                    value={noteFor(item.key)}
                    onSave={(next) => saveNote.mutateAsync({ itemKey: item.key, value: next })}
                  />
                </div>
              );
            })}
        </section>
      ))}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h4 className="font-bold text-primary">הערה כללית וציון למשימה</h4>
        <Textarea
          className="mt-2 bg-background"
          rows={3}
          value={generalNote ?? general?.note ?? ""}
          onChange={(e) => setGeneralNote(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <div className="w-28">
            <Label htmlFor="mi-general-score" className="text-xs">
              ציון (לא חובה)
            </Label>
            <Input
              id="mi-general-score"
              className="mt-1 bg-background"
              inputMode="numeric"
              value={generalScore ?? (general?.score != null ? String(general.score) : "")}
              onChange={(e) => setGeneralScore(e.target.value)}
            />
          </div>
          <Button
            onClick={() => {
              const raw = (generalScore ?? (general?.score != null ? String(general.score) : "")).trim();
              const parsed = raw === "" ? null : Number(raw);
              void saveNote
                .mutateAsync({
                  itemKey: null,
                  value: {
                    note: generalNote ?? general?.note ?? "",
                    score: parsed != null && Number.isFinite(parsed) ? parsed : null,
                  },
                })
                .then(() => toast.success("ההערה והציון נשמרו."));
            }}
          >
            שמירת ההערה והציון
          </Button>
        </div>
      </section>

      {feedbackQuery.data && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h4 className="font-bold text-primary">המשוב של התלמיד/ה</h4>
          <ul className="mt-2 space-y-1 text-sm">
            <li>בהירות נושא/מסר: {feedbackQuery.data.clarity_scale ?? "—"}</li>
            <li>תרומת התרגול: {feedbackQuery.data.learning_scale ?? "—"}</li>
            <li>עזרת ההסבר בעמוד 1: {feedbackQuery.data.explanation_scale ?? "—"}</li>
            <li>החלק הקשה: {feedbackQuery.data.hardest_part || "—"}</li>
            <li>מה עדיין לא ברור: {feedbackQuery.data.still_unclear || "—"}</li>
          </ul>
        </section>
      )}
    </div>
  );
}
