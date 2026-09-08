import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { InfoHint, InfoTerm } from "@/components/practice/InfoHint";
import type { RunnerNote, RunnerQuestion } from "@/lib/task-runner/types";
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

/** רכיב שאלה גנרי — מרנדר לפי question.kind, בלי תלות בתוכן משימה ספציפית. */
export function QuestionRenderer({
  question,
  answers,
  onChange,
  readOnly,
  notes,
}: {
  question: RunnerQuestion;
  answers: Record<string, string>;
  onChange: (id: string, value: string) => void;
  readOnly: boolean;
  notes: Record<string, RunnerAnswerNote>;
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
        <TeacherNote note={notes[question.id]} />
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
      <TeacherNote note={notes[question.id]} />
    </div>
  );
}
