import type { Question, QuestionGroup } from "@/lib/practice";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SpeakButton } from "./SpeakButton";
import { InfoHint } from "./InfoHint";
import { ParagraphJump } from "./ParagraphJump";
import type { SpeechControls } from "./PassageReader";

const ROWS: Record<Question["input_size"], number> = { short: 3, long: 5, essay: 10 };

export function QuestionBlock({
  group,
  index,
  taskId,
  paragraphs,
  answers,
  onChange,
  readOnly,
  speech,
}: {
  group: QuestionGroup;
  index: number;
  taskId: string;
  paragraphs?: string[] | null;
  answers: Record<string, string>;
  onChange?: (questionId: string, value: string) => void;
  readOnly?: boolean;
  speech: SpeechControls;
}) {
  const first = group.items[0];
  if (!first) return null;
  const promptId = `${first.id}:prompt`;
  const multi = group.items.length > 1;
  const showPoints = group.items.some((q) => typeof q.points === "number");
  const totalPoints = group.items.reduce((sum, q) => sum + (q.points ?? 0), 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
          {index + 1}
        </span>
        <div className="flex-1">
          <p
            className={cn(
              "reading-text rounded-md font-medium",
              speech.speakingId === promptId && "bg-speak-highlight",
            )}
          >
            {group.prompt}
          </p>
          {showPoints && (
            <p className="mt-1 text-sm text-muted-foreground">{totalPoints} נקודות</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {group.note && <InfoHint note={group.note} />}
          {speech.enabled && (
            <SpeakButton
              onClick={() => speech.speak({ id: promptId, text: group.prompt })}
              active={speech.speakingId === promptId}
              label="הקראת השאלה"
            />
          )}
        </div>
      </div>

      {group.passage && (
        <div className="mt-4 rounded-2xl border border-dashed border-primary/40 bg-background p-4">
          <div className="flex items-start gap-3">
            <p className="reading-text flex-1 italic">{group.passage}</p>
            {speech.enabled && (
              <SpeakButton
                onClick={() =>
                  speech.speak({ id: `${first.id}:passage`, text: group.passage as string })
                }
                active={speech.speakingId === `${first.id}:passage`}
                label="הקראת הקטע"
              />
            )}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-5">
        {group.items.map((question) => {
          const value = answers[question.id] ?? "";
          const refs = question.paragraph_refs ?? [];
          return (
            <div key={question.id} className="space-y-2">
              {(multi || question.group_label) && question.group_label && (
                <p className="reading-text font-semibold text-primary">{question.group_label}</p>
              )}
              {refs.length > 0 && (
                <ParagraphJump
                  numbers={refs}
                  paragraphs={paragraphs}
                  eachSeparately={refs.length > 3}
                />
              )}

              {question.kind === "multiple_choice" ? (
                <div className="space-y-3">
                  {question.options.map((option, oIndex) => {
                    const optionId = `${question.id}:o${oIndex}`;
                    const selected = value === option;
                    return (
                      <div key={optionId} className="flex items-center gap-2">
                        <label
                          className={cn(
                            "flex flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-start transition-colors",
                            selected ? "border-primary bg-primary/8" : "border-border bg-background",
                            readOnly && "cursor-default opacity-90",
                            speech.speakingId === optionId && "bg-speak-highlight",
                          )}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            className="size-4 accent-[var(--primary)]"
                            checked={selected}
                            disabled={readOnly}
                            onChange={() => onChange?.(question.id, option)}
                          />
                          <span className="reading-text">{option}</span>
                        </label>
                        {speech.enabled && (
                          <SpeakButton
                            onClick={() => speech.speak({ id: optionId, text: option })}
                            active={speech.speakingId === optionId}
                            label="הקראת האפשרות"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <Label htmlFor={question.id} className="text-sm text-muted-foreground">
                    התשובה שלי
                  </Label>
                  <Textarea
                    id={question.id}
                    value={value}
                    readOnly={readOnly}
                    onChange={(e) => onChange?.(question.id, e.target.value)}
                    rows={ROWS[question.input_size] ?? 3}
                    className="mt-1 reading-text bg-background"
                    placeholder={readOnly ? "" : "כתבו כאן..."}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
