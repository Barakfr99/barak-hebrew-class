import type { Question } from "@/lib/practice";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SpeakButton } from "./SpeakButton";
import type { SpeechControls } from "./PassageReader";

export function QuestionBlock({
  question,
  index,
  value,
  onChange,
  readOnly,
  speech,
}: {
  question: Question;
  index: number;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  speech: SpeechControls;
}) {
  const promptId = `${question.id}:prompt`;
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
            {question.prompt}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{question.points} נקודות</p>
        </div>
        {speech.enabled && (
          <SpeakButton
            onClick={() => speech.speak({ id: promptId, text: question.prompt })}
            active={speech.speakingId === promptId}
            label="הקראת השאלה"
          />
        )}
      </div>

      <div className="mt-4 space-y-3">
        {question.kind === "multiple_choice" ? (
          question.options.map((option, oIndex) => {
            const optionId = `${question.id}:o${oIndex}`;
            const selected = value === option;
            return (
              <div key={optionId} className="flex items-center gap-2">
                <label
                  className={cn(
                    "flex flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
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
                    onChange={() => onChange?.(option)}
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
          })
        ) : (
          <div>
            <Label htmlFor={question.id} className="text-sm text-muted-foreground">
              התשובה שלי
            </Label>
            <Textarea
              id={question.id}
              value={value}
              readOnly={readOnly}
              onChange={(e) => onChange?.(e.target.value)}
              rows={4}
              className="mt-1 reading-text bg-background"
              placeholder={readOnly ? "" : "כתבו כאן..."}
            />
          </div>
        )}
      </div>
    </div>
  );
}
