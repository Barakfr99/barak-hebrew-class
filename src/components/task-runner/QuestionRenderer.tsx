import type { ReactNode } from "react";
import { useMemo } from "react";
import { Check, Loader2, Play, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { splitSentences } from "@/lib/practice";
import { InfoHint, InfoTerm } from "@/components/practice/InfoHint";
import { ParagraphJump } from "@/components/practice/ParagraphJump";
import {
  optionIsCorrect,
  optionText,
  optionWhy,
  parsePosAnswer,
  posCleanWord,
  posTokenize,
  type RunnerNote,
  type RunnerOption,
  type RunnerPosQuestion,
  type RunnerQuestion,
} from "@/lib/task-runner/types";
import type { RunnerAnswerNote } from "@/lib/task-runner/data";

/** צביעה מחזורית לפי סדר הקטגוריות בתרגיל — לא תלויה בזהות הקטגוריה. */
const POS_PALETTE = [
  "border-primary bg-primary/10 text-primary",
  "border-success bg-success/10 text-success",
  "border-accent-foreground bg-accent/60 text-accent-foreground",
  "border-secondary-foreground bg-secondary text-secondary-foreground",
];

/** ממשק מצומצם להקראת רצף (הקראת קטע שלם) — מסופק רק כשההקראה מופעלת. */
export type SpeechSequenceControls = {
  isPlayingSequence: boolean;
  loadingId: string | null;
  speakSequence: (units: { id: string; text: string }[]) => void;
  stop: () => void;
};

/** מציג מושג מודגש בתוך נוסח השאלה, עם הסבר בפופ-אפ — אם המושג אכן מופיע בטקסט. */
function PromptWithTerm({ prompt, note }: { prompt: string; note: RunnerNote }) {
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

/** הערת המורה וניקוד לתשובה — מוצגים רק אם המורה מילא/ה אותם. */
function TeacherNote({ note }: { note: RunnerAnswerNote | undefined }) {
  const text = note?.note?.trim() ?? "";
  const score = note?.score ?? null;
  if (!text && score == null) return null;
  return (
    <div className="mt-2 rounded-xl border border-primary/30 bg-accent/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-primary">הערת המורה</p>
        {score != null && (
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            ניקוד: {score}
          </span>
        )}
      </div>
      {text && <p className="mt-1 whitespace-pre-wrap text-sm">{text}</p>}
    </div>
  );
}

/** רב-ברירה עם חשיפת התשובה הנכונה אחרי ההגשה (אם ההגדרה מסמנת נכונות). */
function OptionsGroup({
  options,
  value,
  onChange,
  readOnly,
  showAnswers,
}: {
  options: RunnerOption[];
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  showAnswers: boolean;
}) {
  const hasKey = options.some((o) => optionIsCorrect(o) !== undefined);
  return (
    <RadioGroup
      className="mt-4 space-y-2"
      value={value}
      onValueChange={(next) => !readOnly && onChange(next)}
    >
      {options.map((option) => {
        const text = optionText(option);
        const correct = optionIsCorrect(option) === true;
        const chosen = value === text;
        const reveal = showAnswers && hasKey && (chosen || correct);
        return (
          <div key={text}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-3",
                reveal && correct && "border-success bg-success/10",
                reveal && !correct && chosen && "border-destructive bg-destructive/10",
                !reveal && "border-border",
              )}
            >
              <RadioGroupItem value={text} disabled={readOnly} className="mt-1" />
              <span className="reading-text flex-1">{text}</span>
              {reveal &&
                (correct ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                ) : chosen ? (
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                ) : null)}
            </label>
            {showAnswers && chosen && !correct && optionWhy(option) && (
              <p className="mt-1 px-3 text-sm text-destructive">{optionWhy(option)}</p>
            )}
          </div>
        );
      })}
    </RadioGroup>
  );
}

/**
 * רכיב שאלה גנרי — מרנדר לפי question.kind, בלי תלות בתוכן משימה ספציפית.
 * showAnswers נכון רק אחרי הגשה, ורק במשימות שהגדירו תשובות נכונות.
 */
export function QuestionRenderer({
  question,
  answers,
  onChange,
  readOnly,
  notes,
  showAnswers = false,
  renderSpeak,
  speechSequence,
  paragraphs,
}: {
  question: RunnerQuestion;
  answers: Record<string, string>;
  onChange: (id: string, value: string) => void;
  readOnly: boolean;
  notes: Record<string, RunnerAnswerNote>;
  showAnswers?: boolean;
  /** כפתור הקראה לצד טקסט — מסופק רק כשההקראה מופעלת לתלמיד/ה. */
  renderSpeak?: ((id: string, text: string) => ReactNode) | undefined;
  /** הקראת קטע שלם ברצף (לתרגילי תיוג מילים) — מסופק רק כשההקראה מופעלת. */
  speechSequence?: SpeechSequenceControls | undefined;
  /** פסקאות המאמר — לתצוגת "צפו בפסקה" בתרגילי תיוג עם הפניות לפסקה. */
  paragraphs?: string[] | undefined;
}) {
  if (question.kind === "pos") {
    return (
      <PosQuestion
        question={question}
        value={answers[question.id] ?? ""}
        onChange={(value) => onChange(question.id, value)}
        readOnly={readOnly}
        notes={notes[question.id]}
        renderSpeak={renderSpeak}
        speechSequence={speechSequence}
        paragraphs={paragraphs}
      />
    );
  }

  if (question.kind === "guided") {
    return (
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-bold">{question.label}</p>
          {renderSpeak?.(question.id, question.label)}
        </div>
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
                <TeacherNote note={notes[id]} />
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
          <div className="flex shrink-0 items-center gap-2">
            {renderSpeak?.(question.id, question.prompt)}
            {question.tip && <InfoHint note={{ kind: "tip", ...question.tip }} />}
          </div>
        </div>
        <OptionsGroup
          options={question.options}
          value={answers[question.id] ?? ""}
          onChange={(value) => onChange(question.id, value)}
          readOnly={readOnly}
          showAnswers={showAnswers}
        />
        <TeacherNote note={notes[question.id]} />
      </div>
    );
  }

  if (question.kind === "scale") {
    const min = question.min ?? 1;
    const max = question.max ?? 5;
    const current = answers[question.id] ?? "";
    const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div className="rounded-3xl border border-border bg-card p-5">
        <Label className="text-base">{question.prompt}</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((n) => (
            <Button
              key={n}
              type="button"
              disabled={readOnly}
              variant={current === String(n) ? "default" : "outline"}
              className="size-12 rounded-full text-base"
              onClick={() => onChange(question.id, String(n))}
            >
              {n}
            </Button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {question.hint ?? `${min} = מעט מאוד · ${max} = מאוד`}
        </p>
        <TeacherNote note={notes[question.id]} />
      </div>
    );
  }

  if (question.kind === "judge") {
    return (
      <JudgeQuestion
        question={question}
        answers={answers}
        onChange={onChange}
        readOnly={readOnly}
        notes={notes}
        showAnswers={showAnswers}
        renderSpeak={renderSpeak}
      />
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
        <div className="flex shrink-0 items-center gap-2">
          {renderSpeak?.(question.id, question.prompt)}
          {question.tip && <InfoHint note={{ kind: "tip", ...question.tip }} />}
        </div>
      </div>
      <Textarea
        rows={question.rows ?? 4}
        disabled={readOnly}
        value={answers[question.id] ?? ""}
        onChange={(e) => onChange(question.id, e.target.value)}
        className="mt-4"
      />
      <TeacherNote note={notes[question.id]} />
    </div>
  );
}

/** שיפוט ניסוח: נכון/לא נכון, ואם לא נכון — אילו סעיפי צ'ק-ליסט הופרו. */
function JudgeQuestion({
  question,
  answers,
  onChange,
  readOnly,
  notes,
  showAnswers,
  renderSpeak,
}: {
  question: Extract<RunnerQuestion, { kind: "judge" }>;
  answers: Record<string, string>;
  onChange: (id: string, value: string) => void;
  readOnly: boolean;
  notes: Record<string, RunnerAnswerNote>;
  showAnswers: boolean;
  renderSpeak?: ((id: string, text: string) => ReactNode) | undefined;
}) {
  const verdictKey = `${question.id}.verdict`;
  const violationsKey = `${question.id}.violations`;
  const verdict = answers[verdictKey] ?? "";
  const chosenViolations = (answers[violationsKey] ?? "").split(",").filter(Boolean);
  const correctVerdict = question.correctOk ? question.okLabel : question.badLabel;
  const rightVerdict = verdict === correctVerdict;

  const toggleViolation = (ruleId: string, checked: boolean) => {
    const next = checked
      ? [...chosenViolations, ruleId]
      : chosenViolations.filter((id) => id !== ruleId);
    onChange(violationsKey, next.join(","));
  };

  return (
    <div
      className={cn(
        "rounded-3xl border bg-card p-5",
        showAnswers && rightVerdict && "border-success",
        showAnswers && !rightVerdict && verdict && "border-destructive",
        !(showAnswers && verdict) && "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="reading-text flex-1 rounded-2xl bg-secondary/50 p-3 text-lg font-bold">
          "{question.quote}"
        </p>
        {renderSpeak?.(question.id, question.quote)}
      </div>

      <RadioGroup
        className="mt-4 flex flex-wrap gap-2"
        value={verdict}
        onValueChange={(value) => !readOnly && onChange(verdictKey, value)}
      >
        {[question.okLabel, question.badLabel].map((label) => (
          <label
            key={label}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2",
              showAnswers && label === correctVerdict && "border-success bg-success/10",
              showAnswers &&
                label === verdict &&
                !rightVerdict &&
                "border-destructive bg-destructive/10",
              !showAnswers && "border-border",
            )}
          >
            <RadioGroupItem value={label} disabled={readOnly} />
            <span className="font-semibold">{label}</span>
          </label>
        ))}
      </RadioGroup>

      {verdict === question.badLabel && (
        <div className="mt-4">
          <p className="text-sm font-semibold">אילו סעיפים מהצ'ק-ליסט הופרו?</p>
          <div className="mt-2 space-y-2">
            {question.rules.map((rule) => {
              const checked = chosenViolations.includes(rule.id);
              const shouldBe = (question.correctViolations ?? []).includes(rule.id);
              return (
                <label
                  key={rule.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border p-3",
                    showAnswers && shouldBe && "border-success bg-success/10",
                    showAnswers && checked && !shouldBe && "border-destructive bg-destructive/10",
                    !showAnswers && "border-border",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={readOnly}
                    onCheckedChange={(value) => toggleViolation(rule.id, value === true)}
                    className="mt-1"
                  />
                  <span className="reading-text">{rule.text}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {showAnswers && question.explain && (
        <p
          className={cn(
            "mt-3 rounded-2xl p-3 text-sm",
            rightVerdict ? "bg-success/10 text-foreground" : "bg-destructive/10 text-foreground",
          )}
        >
          <span className="font-semibold">התשובה הנכונה: {correctVerdict}. </span>
          {question.explain}
        </p>
      )}

      <TeacherNote note={notes[verdictKey]} />
    </div>
  );
}

/** תרגיל תיוג מילים אינטראקטיבי: הקשה על מילים, מיון בלחיצה, או המרת צורה. */
function PosQuestion({
  question,
  value,
  onChange,
  readOnly,
  notes,
  renderSpeak,
  speechSequence,
  paragraphs,
}: {
  question: RunnerPosQuestion;
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  notes: RunnerAnswerNote | undefined;
  renderSpeak?: ((id: string, text: string) => ReactNode) | undefined;
  speechSequence?: SpeechSequenceControls | undefined;
  paragraphs?: string[] | undefined;
}) {
  const instructionId = `${question.id}:instruction`;
  const passage = question.posKind === "convert" ? undefined : question.passage;
  const sequenceId = `${question.id}:sequence`;

  const sequence = useMemo(() => {
    if (!passage) return [];
    return splitSentences(passage).map((sentence, i) => ({
      id: `${question.id}:s${i}`,
      text: sentence,
    }));
  }, [passage, question.id]);

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold">{question.title}</h3>
          <p className="reading-text mt-1 text-muted-foreground">{question.instruction}</p>
        </div>
        {renderSpeak?.(instructionId, question.instruction)}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {question.categories.map((category, i) => (
          <span key={category.id} className="flex items-center gap-1">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold",
                POS_PALETTE[i % POS_PALETTE.length],
              )}
            >
              {category.label}
            </span>
            {category.note && <InfoHint note={{ kind: "info", ...category.note }} />}
          </span>
        ))}
        {question.paragraphRefs && question.paragraphRefs.length > 0 && (
          <ParagraphJump
            numbers={question.paragraphRefs}
            paragraphs={paragraphs}
            eachSeparately={question.paragraphRefs.length > 2}
          />
        )}
      </div>

      {passage && (
        <div className="mt-3 rounded-2xl border border-dashed border-primary/40 bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {question.posKind !== "convert" ? question.source : ""}
            </p>
            {speechSequence && (
              <Button
                type="button"
                variant={speechSequence.isPlayingSequence ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  speechSequence.isPlayingSequence
                    ? speechSequence.stop()
                    : speechSequence.speakSequence(sequence)
                }
              >
                {speechSequence.isPlayingSequence ? (
                  <>
                    <Square className="size-4" /> עצירת ההקראה
                  </>
                ) : speechSequence.loadingId === sequenceId ? (
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
            {question.posKind === "pick" ? (
              <PickWords
                question={question}
                value={value}
                readOnly={readOnly}
                onChange={onChange}
              />
            ) : question.posKind === "sort" ? (
              <SortWords
                question={question}
                value={value}
                readOnly={readOnly}
                onChange={onChange}
              />
            ) : null}
          </div>
        </div>
      )}

      {question.posKind === "convert" && (
        <ConvertRows question={question} value={value} readOnly={readOnly} onChange={onChange} />
      )}

      <TeacherNote note={notes} />
    </div>
  );
}

function PickWords({
  question,
  value,
  readOnly,
  onChange,
}: {
  question: Extract<RunnerPosQuestion, { posKind: "pick" }>;
  value: string;
  readOnly?: boolean | undefined;
  onChange?: ((text: string) => void) | undefined;
}) {
  const tokens = posTokenize(question.passage);
  const { idx } = parsePosAnswer<{ idx: number[] }>(value, { idx: [] });
  const selected = new Set(idx);
  const colorClass =
    POS_PALETTE[
      Math.max(
        0,
        question.categories.findIndex((c) => c.id === question.categoryId),
      ) % POS_PALETTE.length
    ];

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
              selected.has(i) ? cn("border font-semibold", colorClass) : "hover:bg-accent/50",
              readOnly && "cursor-default",
            )}
          >
            {token}
          </button>
        ))}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        סימנתם {selected.size} מתוך {question.needed} מילים.
      </p>
    </div>
  );
}

function SortWords({
  question,
  value,
  readOnly,
  onChange,
}: {
  question: Extract<RunnerPosQuestion, { posKind: "sort" }>;
  value: string;
  readOnly?: boolean | undefined;
  onChange?: ((text: string) => void) | undefined;
}) {
  const tokens = posTokenize(question.passage);
  const { assign } = parsePosAnswer<{ assign: Record<string, string> }>(value, { assign: {} });
  const colorOf = (categoryId: string) => {
    const i = question.categories.findIndex((c) => c.id === categoryId);
    return POS_PALETTE[Math.max(0, i) % POS_PALETTE.length];
  };
  const labelOf = (categoryId: string) =>
    question.categories.find((c) => c.id === categoryId)?.label ?? categoryId;

  const choose = (index: number, categoryId: string | null) => {
    if (readOnly) return;
    const next = { ...assign };
    if (categoryId) next[String(index)] = categoryId;
    else delete next[String(index)];
    onChange?.(JSON.stringify({ assign: next }));
  };

  const answeredCount = Object.keys(assign).length;
  const markedCount = Object.keys(question.marked).length;

  return (
    <div>
      <p className="reading-text flex flex-wrap gap-x-1 gap-y-2">
        {tokens.map((token, i) => {
          const isMarked = question.marked[i] !== undefined;
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
                    chosen ? colorOf(chosen) : "border-border bg-background",
                  )}
                >
                  {token}
                  {chosen && <span className="mx-1 text-xs font-normal">({labelOf(chosen)})</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent
                dir="rtl"
                align="center"
                collisionPadding={12}
                className="w-[min(16rem,calc(100vw-2rem))] space-y-2 text-start"
              >
                <p className="text-sm font-semibold text-primary">
                  {posCleanWord(token)} — מה חלק הדיבר?
                </p>
                {question.categories.map((c) => (
                  <Button
                    key={c.id}
                    variant={chosen === c.id ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => choose(i, c.id)}
                  >
                    {c.label}
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
  question,
  value,
  readOnly,
  onChange,
}: {
  question: Extract<RunnerPosQuestion, { posKind: "convert" }>;
  value: string;
  readOnly?: boolean | undefined;
  onChange?: ((text: string) => void) | undefined;
}) {
  const { values } = parsePosAnswer<{ values: string[] }>(value, { values: [] });

  const setAt = (index: number, text: string) => {
    const next = [...values];
    while (next.length < question.rows.length) next.push("");
    next[index] = text;
    onChange?.(JSON.stringify({ values: next }));
  };

  return (
    <div className="mt-3 space-y-3">
      {question.rows.map((row, i) => (
        <div key={row.word} className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div>
            <Label className="text-sm text-muted-foreground">המילה מהמאמר</Label>
            <p className="reading-text mt-1 font-semibold">{row.word}</p>
          </div>
          <span className="text-sm text-muted-foreground sm:pb-3">{row.direction}</span>
          <div>
            <Label htmlFor={`${question.id}-${i}`} className="text-sm text-muted-foreground">
              התשובה שלי
            </Label>
            <Input
              id={`${question.id}-${i}`}
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
