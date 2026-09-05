import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Play, Square, Save, Loader2, Gauge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { groupQuestions, saveAnswer, splitSentences, type Task } from "@/lib/practice";
import { useSpeech, SPEECH_RATES } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";
import { SpeakButton } from "./SpeakButton";
import { PassageReader } from "./PassageReader";
import { TaskHelp } from "./TaskHelp";
import { QuestionBlock } from "./QuestionBlock";

export function TaskView({
  task,
  studentId,
  speechEnabled,
  readOnly = false,
  initialAnswers,
  onFinish,
  finishLabel = "סיימתי את המשימה",
}: {
  task: Task;
  studentId: string;
  speechEnabled: boolean;
  readOnly?: boolean;
  initialAnswers: Record<string, string>;
  onFinish?: () => void;
  finishLabel?: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef<Set<string>>(new Set());
  const speech = useSpeech();

  const cycleRate = useCallback(() => {
    const idx = SPEECH_RATES.indexOf(speech.rate as (typeof SPEECH_RATES)[number]);
    const nextIndex = idx >= 0 ? (idx + 1) % SPEECH_RATES.length : 0;
    speech.setRate(SPEECH_RATES[nextIndex]!);
  }, [speech]);

  const persist = useCallback(
    async (ids: string[], answersSnapshot: Record<string, string>) => {
      await Promise.all(
        ids.map((questionId) =>
          saveAnswer({
            studentId,
            taskId: task.id,
            questionId,
            answerText: answersSnapshot[questionId] ?? "",
          }),
        ),
      );
    },
    [studentId, task.id],
  );

  // Automatic background save a few seconds after each change.
  useEffect(() => {
    if (readOnly || dirtyRef.current.size === 0) return;
    const timer = setTimeout(() => {
      const ids = Array.from(dirtyRef.current);
      dirtyRef.current.clear();
      void persist(ids, answers).catch(() => {
        ids.forEach((id) => dirtyRef.current.add(id));
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [answers, persist, readOnly]);

  const saveDraft = async () => {
    setSaving(true);
    try {
      await persist(
        task.questions.map((q) => q.id),
        answers,
      );
      dirtyRef.current.clear();
      setJustSaved(true);
      toast.success("התשובות נשמרו");
      setTimeout(() => setJustSaved(false), 2600);
    } catch {
      toast.error("השמירה לא הצליחה. נסו שוב.");
    } finally {
      setSaving(false);
    }
  };

  const titleUnit = useMemo(
    () => ({ id: `${task.id}:article-title`, text: task.article_title || task.title }),
    [task.id, task.article_title, task.title],
  );

  const sequence = useMemo(() => {
    const units: { id: string; text: string }[] = [];
    if (titleUnit.text) units.push(titleUnit);
    task.paragraphs.forEach((paragraph, pIndex) => {
      splitSentences(paragraph).forEach((sentence, sIndex) => {
        units.push({ id: `${task.id}:p${pIndex}:s${sIndex}`, text: sentence });
      });
    });
    return units;
  }, [task, titleUnit]);

  const speechControls = {
    enabled: speechEnabled,
    speakingId: speech.speakingId,
    loadingId: speech.loadingId,
    speak: (unit: { id: string; text: string }) => void speech.speak(unit),
  };

  const groups = useMemo(() => groupQuestions(task.questions), [task.questions]);
  const showPoints = task.questions.some((q) => typeof q.points === "number");

  const answeredAll = task.questions.every((q) => (answers[q.id] ?? "").trim().length > 0);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6">
        <h2 className="text-2xl font-bold">{task.title}</h2>
        <p className="mt-1 text-muted-foreground">{task.description}</p>
        {!showPoints && <p className="mt-2 text-sm text-muted-foreground">{groups.length} שאלות</p>}
        {showPoints && (
          <p className="mt-2 text-sm text-muted-foreground">
            {task.questions.length} שאלות · עד {task.max_points} נקודות
          </p>
        )}


        {speechEnabled && speech.cloudFailed && (
          <Alert className="mt-4">
            <AlertDescription>
              ההקראה בקול הטבעי לא זמינה כרגע, ולכן היא מושמעת בקול של הדפדפן. אפשר להמשיך בתרגול
              כרגיל.
            </AlertDescription>
          </Alert>
        )}
      </header>

      {speechEnabled && (
        <>
          <button
            type="button"
            onClick={cycleRate}
            aria-label="שינוי מהירות הקראה"
            className={cn(
              "fixed bottom-24 left-6 z-50 flex size-16 flex-col items-center justify-center gap-0.5 rounded-full border border-border bg-card shadow-xl transition-transform active:scale-95 hover:bg-accent",
              speech.rate !== 1 && "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            <Gauge className="size-5" />
            <span className="text-xs font-semibold leading-none">
              {speech.rate === 1 ? "רגיל" : `${speech.rate}×`}
            </span>
          </button>
          <span aria-live="polite" className="sr-only">
            {speech.rate === 1 ? "מהירות רגילה" : `מהירות ${speech.rate}×`}
          </span>
        </>
      )}

      <TaskHelp taskId={task.id} sections={task.help_sections} />

      <section className="rounded-3xl border border-border bg-card p-6">
        {task.article_title ? (
          <div className="flex items-start gap-2">
            {speechEnabled && (
              <SpeakButton
                onClick={() => speechControls.speak(titleUnit)}
                active={speech.speakingId === titleUnit.id}
                loading={speech.loadingId === titleUnit.id}
                label="הקראת כותרת הטקסט"
              />
            )}
            <div>
              <h3 className="text-xl font-bold">{task.article_title}</h3>
              {task.source_note && (
                <p className="mt-1 text-sm text-muted-foreground">{task.source_note}</p>
              )}
            </div>
          </div>
        ) : (
          <h3 className="text-lg font-semibold text-primary">קטע הקריאה</h3>
        )}
        {speechEnabled && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant={speech.isPlayingSequence ? "secondary" : "outline"}
              onClick={() =>
                speech.isPlayingSequence ? speech.stop() : void speech.speakSequence(sequence)
              }
            >
              {speech.isPlayingSequence ? (
                <>
                  <Square className="size-4" /> עצירת ההקראה
                </>
              ) : speech.loadingId ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> מכין את ההקראה...
                </>
              ) : (
                <>
                  <Play className="size-4" /> הקראה רציפה של הטקסט
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              אפשר גם ללחוץ על משפט כדי להקריא רק אותו.
            </span>
          </div>
        )}
        <div className="mt-3">
          <PassageReader
            taskId={task.id}
            paragraphs={task.paragraphs}
            speech={speechControls}
            numbered={Boolean(task.article_title)}
          />
        </div>
        {task.footnote && (
          <p className="mt-5 text-sm text-muted-foreground">{task.footnote}</p>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">
          {readOnly ? "השאלות במשימה" : "השאלות"}
        </h3>
        {groups.map((group, index) => (
          <QuestionBlock
            key={group.key}
            group={group}
            index={index}
            taskId={task.id}
            paragraphs={task.paragraphs}
            answers={answers}
            readOnly={readOnly}
            speech={speechControls}
            onChange={(questionId, value) => {
              dirtyRef.current.add(questionId);
              setAnswers((prev) => ({ ...prev, [questionId]: value }));
            }}
          />
        ))}
      </section>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur">
          <Button
            variant="outline"
            onClick={() => void saveDraft()}
            disabled={saving}
            className={cn(
              "transition-colors",
              justSaved && "border-success bg-success text-success-foreground hover:bg-success",
            )}
          >
            {justSaved ? (
              <>
                <Check className="size-4" /> נשמר!
              </>
            ) : (
              <>
                <Save className="size-4" /> שמירת טיוטה
              </>
            )}
          </Button>
          <Button
            size="lg"
            onClick={async () => {
              await saveDraft();
              onFinish?.();
            }}
            disabled={saving}
          >
            {finishLabel}
          </Button>
          {!answeredAll && (
            <span className="text-sm text-muted-foreground">
              יש שאלות שעדיין לא ענית עליהן — אפשר לסיים בכל מקרה.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
