import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  saveRunnerAnswers,
  submitRunnerTask,
  syncRunnerAnswers,
} from "@/lib/task-runner/data";
import {
  computeEffort,
  countGroupAnswered,
  isGroupItemAnswered,
  type RunnerPage,
  type RunnerQuestion,
} from "@/lib/task-runner/types";
import { SpeakButton } from "@/components/practice/SpeakButton";
import { useSpeech } from "@/hooks/useSpeech";
import { QuestionRenderer } from "./QuestionRenderer";
import { ContentBlocks } from "./ContentBlocks";
import { InstructionsGate, MinimumWarningDialog, SubmitConfirmDialog } from "./dialogs";
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
  speechEnabled = false,
}: {
  task: RunnerTask;
  studentId: string;
  onExit?: () => void;
  /** הקראה קולית — מופעלת לתלמיד/ה ולמשימה הזו בלוח המורה. */
  speechEnabled?: boolean;
}) {
  const def = task.definition;
  const pages: RunnerPage[] = def.pages;
  const feedbackQuestions = def.feedbackQuestions ?? [];
  const hasFeedback = feedbackQuestions.length > 0;
  const pageCount = pages.length + (hasFeedback ? 1 : 0);
  const articleTitle = def.articleTitle ?? task.title;
  const paragraphs = def.paragraphs ?? [];

  const queryClient = useQueryClient();
  const speech = useSpeech();
  const renderSpeak = speechEnabled
    ? (id: string, text: string) => (
        <SpeakButton
          onClick={() => void speech.speak({ id: `${task.id}:${id}`, text })}
          active={speech.speakingId === `${task.id}:${id}`}
          loading={speech.loadingId === `${task.id}:${id}`}
        />
      )
    : undefined;
  /** הקראת קטע שלם ברצף — לתרגילי תיוג מילים (חלקי דיבר וכדומה). */
  const speechSequence = speechEnabled
    ? {
        isPlayingSequence: speech.isPlayingSequence,
        loadingId: speech.loadingId,
        speakSequence: (units: { id: string; text: string }[]) => void speech.speakSequence(units),
        stop: speech.stop,
      }
    : undefined;
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passedGates, setPassedGates] = useState<Record<number, boolean>>({});
  const [minWarning, setMinWarning] = useState<{ open: boolean; message: string; next: number }>({
    open: false,
    message: "",
    next: 0,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
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
  const generalNote = notesQuery.data?.general?.note ?? "";

  const persist = useCallback(
    async (entries: { itemKey: string; answerText: string }[]) => {
      if (entries.length === 0) return;
      setSaving(true);
      try {
        await saveRunnerAnswers({ taskId: task.id, studentId, entries });
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
    timers.current[itemKey] = setTimeout(() => void persist([{ itemKey, answerText: value }]), 700);
  };

  const flush = useCallback(async () => {
    const pending = Object.keys(timers.current);
    pending.forEach((id) => clearTimeout(timers.current[id]!));
    timers.current = {};
    await persist(pending.map((id) => ({ itemKey: id, answerText: answers[id] ?? "" })));
  }, [answers, persist]);

  // מילוי פתיח מנחה בתיבה שעדיין ריקה
  useEffect(() => {
    if (!loaded || readOnly) return;
    const prefixes: { itemKey: string; answerText: string }[] = [];
    pages.forEach((page) =>
      [...(page.questions ?? []), ...(page.group?.items.flatMap((i) => i.questions) ?? [])].forEach(
        (q) => {
          if (q.kind === "open" && q.prefix && (answers[q.id] ?? "") === "") {
            prefixes.push({ itemKey: q.id, answerText: q.prefix });
          }
        },
      ),
    );
    if (prefixes.length === 0) return;
    setAnswers((prev) => {
      const next = { ...prev };
      prefixes.forEach((p) => {
        next[p.itemKey] = p.answerText;
      });
      return next;
    });
    void persist(prefixes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, readOnly]);

  const effort = useMemo(() => computeEffort(def, answers), [def, answers]);

  const submit = useMutation({
    mutationFn: async () => {
      await flush();
      await syncRunnerAnswers(task.id, studentId, answers);
      await submitRunnerTask({ taskId: task.id, studentId });
    },
    onSuccess: async () => {
      setConfirmOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["runner-submission", task.id, studentId] });
      toast.success("המשימה הוגשה. תודה!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: () => toast.error("לא הצלחנו להגיש את המשימה. נסו שוב."),
  });

  const isFeedbackPage = hasFeedback && pageIndex === pageCount - 1;
  const page: RunnerPage | undefined = isFeedbackPage ? undefined : pages[pageIndex];

  const goTo = async (next: number) => {
    await flush();
    setPageIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** מעבר קדימה — עם אזהרה אם לא עמדו במינימום של קבוצת בחירה בעמוד הזה. */
  const goNext = async () => {
    const next = pageIndex + 1;
    if (!readOnly && page?.group) {
      const answered = countGroupAnswered(page.group, answers);
      if (answered < page.group.required) {
        const noun = page.group.itemNoun ?? "פריטים";
        setMinWarning({
          open: true,
          next,
          message: `בעמוד "${page.title}" נדרשו ${page.group.required} ${noun} לפחות, ומולאו ${answered}. אפשר להמשיך בכל זאת, אבל כדאי להשלים את המינימום כדי לקבל משוב וציון מלא.`,
        });
        return;
      }
    }
    await goTo(next);
  };

  const saveDraft = async () => {
    await flush();
    toast.success("הטיוטה נשמרה. אפשר להמשיך בהמשך מאותה נקודה.");
  };

  const gate = page?.gate;
  const gatePassed = passedGates[pageIndex] === true;
  const gateOpen = Boolean(gate) && !gatePassed && !readOnly;

  const summaryLines = useMemo(() => {
    const lines: string[] = [];
    pages.forEach((p) => {
      if (!p.group) return;
      const answered = countGroupAnswered(p.group, answers);
      const noun = p.group.itemNoun ?? "פריטים";
      lines.push(`${p.title}: ${answered} ${noun} מתוך ${p.group.required} נדרשים`);
    });
    if (effort.hasExtra) lines.push(`ענית על ${effort.extra} מעבר לנדרש — יסומן למורה כמאמץ נוסף.`);
    return lines;
  }, [pages, answers, effort]);

  const submitWarnings = useMemo(
    () =>
      effort.missing.map((m) => {
        const p = pages[m.pageIndex];
        const noun = p?.group?.itemNoun ?? "פריטים";
        return `${p?.title ?? "עמוד"}: נדרשים ${m.required} ${noun}, נענו ${m.answered}.`;
      }),
    [effort.missing, pages],
  );

  if (answersQuery.isLoading || submissionQuery.isLoading) {
    return <p className="text-muted-foreground">רגע, טוענים את המשימה...</p>;
  }

  const renderQuestions = (questions: RunnerQuestion[]) =>
    questions.map((question) => (
      <QuestionRenderer
        key={question.id}
        question={question}
        answers={answers}
        onChange={change}
        readOnly={readOnly}
        notes={notes}
        showAnswers={readOnly}
        renderSpeak={renderSpeak}
        speechSequence={speechSequence}
        paragraphs={paragraphs}
      />
    ));

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

      {isFeedbackPage ? (
        <div className="mt-5 space-y-4">
          {readOnly ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center">
              <PartyPopper className="mx-auto size-10 text-primary" />
              <h3 className="mt-3 text-2xl font-bold">סיימת את המשימה. תודה!</h3>
              <p className="mt-2 text-muted-foreground">
                כל התשובות שלך נשמרו והמורה רואה אותן. אפשר לעבור אחורה ולקרוא את מה שכתבת, כולל
                התשובות הנכונות.
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
            <>
              {def.feedbackIntro && <p className="text-muted-foreground">{def.feedbackIntro}</p>}
              {renderQuestions(feedbackQuestions)}
              <Button size="lg" className="w-full" onClick={() => setConfirmOpen(true)}>
                הגשה סופית של המשימה
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          {page!.intro && <p className="mt-3 text-muted-foreground">{page!.intro}</p>}

          {page!.paragraph && (
            <article className="mt-4 rounded-3xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-primary">
                  {articleTitle} · פסקה {page!.paragraph}
                </p>
                {renderSpeak?.(`para-${page!.paragraph}`, paragraphs[page!.paragraph - 1] ?? "")}
              </div>
              <p className="reading-text mt-2">{paragraphs[page!.paragraph - 1]}</p>
            </article>
          )}

          {page!.snippet && (
            <article className="mt-4 rounded-3xl border border-primary/30 bg-accent/40 p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-primary">{page!.snippet.title}</p>
                {renderSpeak?.("snippet", page!.snippet.body)}
              </div>
              <p className="reading-text mt-2">{page!.snippet.body}</p>
            </article>
          )}

          {page!.proverb && (
            <article className="mt-4 rounded-3xl border border-primary/30 bg-accent/40 p-6">
              <p className="text-sm font-semibold text-primary">פתגם</p>
              <p className="reading-text mt-2 font-bold">"{page!.proverb}"</p>
            </article>
          )}

          {page!.paragraphButtons && (
            <div className="mt-4 flex flex-wrap gap-2">
              {paragraphs.map((text, i) => (
                <ParagraphPeek key={i} title={articleTitle} number={i + 1} text={text} />
              ))}
            </div>
          )}

          {page!.blocks && page!.blocks.length > 0 && (
            <div className="mt-4">
              <ContentBlocks blocks={page!.blocks} renderSpeak={renderSpeak} />
            </div>
          )}

          {page!.group && (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-accent/30 p-3 text-sm font-semibold">
              מולאו {countGroupAnswered(page!.group, answers)} מתוך {page!.group.items.length}{" "}
              {page!.group.itemNoun ?? "פריטים"} · נדרש {page!.group.required}.
              {countGroupAnswered(page!.group, answers) > page!.group.required &&
                " ענית על יותר מהנדרש — מאמץ נוסף!"}
            </div>
          )}

          <div className="mt-5 space-y-4">
            {page!.questions && renderQuestions(page!.questions)}

            {page!.group?.items.map((item) => {
              const done = isGroupItemAnswered(item, answers);
              return (
                <section
                  key={item.id}
                  className={`rounded-3xl border p-5 ${done ? "border-success/50 bg-success/5" : "border-border bg-card"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {item.label && <h3 className="text-lg font-bold">{item.label}</h3>}
                    <div className="flex items-center gap-2">
                      {item.text && renderSpeak?.(`item-${item.id}`, item.text)}
                      {done && (
                        <Badge className="bg-success text-success-foreground">
                          <Check className="size-3" /> נענתה
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.text && <p className="reading-text mt-2">{item.text}</p>}
                  <div className="mt-4 space-y-4">{renderQuestions(item.questions)}</div>
                </section>
              );
            })}
          </div>
        </>
      )}

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

        {pageIndex < pageCount - 1 ? (
          <Button type="button" size="lg" onClick={() => void goNext()}>
            העמוד הבא <ChevronLeft className="size-4" />
          </Button>
        ) : readOnly ? (
          onExit ? (
            <Button size="lg" onClick={onExit}>
              <Check className="size-4" /> סיום
            </Button>
          ) : (
            <span />
          )
        ) : hasFeedback ? (
          <span />
        ) : (
          <Button type="button" size="lg" onClick={() => setConfirmOpen(true)}>
            הגשה סופית של המשימה
          </Button>
        )}
      </div>

      {gate && (
        <InstructionsGate
          open={gateOpen}
          title={`הוראות — ${page?.title ?? ""}`}
          lines={gate.lines}
          seconds={gate.seconds}
          onConfirm={() => setPassedGates((prev) => ({ ...prev, [pageIndex]: true }))}
        />
      )}

      <MinimumWarningDialog
        open={minWarning.open}
        onOpenChange={(open) => setMinWarning((prev) => ({ ...prev, open }))}
        title="לא הושלם המינימום הנדרש"
        message={minWarning.message}
        onConfirm={() => {
          setMinWarning((prev) => ({ ...prev, open: false }));
          void goTo(minWarning.next);
        }}
      />

      <SubmitConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        lines={summaryLines}
        warnings={submitWarnings}
        submitting={submit.isPending}
        onConfirm={() => submit.mutate()}
      />

      {def.assistant?.enabled !== false && def.assistant && <Assistant taskId={task.id} />}
    </div>
  );
}
