import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  NB10_PAGES,
  NB10_TASK_TITLE,
  type NB10Question,
} from "@/components/tasks/new-beginnings-10/content";
import { fetchNB10Task } from "@/components/tasks/new-beginnings-10/data";

type StudentRow = { id: string; first_name: string; last_name: string };

/** תווית קריאה לכל מזהה תשובה במשימה. */
function answerLabels(): { id: string; label: string; page: number }[] {
  const rows: { id: string; label: string; page: number }[] = [];
  NB10_PAGES.forEach((page, pageIndex) => {
    page.questions.forEach((q: NB10Question) => {
      if (q.kind === "guided") {
        q.lines.forEach((line, i) =>
          rows.push({ id: `${q.id}.${i}`, label: `${q.label} ${line}`, page: pageIndex + 1 }),
        );
      } else {
        rows.push({ id: q.id, label: q.prompt, page: pageIndex + 1 });
      }
    });
  });
  return rows;
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ניהול ובדיקה של המשימה "התחלות חדשות" — טבלאות nb10_* בלבד. */
export function NB10Panel({
  classSlug,
  students,
}: {
  classSlug: string | null | undefined;
  students: StudentRow[];
}) {
  const queryClient = useQueryClient();
  const [openStudent, setOpenStudent] = useState<StudentRow | null>(null);

  const taskQuery = useQuery({
    queryKey: ["nb10-task-admin", classSlug ?? null],
    queryFn: () => fetchNB10Task(classSlug!),
    enabled: Boolean(classSlug),
  });
  const task = taskQuery.data ?? null;
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);

  const submissionsQuery = useQuery({
    queryKey: ["nb10-submissions", task?.id, studentIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nb10_submissions")
        .select("student_id, submitted_at")
        .eq("task_id", task!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(task?.id),
    // הגשות חדשות צריכות להופיע למורה בלי רענון של הדף
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const notesQuery = useQuery({
    queryKey: ["nb10-notes", task?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nb10_notes")
        .select("student_id, note, score")
        .eq("task_id", task!.id)
        .is("question_id", null);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(task?.id),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const updateTask = useMutation({
    mutationFn: async (patch: {
      is_active?: boolean;
      opens_at?: string | null;
      closes_at?: string | null;
    }) => {
      const { error } = await supabase.from("nb10_tasks").update(patch).eq("id", task!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nb10-task-admin", classSlug ?? null] });
      await queryClient.invalidateQueries({ queryKey: ["nb10-task", classSlug ?? null] });
      toast.success("ההגדרות נשמרו.");
    },
    onError: () => toast.error("לא הצלחנו לשמור את ההגדרות."),
  });

  const resetAll = useMutation({
    mutationFn: async () => {
      if (studentIds.length === 0) return;
      for (const table of ["nb10_answers", "nb10_submissions", "nb10_feedback"] as const) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("task_id", task!.id)
          .in("student_id", studentIds);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nb10-submissions", task?.id, studentIds] });
      toast.success("המשימה אופסה לכל תלמידי הכיתה.");
    },
    onError: () => toast.error("לא הצלחנו לאפס את המשימה."),
  });

  const reopen = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from("nb10_submissions")
        .delete()
        .eq("task_id", task!.id)
        .eq("student_id", studentId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nb10-submissions", task?.id, studentIds] });
      toast.success("המשימה נפתחה מחדש לתלמיד/ה.");
    },
    onError: () => toast.error("לא הצלחנו לפתוח מחדש את המשימה."),
  });

  if (!classSlug) return <p className="text-muted-foreground">בחרו מרחב לימוד.</p>;
  if (taskQuery.isLoading) return <p className="text-muted-foreground">טוענים...</p>;
  if (!task) {
    return (
      <p className="text-muted-foreground">
        המשימה "{NB10_TASK_TITLE}" לא מוגדרת למרחב הלימוד הזה. היא זמינה לכיתות י' 1 ו-י' 2.
      </p>
    );
  }

  const submittedAt = new Map(
    (submissionsQuery.data ?? []).map((s) => [s.student_id, s.submitted_at]),
  );
  const notesByStudent = new Map(
    (notesQuery.data ?? []).map((n) => [n.student_id, n as { note: string; score: number | null }]),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{NB10_TASK_TITLE}</h3>
            <p className="text-sm text-muted-foreground">
              תשעה עמודים, שמירה אוטומטית ועוזר שיטה. המשימה מוצגת לתלמידים רק כשהיא מופעלת.
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
            <Label htmlFor="nb10-opens">מועד פתיחה (ריק = בלי הגבלה)</Label>
            <Input
              id="nb10-opens"
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
            <Label htmlFor="nb10-closes">מועד סגירה (ריק = בלי הגבלה)</Label>
            <Input
              id="nb10-closes"
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

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">בדיקת התלמידים</h3>
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
        <div className="mt-3 space-y-2">
          {students.length === 0 && (
            <p className="text-muted-foreground">אין תלמידים רשומים במרחב הזה.</p>
          )}
          {students.map((student) => {
            const submitTime = submittedAt.get(student.id);
            const submitted = Boolean(submitTime);
            const note = notesByStudent.get(student.id);
            return (
              <div
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div>
                  <p className="font-semibold">
                    {student.first_name} {student.last_name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {submitted ? (
                      <Badge className="bg-success text-success-foreground">
                        <Check className="size-3" /> הוגשה
                      </Badge>
                    ) : (
                      <Badge variant="secondary">בתהליך</Badge>
                    )}
                    {note?.score !== null && note?.score !== undefined && (
                      <Badge variant="outline">ציון {note.score}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setOpenStudent(student)}>
                    פתיחת חלון בדיקה
                  </Button>
                  {submitted && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reopen.mutate(student.id)}
                      disabled={reopen.isPending}
                    >
                      <Lock className="size-3" /> פתיחה מחדש
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Dialog open={Boolean(openStudent)} onOpenChange={(open) => !open && setOpenStudent(null)}>
        <DialogContent dir="rtl" className="max-h-[85vh] max-w-4xl overflow-y-auto text-start">
          <DialogHeader>
            <DialogTitle>
              {openStudent?.first_name} {openStudent?.last_name} · {NB10_TASK_TITLE}
            </DialogTitle>
          </DialogHeader>
          {openStudent && <StudentReview taskId={task.id} student={openStudent} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentReview({ taskId, student }: { taskId: string; student: StudentRow }) {
  const queryClient = useQueryClient();
  const labels = useMemo(answerLabels, []);

  const answersQuery = useQuery({
    queryKey: ["nb10-review-answers", taskId, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nb10_answers")
        .select("question_id, answer_text")
        .eq("task_id", taskId)
        .eq("student_id", student.id);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((row) => {
        map[row.question_id] = row.answer_text;
      });
      return map;
    },
  });
  const feedbackQuery = useQuery({
    queryKey: ["nb10-review-feedback", taskId, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nb10_feedback")
        .select(
          "clarity_scale, learning_scale, assistant_scale, compare_lesson, help_page_usage, still_unclear",
        )
        .eq("task_id", taskId)
        .eq("student_id", student.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
  const noteQuery = useQuery({
    queryKey: ["nb10-review-note", taskId, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nb10_notes")
        .select("note, score")
        .eq("task_id", taskId)
        .eq("student_id", student.id)
        .is("question_id", null)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const [note, setNote] = useState<string | null>(null);
  const [score, setScore] = useState<string | null>(null);
  const noteValue = note ?? noteQuery.data?.note ?? "";
  const scoreValue = score ?? (noteQuery.data?.score != null ? String(noteQuery.data.score) : "");

  const saveNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("nb10_notes").upsert(
        {
          task_id: taskId,
          student_id: student.id,
          question_id: null,
          note: noteValue,
          score: scoreValue.trim() === "" ? null : Number(scoreValue),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,task_id,question_id" },
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nb10-notes", taskId] });
      await queryClient.invalidateQueries({ queryKey: ["nb10-review-note", taskId, student.id] });
      toast.success("ההערה נשמרה.");
    },
    onError: () => toast.error("לא הצלחנו לשמור את ההערה."),
  });

  if (answersQuery.isLoading) return <p className="text-muted-foreground">טוענים תשובות...</p>;
  const answers = answersQuery.data ?? {};
  const feedback = feedbackQuery.data;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {labels.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">עמוד {row.page}</p>
            <p className="mt-1 text-sm font-semibold">{row.label}</p>
            <p className="reading-text mt-2 whitespace-pre-wrap">
              {answers[row.id]?.trim() ? answers[row.id] : "— אין תשובה —"}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border p-4">
        <p className="font-semibold">המשוב של התלמיד/ה</p>
        {feedback ? (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>בהירות המושגים: {feedback.clarity_scale ?? "—"}</li>
            <li>תחושת הצלחה בלמידה: {feedback.learning_scale ?? "—"}</li>
            <li>העוזר סייע: {feedback.assistant_scale ?? "—"}</li>
            <li>בהשוואה לשיעור רגיל: {feedback.compare_lesson ?? "—"}</li>
            <li>שימוש בדף העזרה: {feedback.help_page_usage ?? "—"}</li>
            <li>מה עדיין לא ברור: {feedback.still_unclear ?? "—"}</li>
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">עדיין לא מילא/ה משוב.</p>
        )}
      </div>

      <div className="rounded-2xl border border-border p-4">
        <Label htmlFor="nb10-note">הערת מורה</Label>
        <Textarea
          id="nb10-note"
          className="mt-1"
          rows={3}
          value={noteValue}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-32">
            <Label htmlFor="nb10-score">ציון</Label>
            <Input
              id="nb10-score"
              className="mt-1"
              inputMode="numeric"
              value={scoreValue}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
          <Button onClick={() => saveNote.mutate()} disabled={saveNote.isPending}>
            שמירה
          </Button>
        </div>
      </div>
    </div>
  );
}
