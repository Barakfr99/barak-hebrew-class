import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, FileText, Lock, PartyPopper, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import type { RunnerTask } from "@/lib/task-runner/data";
import {
  fetchRunnerAnswers,
  fetchRunnerNotes,
  fetchRunnerSubmission,
  saveRunnerAnswer,
  submitRunnerTask,
} from "@/lib/task-runner/data";
import { FEEDBACK_ITEM_KEYS, type RunnerPage } from "@/lib/task-runner/types";
import { QuestionRenderer } from "./QuestionRenderer";
import { FeedbackBlock, type FeedbackValues } from "./FeedbackBlock";
import { Assistant } from "./Assistant";

function ParagraphPeek({ title, number, text }: { title: string; number: number; text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-10">
          <FileText className="size-4" /> צפו בפסקה {number}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        dir="rtl"
        align="start"
        side="bottom"
        collisionPadding={12}
        className="max-h-[60vh] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto text-start"
      >
        <p className="mb-1 text-sm font-semibold text-primary">
          {title} · פסקה {number}
        </p>
        <p className="reading-text">{text}</p>
      </PopoverContent>
    </Popover>
  );
}

/**
 * מנוע האשף הגנרי: מרנדר כל משימה עם engine="runner" לפי tasks.definition.
 * משימה חדשה לא דורשת רכיב חדש — רק קובץ JSON תואם-סכימה.
 */
export function TaskRunnerWizard({
  task,
  studentId,
  onExit,
}: {
  task: RunnerTask;
  studentId: string;
  onExit?: () => void;
}) {
  const def = task.definition;
  const pages: RunnerPage[] = def.pages;
  const pageCount = pages.length + 1; // + עמוד משוב מסכם בסוף
  const articleTitle = def.articleTitle ?? task.title;
  const paragraphs = def.paragraphs ?? [];

  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const answersQuery = useQuery({
    queryKey: ["runner-answers", task.id, studentId],
    queryFn: () => fetchRunnerAnswers(task.id, studentId),
  });
  const submissionQuery = useQuery({
    queryKey: ["runner-submission", task.id, studentId],
    queryFn: () => fetchRunnerSubmission(task.id, studentId),
  });

  useEffect(() => {
    if (answersQuery.data && !loaded) {
      setAnswers(answersQuery.data);
      setLoaded(true);
    }
  }, [answersQuery.data, loaded]);

  const readOnly = Boolean(submissionQuery.data);

  const notesQuery = useQuery({
    queryKey: ["runner-notes", task.id, studentId],
    enabled: readOnly,
    queryFn: () => fetchRunnerNotes(task.id, studentId),
  });
  const notes = notesQuery.data?.map ?? {};
  const generalNote = notesQuery.data?.general ?? "";

  const persist = useCallback(
    async (itemKey: string, value: string) => {
      setSaving(true);
      try {
        await saveRunnerAnswer({ taskId: task.id, studentId, itemKey, answerText: value });
      } catch {
        toast.error("לא הצלחנו לשמור את התשובה. בדקו את החיבור לאינטרנט.");
      } finally {
        setSaving(false);
      }
    },
    [studentId, task.id],
  );

  const change = (itemKey: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [itemKey]: value }));
    const existing = timers.current[itemKey];
    if (existing) clearTimeout(existing);
    timers.current[itemKey] = setTimeout(() => void persist(itemKey, value), 700);
  };

  const flush = useCallback(async () => {
    const pending = Object.keys(timers.current);
    pending.forEach((id) => clearTimeout(timers.current[id]!));
    timers.current = {};
    await Promise.all(pending.map((id) => persist(id, answers[id] ?? "")));
  }, [answers, persist]);

  // מילוי פתיח מנחה בתיבה שעדיין ריקה
  useEffect(() => {
    if (!loaded || readOnly) return;
    pages.forEach((page) =>
      page.questions.forEach((q) => {
        if (q.kind === "open" && q.prefix && (answers[q.id] ?? "") === "") {
          setAnswers((prev) => ({ ...prev, [q.id]: q.prefix! }));
          void persist(q.id, q.prefix!);
        }
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, readOnly]);

  const submit = useMutation({
    mutationFn: async (feedback: FeedbackValues) => {
      await flush();
      await Promise.all([
        saveRunnerAnswer({
          taskId: task.id,
          studentId,
          itemKey: FEEDBACK_ITEM_KEYS.clarity,
          answerText: String(feedback.clarity ?? ""),
        }),
        saveRunnerAnswer({
          taskId: task.id,
          studentId,
          itemKey: FEEDBACK_ITEM_KEYS.learning,
          answerText: String(feedback.learning ?? ""),
        }),
        saveRunnerAnswer({
          taskId: task.id,
          studentId,
          itemKey: FEEDBACK_ITEM_KEYS.assistant,
          answerText: String(feedback.assistant ?? ""),
        }),
        saveRunnerAnswer({
          taskId: task.id,
          studentId,
          itemKey: FEEDBACK_ITEM_KEYS.compare,
          answerText: feedback.compare ?? "",
        }),
        saveRunnerAnswer({
          taskId: task.id,
          studentId,
          itemKey: FEEDBACK_ITEM_KEYS.help,
          answerText: feedback.help ?? "",
        }),
        saveRunnerAnswer({
          taskId: task.id,
          studentId,
          itemKey: FEEDBACK_ITEM_KEYS.unclear,
          answerText: feedback.unclear ?? "",
        }),
      ]);
      await submitRunnerTask({ taskId: task.id, studentId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["runner-submission", task.id, studentId] });
      toast.success("המשימה הוגשה. תודה!");
    },
    onError: () => toast.error("לא הצלחנו להגיש את המשימה. נסו שוב."),
  });

  const isFeedbackPage = pageIndex === pageCount - 1;
  const page: RunnerPage | undefined = isFeedbackPage ? undefined : pages[pageIndex];

  const goTo = async (next: number) => {
    await flush();
    setPageIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goNext = async () => {
    await goTo(pageIndex + 1);
  };
  const saveDraft = async () => {
    await flush();
    toast.success("הטיוטה נשמרה. אפשר להמשיך בהמשך מאותה נקודה.");
  };

  if (answersQuery.isLoading || submissionQuery.isLoading) {
    return <p className="text-muted-foreground">רגע, טוענים את המשימה...</p>;
  }

  const feedbackInitial: FeedbackValues | null = readOnly
    ? {
        clarity: Number(answers[FEEDBACK_ITEM_KEYS.clarity]) || null,
        learning: Number(answers[FEEDBACK_ITEM_KEYS.learning]) || null,
        assistant: Number(answers[FEEDBACK_ITEM_KEYS.assistant]) || null,
        compare: answers[FEEDBACK_ITEM_KEYS.compare] ?? null,
        help: answers[FEEDBACK_ITEM_KEYS.help] ?? null,
        unclear: answers[FEEDBACK_ITEM_KEYS.unclear] ?? null,
      }
    : null;

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            עמוד {pageIndex + 1} מתוך {pageCount}
          </p>
          <div className="flex items-center gap-2">
            {readOnly ? (
              <Badge variant="secondary">
                <Lock className="size-3" /> הוגש — קריאה בלבד
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">
                {saving ? "שומרים..." : "התשובות נשמרות אוטומטית"}
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 flex justify-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={readOnly || saving}
            onClick={() => void saveDraft()}
          >
            <Save className="size-4" /> שמירת טיוטה
          </Button>
        </div>
        <Progress value={((pageIndex + 1) / pageCount) * 100} className="mt-2 h-2" />
      </div>

      <h2 className="mt-6 text-2xl font-bold">{isFeedbackPage ? "משוב מסכם" : page!.title}</h2>

      {page?.paragraph && (
        <article className="mt-4 rounded-3xl border border-border bg-card p-6">
          <p className="text-sm font-semibold text-primary">
            {articleTitle} · פסקה {page.paragraph}
          </p>
          <p className="reading-text mt-2">{paragraphs[page.paragraph - 1]}</p>
        </article>
      )}

      {page?.snippet && (
        <article className="mt-4 rounded-3xl border border-primary/30 bg-accent/40 p-6">
          <p className="text-sm font-semibold text-primary">{page.snippet.title}</p>
          <p className="reading-text mt-2">{page.snippet.body}</p>
        </article>
      )}

      {page?.proverb && (
        <article className="mt-4 rounded-3xl border border-primary/30 bg-accent/40 p-6">
          <p className="text-sm font-semibold text-primary">פתגם</p>
          <p className="reading-text mt-2 font-bold">"{page.proverb}"</p>
        </article>
      )}

      {page?.paragraphButtons && (
        <div className="mt-4 flex flex-wrap gap-2">
          {paragraphs.map((text, i) => (
            <ParagraphPeek key={i} title={articleTitle} number={i + 1} text={text} />
          ))}
        </div>
      )}

      {page?.intro && <p className="mt-4 text-muted-foreground">{page.intro}</p>}

      <div className="mt-5 space-y-4">
        {isFeedbackPage ? (
          submissionQuery.data ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center">
              <PartyPopper className="mx-auto size-10 text-primary" />
              <h3 className="mt-3 text-2xl font-bold">סיימת את המשימה. תודה!</h3>
              <p className="mt-2 text-muted-foreground">
                כל התשובות שלך נשמרו והמורה רואה אותן. אפשר לעבור אחורה ולקרוא את מה שכתבת.
              </p>
              {generalNote.trim() && (
                <div className="mt-5 rounded-2xl border border-primary/30 bg-accent/40 p-4 text-start">
                  <p className="text-xs font-semibold text-primary">הערת המורה על המשימה</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{generalNote}</p>
                </div>
              )}
              {onExit && (
                <Button className="mt-5" size="lg" onClick={onExit}>
                  חזרה לרשימת המשימות
                </Button>
              )}
            </div>
          ) : (
            <FeedbackBlock
              config={def.feedback}
              readOnly={false}
              initial={feedbackInitial}
              submitting={submit.isPending}
              onSubmit={(values) => submit.mutate(values)}
            />
          )
        ) : (
          page!.questions.map((question) => (
            <QuestionRenderer
              key={question.id}
              question={question}
              answers={answers}
              onChange={change}
              readOnly={readOnly}
              notes={notes}
            />
          ))
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pageIndex === 0}
          onClick={() => void goTo(pageIndex - 1)}
        >
          <ChevronRight className="size-4" /> העמוד הקודם
        </Button>

        {isFeedbackPage ? (
          readOnly && onExit ? (
            <Button size="lg" onClick={onExit}>
              <Check className="size-4" /> סיום
            </Button>
          ) : (
            <span />
          )
        ) : (
          <Button type="button" size="lg" onClick={() => void goNext()}>
            העמוד הבא <ChevronLeft className="size-4" />
          </Button>
        )}
      </div>

      {def.assistant?.enabled !== false && <Assistant taskId={task.id} />}
    </div>
  );
}
