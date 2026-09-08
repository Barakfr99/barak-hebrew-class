import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { InfoHint, InfoTerm } from "@/components/practice/InfoHint";
import {
  optionIsCorrect,
  optionText,
  optionWhy,
  type RunnerNote,
  type RunnerOption,
  type RunnerQuestion,
} from "@/lib/task-runner/types";
import type { RunnerAnswerNote } from "@/lib/task-runner/data";

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
}: {
  question: RunnerQuestion;
  answers: Record<string, string>;
  onChange: (id: string, value: string) => void;
  readOnly: boolean;
  notes: Record<string, RunnerAnswerNote>;
  showAnswers?: boolean;
  /** כפתור הקראה לצד טקסט — מסופק רק כשההקראה מופעלת לתלמיד/ה. */
  renderSpeak?: ((id: string, text: string) => ReactNode) | undefined;
}) {
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
