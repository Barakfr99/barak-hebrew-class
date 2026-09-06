import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Eye, Save, Loader2, Play, Square, Gauge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { saveAnswer, splitSentences, type Task } from "@/lib/practice";
import {
  POS_EXERCISES,
  POS_LABELS,
  POS_NOTES,
  POS_REQUIRED_COUNT,
  cleanWord,
  parseJson,
  tokenize,
  type ConvertAnswer,
  type PickAnswer,
  type PosCategory,
  type PosExercise,
  type SelectionAnswer,
  type SortAnswer,
} from "@/lib/parts-of-speech";
import { useSpeech, SPEECH_RATES } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";
import { SpeakButton } from "./SpeakButton";
import { InfoHint } from "./InfoHint";
import { ParagraphJump } from "./ParagraphJump";

type Speech = {
  enabled: boolean;
  speakingId: string | null;
  loadingId: string | null;
  speak: (unit: { id: string; text: string }) => void;
};

const CATEGORY_CLASS: Record<PosCategory, string> = {
  noun: "border-primary bg-primary/10 text-primary",
  verb: "border-success bg-success/10 text-success",
  infinitive: "border-accent-foreground bg-accent/60 text-accent-foreground",
  adjective: "border-secondary-foreground bg-secondary text-secondary-foreground",
};

/**
 * עמוד תרגול "זיהוי חלקי דיבר": בוחרים 3 תרגילים מתוך 6, עונים ומסמנים כהושלם.
 * התשובות נשמרות בטבלת התשובות הקיימת — שדה אחד לכל תרגיל.
 */
export function PartsOfSpeechTask({
  task,
  studentId,
  speechEnabled,
  readOnly = false,
  initialAnswers,
  articleParagraphs,
  onFinish,
  onBack,
  finishLabel = "סיימתי — למשוב",
  backLabel = "חזרה לשאלות המאמר",
}: {
  task: Task;
  studentId: string;
  speechEnabled: boolean;
  readOnly?: boolean;
  initialAnswers: Record<string, string>;
  articleParagraphs?: string[] | undefined;
  onFinish?: () => void;
  onBack?: () => void;
  finishLabel?: string;
  backLabel?: string;
}) {
  const speech = useSpeech();
  const [values, setValues] = useState<Record<string, string>>(initialAnswers);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const dirtyRef = useRef<Set<string>>(new Set());

  const questionIdByKey = useMemo(() => {
    const map: Record<string, string> = {};
    task.questions.forEach((q) => {
      if (q.group_label) map[q.group_label] = q.id;
    });
    return map;
  }, [task.questions]);

  const selectionId = questionIdByKey["selection"] ?? "";
  const selection = parseJson<SelectionAnswer>(values[selectionId] ?? "", {
    chosen: [],
    done: [],
  });

  const persist = useCallback(
    async (ids: string[], snapshot: Record<string, string>) => {
      await Promise.all(
        ids.map((questionId) =>
          saveAnswer({
            studentId,
            taskId: task.id,
            questionId,
            answerText: snapshot[questionId] ?? "",
          }),
        ),
      );
    },
    [studentId, task.id],
  );

  useEffect(() => {
    if (readOnly || dirtyRef.current.size === 0) return;
    const timer = setTimeout(() => {
      const ids = Array.from(dirtyRef.current);
      dirtyRef.current.clear();
      void persist(ids, values).catch(() => ids.forEach((id) => dirtyRef.current.add(id)));
    }, 2000);
    return () => clearTimeout(timer);
  }, [values, persist, readOnly]);

  const setValue = (questionId: string, text: string) => {
    if (readOnly || !questionId) return;
    dirtyRef.current.add(questionId);
    setValues((prev) => ({ ...prev, [questionId]: text }));
  };

  const saveNow = async (ids?: string[]) => {
    setSaving(true);
    try {
      const targets = ids ?? Object.values(questionIdByKey);
      await persist(targets, values);
      dirtyRef.current.clear();
      setJustSaved(true);
      toast.success("התשובות נשמרו");
      setTimeout(() => setJustSaved(false), 2400);
    } catch {
      toast.error("השמירה לא הצליחה. נסו שוב.");
    } finally {
      setSaving(false);
    }
  };

  const updateSelection = (next: SelectionAnswer) => {
    setValue(selectionId, JSON.stringify(next));
  };

  const cycleRate = () => {
    const idx = SPEECH_RATES.indexOf(speech.rate as (typeof SPEECH_RATES)[number]);
    speech.setRate(SPEECH_RATES[(idx >= 0 ? idx + 1 : 0) % SPEECH_RATES.length]!);
  };

  const speechControls: Speech = {
    enabled: speechEnabled,
    speakingId: speech.speakingId,
    loadingId: speech.loadingId,
    speak: (unit) => void speech.speak(unit),
  };

  const doneCount = selection.done.length;
  const allDone = doneCount >= POS_REQUIRED_COUNT;
  const openExercise = POS_EXERCISES.find((e) => e.key === openKey);

  const rateButton = speechEnabled && (
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
  );

  const header = (
    <header className="rounded-3xl border border-border bg-card p-6">
      <h2 className="text-2xl font-bold">{task.title}</h2>
      <p className="mt-1 text-muted-foreground">{task.description}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        הושלמו {doneCount} מתוך {POS_REQUIRED_COUNT} תרגילים.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["noun", "verb", "infinitive", "adjective"] as PosCategory[]).map((c) => (
          <span key={c} className="flex items-center gap-1">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold",
                CATEGORY_CLASS[c],
              )}
            >
              {POS_LABELS[c]}
            </span>
            <InfoHint note={POS_NOTES[c]} />
          </span>
        ))}
      </div>
      {speechEnabled && speech.cloudFailed && (
        <Alert className="mt-4">
          <AlertDescription>
            ההקראה בקול הטבעי לא זמינה כרגע, ולכן היא מושמעת בקול של הדפדפן.
          </AlertDescription>
        </Alert>
      )}
    </header>
  );

  if (openExercise && !readOnly) {
    const exerciseId = questionIdByKey[openExercise.key] ?? "";
    const isDone = selection.done.includes(openExercise.key);
    return (
      <div className="space-y-6">
        {rateButton}
        {header}
        <Button variant="ghost" size="sm" onClick={() => setOpenKey(null)}>
          <ChevronRight className="size-4" /> חזרה לרשימת התרגילים
        </Button>
        <ExerciseView
          exercise={openExercise}
          value={values[exerciseId] ?? ""}
          onChange={(text) => setValue(exerciseId, text)}
          speech={speechControls}
          speechSequence={speech}
          articleParagraphs={articleParagraphs}
        />
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur">
          <Button
            variant="outline"
            onClick={() => void saveNow([exerciseId, selectionId])}
            disabled={saving}
            className={cn(
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
            disabled={saving}
            onClick={async () => {
              if (!isDone) {
                const nextSelection: SelectionAnswer = {
                  chosen: Array.from(new Set([...selection.chosen, openExercise.key])),
                  done: Array.from(new Set([...selection.done, openExercise.key])),
                };
                const snapshot = {
                  ...values,
                  [selectionId]: JSON.stringify(nextSelection),
                };
                setValues(snapshot);
                dirtyRef.current.clear();
                await persist([exerciseId, selectionId], snapshot).catch(() =>
                  toast.error("השמירה לא הצליחה. נסו שוב."),
                );
              } else {
                await persist([exerciseId], values);
              }
              setOpenKey(null);
            }}
          >
            {isDone ? "חזרה לרשימה" : "סיימתי את התרגיל"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rateButton}
      {header}

      <div className="space-y-3">
        {POS_EXERCISES.map((exercise) => {
          const done = selection.done.includes(exercise.key);
          const isPreview = previewKey === exercise.key;
          const exerciseId = questionIdByKey[exercise.key] ?? "";
          return (
            <div
              key={exercise.key}
              className={cn(
                "rounded-3xl border bg-card p-5",
                done ? "border-success/40 bg-success/5" : "border-border",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{exercise.title}</h3>
                    {done && (
                      <Badge className="bg-success text-success-foreground">
                        <Check className="size-3" /> הושלם
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground">{exercise.instruction}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewKey(isPreview ? null : exercise.key)}
                  >
                    <Eye className="size-4" />
                    {isPreview ? "סגירת התצוגה" : "תצוגה מקדימה"}
                  </Button>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant={done ? "ghost" : "secondary"}
                      disabled={!done && allDone}
                      onClick={() => {
                        setPreviewKey(null);
                        if (!done) {
                          updateSelection({
                            chosen: Array.from(new Set([...selection.chosen, exercise.key])),
                            done: selection.done,
                          });
                        }
                        setOpenKey(exercise.key);
                      }}
                    >
                      {done ? "לצפייה בתשובה שלי" : "בחירה ומענה"}
                    </Button>
                  )}
                </div>
              </div>

              {isPreview && (
                <div className="mt-5 rounded-2xl border border-dashed border-border bg-background p-4">
                  <p className="mb-3 text-sm font-medium text-primary">
                    תצוגה מקדימה — קריאה בלבד.
                  </p>
                  <ExerciseView
                    exercise={exercise}
                    value={values[exerciseId] ?? ""}
                    readOnly
                    speech={speechControls}
                    speechSequence={speech}
                    articleParagraphs={articleParagraphs}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur">
          {onBack && (
            <Button variant="outline" size="lg" onClick={() => onBack()}>
              <ChevronRight className="size-4" /> {backLabel}
            </Button>
          )}
          <Button size="lg" disabled={!allDone || saving} onClick={() => onFinish?.()}>
            {finishLabel}
          </Button>
          <span className="text-sm text-muted-foreground">
            {allDone
              ? "השלמת 3 תרגילים — אפשר להמשיך."
              : `נשארו ${POS_REQUIRED_COUNT - doneCount} תרגילים לבחירה.`}
          </span>
        </div>
      )}
    </div>
  );
}

function ExerciseView({
  exercise,
  value,
  onChange,
  readOnly,
  speech,
  speechSequence,
  articleParagraphs,
}: {
  exercise: PosExercise;
  value: string;
  onChange?: (text: string) => void;
  readOnly?: boolean | undefined;
  speech: Speech;
  speechSequence: ReturnType<typeof useSpeech>;
  articleParagraphs?: string[] | undefined;
}) {
  const instructionId = `${exercise.key}:instruction`;
  const categories =
    exercise.kind === "pick" ? [exercise.category] : exercise.categories;

  const sequence = useMemo(() => {
    if (exercise.kind === "convert") return [];
    return splitSentences(exercise.passage).map((sentence, i) => ({
      id: `${exercise.key}:s${i}`,
      text: sentence,
    }));
  }, [exercise]);

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{exercise.title}</h3>
          <p className="reading-text mt-1">{exercise.instruction}</p>
        </div>
        {speech.enabled && (
          <SpeakButton
            onClick={() => speech.speak({ id: instructionId, text: exercise.instruction })}
            active={speech.speakingId === instructionId}
            loading={speech.loadingId === instructionId}
            label="הקראת ההוראה"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <span key={c} className="flex items-center gap-1">
            <span
              className={cn("rounded-full border px-3 py-1 text-sm font-semibold", CATEGORY_CLASS[c])}
            >
              {POS_LABELS[c]}
            </span>
            <InfoHint note={POS_NOTES[c]} />
          </span>
        ))}
        {exercise.paragraphRefs.length > 0 && (
          <ParagraphJump
            numbers={exercise.paragraphRefs}
            paragraphs={articleParagraphs}
            eachSeparately={exercise.paragraphRefs.length > 2}
          />
        )}
      </div>

      {exercise.kind !== "convert" && (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{exercise.source}</p>
            {speech.enabled && (
              <Button
                variant={speechSequence.isPlayingSequence ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  speechSequence.isPlayingSequence
                    ? speechSequence.stop()
                    : void speechSequence.speakSequence(sequence)
                }
              >
                {speechSequence.isPlayingSequence ? (
                  <>
                    <Square className="size-4" /> עצירת ההקראה
                  </>
                ) : speechSequence.loadingId ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> מכין את ההקראה...
                  </>
                ) : (
                  <>
                    <Play className="size-4" /> הקראת הקטע
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="mt-3">
            {exercise.kind === "pick" ? (
              <PickWords
                exercise={exercise}
                value={value}
                readOnly={readOnly}
                onChange={onChange}
              />
            ) : (
              <SortWords
                exercise={exercise}
                value={value}
                readOnly={readOnly}
                onChange={onChange}
              />
            )}
          </div>
        </div>
      )}

      {exercise.kind === "convert" && (
        <ConvertRows exercise={exercise} value={value} readOnly={readOnly} onChange={onChange} />
      )}
    </div>
  );
}

function PickWords({
  exercise,
  value,
  readOnly,
  onChange,
}: {
  exercise: Extract<PosExercise, { kind: "pick" }>;
  value: string;
  readOnly?: boolean | undefined;
  onChange?: ((text: string) => void) | undefined;
}) {
  const tokens = tokenize(exercise.passage);
  const { idx } = parseJson<PickAnswer>(value, { idx: [] });
  const selected = new Set(idx);

  const toggle = (i: number) => {
    if (readOnly) return;
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onChange?.(JSON.stringify({ idx: Array.from(next).sort((a, b) => a - b) }));
  };

  return (
    <div>
      <p className="reading-text flex flex-wrap gap-x-1 gap-y-2">
        {tokens.map((token, i) => (
          <button
            key={`${token}-${i}`}
            type="button"
            onClick={() => toggle(i)}
            disabled={readOnly}
            className={cn(
              "rounded-lg px-1.5 py-1 transition-colors",
              selected.has(i)
                ? cn("border font-semibold", CATEGORY_CLASS[exercise.category])
                : "hover:bg-accent/50",
              readOnly && "cursor-default",
            )}
          >
            {token}
          </button>
        ))}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        סימנתם {selected.size} מתוך {exercise.needed} מילים.
      </p>
    </div>
  );
}

function SortWords({
  exercise,
  value,
  readOnly,
  onChange,
}: {
  exercise: Extract<PosExercise, { kind: "sort" }>;
  value: string;
  readOnly?: boolean | undefined;
  onChange?: ((text: string) => void) | undefined;
}) {
  const tokens = tokenize(exercise.passage);
  const { assign } = parseJson<SortAnswer>(value, { assign: {} });

  const choose = (index: number, category: PosCategory | null) => {
    if (readOnly) return;
    const next = { ...assign };
    if (category) next[String(index)] = category;
    else delete next[String(index)];
    onChange?.(JSON.stringify({ assign: next }));
  };

  const answeredCount = Object.keys(assign).length;
  const markedCount = Object.keys(exercise.marked).length;

  return (
    <div>
      <p className="reading-text flex flex-wrap gap-x-1 gap-y-2">
        {tokens.map((token, i) => {
          const isMarked = exercise.marked[i] !== undefined;
          if (!isMarked) {
            return (
              <span key={`${token}-${i}`} className="px-1 py-1">
                {token}
              </span>
            );
          }
          const chosen = assign[String(i)];
          return (
            <Popover key={`${token}-${i}`}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={readOnly}
                  className={cn(
                    "rounded-lg border px-2 py-1 font-semibold underline decoration-dotted decoration-2 underline-offset-4",
                    chosen ? CATEGORY_CLASS[chosen] : "border-border bg-background",
                  )}
                >
                  {token}
                  {chosen && (
                    <span className="mx-1 text-xs font-normal">({POS_LABELS[chosen]})</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                dir="rtl"
                align="center"
                collisionPadding={12}
                className="w-[min(16rem,calc(100vw-2rem))] space-y-2 text-start"
              >
                <p className="text-sm font-semibold text-primary">
                  {cleanWord(token)} — מה חלק הדיבר?
                </p>
                {exercise.categories.map((c) => (
                  <Button
                    key={c}
                    variant={chosen === c ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => choose(i, c)}
                  >
                    {POS_LABELS[c]}
                  </Button>
                ))}
                {chosen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => choose(i, null)}
                  >
                    ניקוי הבחירה
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          );
        })}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        מיינתם {answeredCount} מתוך {markedCount} מילים.
      </p>
    </div>
  );
}

function ConvertRows({
  exercise,
  value,
  readOnly,
  onChange,
}: {
  exercise: Extract<PosExercise, { kind: "convert" }>;
  value: string;
  readOnly?: boolean | undefined;
  onChange?: ((text: string) => void) | undefined;
}) {
  const { values } = parseJson<ConvertAnswer>(value, { values: [] });

  const setAt = (index: number, text: string) => {
    const next = [...values];
    while (next.length < exercise.rows.length) next.push("");
    next[index] = text;
    onChange?.(JSON.stringify({ values: next }));
  };

  return (
    <div className="space-y-3">
      {exercise.rows.map((row, i) => (
        <div key={row.word} className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div>
            <Label className="text-sm text-muted-foreground">המילה מהמאמר</Label>
            <p className="reading-text mt-1 font-semibold">{row.word}</p>
          </div>
          <span className="text-sm text-muted-foreground sm:pb-3">{row.direction}</span>
          <div>
            <Label htmlFor={`${exercise.key}-${i}`} className="text-sm text-muted-foreground">
              התשובה שלי
            </Label>
            <Input
              id={`${exercise.key}-${i}`}
              value={values[i] ?? ""}
              readOnly={readOnly}
              onChange={(e) => setAt(i, e.target.value)}
              className="mt-1 reading-text bg-background"
              placeholder={readOnly ? "" : "כתבו כאן..."}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
