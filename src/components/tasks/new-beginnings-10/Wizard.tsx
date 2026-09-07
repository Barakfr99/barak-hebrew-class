import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, FileText, Lock, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { InfoHint, InfoTerm } from "@/components/practice/InfoHint";
import {
  NB10_ARTICLE_TITLE,
  NB10_PAGES,
  NB10_PAGE_COUNT,
  NB10_PARAGRAPHS,
  pageAnswerIds,
  type NB10Note,
  type NB10Page,
  type NB10Question,
} from "./content";
import {
  fetchNB10Answers,
  fetchNB10Submission,
  saveNB10Answer,
  submitNB10,
  type NB10Task,
} from "./data";
import { MethodAssistant } from "./MethodAssistant";
import { NB10FeedbackStep, type NB10FeedbackValues } from "./FeedbackStep";
import { supabase } from "@/integrations/supabase/client";

/** מציג פסקה מהטקסט במסגרת מרחפת — ניווט/בדיקה בלבד. */
function ParagraphPeek({ number }: { number: number }) {
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
        <p className="mb-1 text-sm font-semibold text-primary">פסקה {number}</p>
        <p className="reading-text">{NB10_PARAGRAPHS[number - 1]}</p>
      </PopoverContent>
    </Popover>
  );
}

/** מדגיש מושג בתוך נוסח השאלה, עם הסבר בפופ-אפ. */
function PromptWithTerm({ prompt, note }: { prompt: string; note: NB10Note }) {
  const index = prompt.indexOf(note.title);
  if (index < 0) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-2">
        {prompt} <InfoHint note={{ kind: "info", ...note }} />
      </span>
    );
  }
  return (
    <>
      {prompt.slice(0, index)}
      <InfoTerm note={{ kind: "info", ...note }} text={note.title} />
      {prompt.slice(index + note.title.length)}
    </>
  );
}

function QuestionCard({
  question,
  answers,
  onChange,
  readOnly,
}: {
  question: NB10Question;
  answers: Record<string, string>;
  onChange: (id: string, value: string) => void;
  readOnly: boolean;
}) {
  if (question.kind === "guided") {
    return (
      <div className="rounded-3xl border border-border bg-card p-5">
        <p className="text-lg font-bold">{question.label}</p>
        <div className="mt-4 space-y-4">
          {question.lines.map((line, i) => {
            const id = `${question.id}.${i}`;
            return (
              <div key={id}>
                <Label className="text-base" htmlFor={id}>
                  {line}
                </Label>
                <Textarea
                  id={id}
                  rows={2}
                  disabled={readOnly}
                  value={answers[id] ?? ""}
                  onChange={(e) => onChange(id, e.target.value)}
                  className="mt-2"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.kind === "choice") {
    return (
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="reading-text text-lg font-bold">{question.prompt}</p>
          {question.tip && <InfoHint note={{ kind: "tip", ...question.tip }} />}
        </div>
        <RadioGroup
          className="mt-4 space-y-2"
          value={answers[question.id] ?? ""}
          onValueChange={(value) => !readOnly && onChange(question.id, value)}
        >
          {question.options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-3"
            >
              <RadioGroupItem value={option} disabled={readOnly} className="mt-1" />
              <span className="reading-text">{option}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="reading-text text-lg font-bold">
          {question.term ? (
            <PromptWithTerm prompt={question.prompt} note={question.term} />
          ) : (
            question.prompt
          )}
        </p>
        {question.tip && <InfoHint note={{ kind: "tip", ...question.tip }} />}
      </div>
      <Textarea
        rows={question.rows ?? 4}
        disabled={readOnly}
        value={answers[question.id] ?? ""}
        onChange={(e) => onChange(question.id, e.target.value)}
        className="mt-4"
      />
    </div>
  );
}

export function NewBeginnings10Wizard({
  task,
  studentId,
  onExit,
}: {
  task: NB10Task;
  studentId: string;
  onExit?: () => void;
}) {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const answersQuery = useQuery({
    queryKey: ["nb10-answers", task.id, studentId],
    queryFn: () => fetchNB10Answers(task.id, studentId),
  });
  const submissionQuery = useQuery({
    queryKey: ["nb10-submission", task.id, studentId],
    queryFn: () => fetchNB10Submission(task.id, studentId),
  });
  const feedbackQuery = useQuery({
    queryKey: ["nb10-feedback", task.id, studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nb10_feedback")
        .select(
          "clarity_scale, learning_scale, assistant_scale, compare_lesson, help_page_usage, still_unclear",
        )
        .eq("task_id", task.id)
        .eq("student_id", studentId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as NB10FeedbackValues | null;
    },
  });

  useEffect(() => {
    if (answersQuery.data && !loaded) {
      setAnswers(answersQuery.data);
      setLoaded(true);
    }
  }, [answersQuery.data, loaded]);

  const readOnly = Boolean(submissionQuery.data);

  const persist = useCallback(
    async (questionId: string, value: string) => {
      setSaving(true);
      try {
        await saveNB10Answer({ taskId: task.id, studentId, questionId, answerText: value });
      } catch {
        toast.error("לא הצלחנו לשמור את התשובה. בדקו את החיבור לאינטרנט.");
      } finally {
        setSaving(false);
      }
    },
    [studentId, task.id],
  );

  const change = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    const existing = timers.current[questionId];
    if (existing) clearTimeout(existing);
    timers.current[questionId] = setTimeout(() => void persist(questionId, value), 700);
  };

  /** שמירה מיידית של כל מה שממתין, לפני מעבר עמוד. */
  const flush = useCallback(async () => {
    const pending = Object.keys(timers.current);
    pending.forEach((id) => clearTimeout(timers.current[id]!));
    timers.current = {};
    await Promise.all(pending.map((id) => persist(id, answers[id] ?? "")));
  }, [answers, persist]);

  // מילוי פתיח מנחה בתיבה שעדיין ריקה
  useEffect(() => {
    if (!loaded || readOnly) return;
    NB10_PAGES.forEach((page) =>
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
    mutationFn: async (feedback: NB10FeedbackValues) => {
      await flush();
      await submitNB10({ taskId: task.id, studentId, feedback });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nb10-submission", task.id, studentId] }),
        queryClient.invalidateQueries({ queryKey: ["nb10-feedback", task.id, studentId] }),
      ]);
      toast.success("המשימה הוגשה. תודה!");
    },
    onError: () => toast.error("לא הצלחנו להגיש את המשימה. נסו שוב."),
  });

  const page: NB10Page = NB10_PAGES[pageIndex]!;
  const isFeedbackPage = pageIndex === NB10_PAGE_COUNT - 1;
  const missing = useMemo(() => {
    if (readOnly) return [] as string[];
    return pageAnswerIds(page).filter((id) => (answers[id] ?? "").trim() === "");
  }, [page, answers, readOnly]);

  const goTo = async (next: number) => {
    await flush();
    setPageIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = async () => {
    if (missing.length > 0) {
      toast.error("כדי להמשיך יש לענות על כל השאלות בעמוד הזה.");
      return;
    }
    await goTo(pageIndex + 1);
  };

  if (answersQuery.isLoading || submissionQuery.isLoading || feedbackQuery.isLoading) {
    return <p className="text-muted-foreground">רגע, טוענים את המשימה...</p>;
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            עמוד {pageIndex + 1} מתוך {NB10_PAGE_COUNT}
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
        <Progress value={((pageIndex + 1) / NB10_PAGE_COUNT) * 100} className="mt-2 h-2" />
      </div>

      <h2 className="mt-6 text-2xl font-bold">{page.title}</h2>

      {page.paragraph && (
        <article className="mt-4 rounded-3xl border border-border bg-card p-6">
          <p className="text-sm font-semibold text-primary">
            {NB10_ARTICLE_TITLE} · פסקה {page.paragraph}
          </p>
          <p className="reading-text mt-2">{NB10_PARAGRAPHS[page.paragraph - 1]}</p>
        </article>
      )}

      {page.snippet && (
        <article className="mt-4 rounded-3xl border border-primary/30 bg-accent/40 p-6">
          <p className="text-sm font-semibold text-primary">{page.snippet.title}</p>
          <p className="reading-text mt-2">{page.snippet.body}</p>
        </article>
      )}

      {page.proverb && (
        <article className="mt-4 rounded-3xl border border-primary/30 bg-accent/40 p-6">
          <p className="text-sm font-semibold text-primary">פתגם סיני</p>
          <p className="reading-text mt-2 font-bold">"{page.proverb}"</p>
        </article>
      )}

      {page.paragraphButtons && (
        <div className="mt-4 flex flex-wrap gap-2">
          {NB10_PARAGRAPHS.map((_, i) => (
            <ParagraphPeek key={i} number={i + 1} />
          ))}
        </div>
      )}

      {page.intro && <p className="mt-4 text-muted-foreground">{page.intro}</p>}

      <div className="mt-5 space-y-4">
        {isFeedbackPage ? (
          submissionQuery.data ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center">
              <PartyPopper className="mx-auto size-10 text-primary" />
              <h3 className="mt-3 text-2xl font-bold">סיימת את המשימה. תודה!</h3>
              <p className="mt-2 text-muted-foreground">
                כל התשובות שלך נשמרו והמורה רואה אותן. אפשר לעבור אחורה ולקרוא את מה שכתבת.
              </p>
              {onExit && (
                <Button className="mt-5" size="lg" onClick={onExit}>
                  חזרה לרשימת המשימות
                </Button>
              )}
            </div>
          ) : (
            <NB10FeedbackStep
              readOnly={false}
              initial={feedbackQuery.data ?? null}
              submitting={submit.isPending}
              onSubmit={(values) => submit.mutate(values)}
            />
          )
        ) : (
          page.questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              answers={answers}
              onChange={change}
              readOnly={readOnly}
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

      <MethodAssistant />
    </div>
  );
}
