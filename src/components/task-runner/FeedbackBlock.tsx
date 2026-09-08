import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_FEEDBACK, type RunnerFeedbackConfig } from "@/lib/task-runner/types";

export type FeedbackValues = {
  clarity: number | null;
  learning: number | null;
  assistant: number | null;
  compare: string | null;
  help: string | null;
  unclear: string | null;
};

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <Label className="text-base">{label}</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            type="button"
            variant={value === n ? "default" : "outline"}
            className="size-12 rounded-full text-base"
            onClick={() => onChange(n)}
          >
            {n}
          </Button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">1 = מעט מאוד · 5 = מאוד</p>
    </div>
  );
}

/** בלוק משוב מסכם גנרי — שש שאלות, תוויות/אפשרויות מוגדרות ב-definition. */
export function FeedbackBlock({
  config,
  readOnly,
  initial,
  submitting,
  onSubmit,
}: {
  config?: RunnerFeedbackConfig | undefined;
  readOnly: boolean;
  initial?: FeedbackValues | null;
  submitting: boolean;
  onSubmit: (values: FeedbackValues) => void;
}) {
  const cfg = config ?? DEFAULT_FEEDBACK;
  const [clarity, setClarity] = useState<number | null>(initial?.clarity ?? null);
  const [learning, setLearning] = useState<number | null>(initial?.learning ?? null);
  const [assistant, setAssistant] = useState<number | null>(initial?.assistant ?? null);
  const [compare, setCompare] = useState(initial?.compare ?? "");
  const [help, setHelp] = useState(initial?.help ?? "");
  const [unclear, setUnclear] = useState(initial?.unclear ?? "");

  if (readOnly) {
    return (
      <div className="space-y-3 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold">המשוב שלך נשמר</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>בהירות המושגים: {initial?.clarity ?? "—"}</li>
          <li>תחושת הצלחה בלמידה: {initial?.learning ?? "—"}</li>
          <li>העוזר סייע: {initial?.assistant ?? "—"}</li>
          <li>בהשוואה לשיעור רגיל: {initial?.compare ?? "—"}</li>
          <li>שימוש בדף העזרה: {initial?.help ?? "—"}</li>
          <li>מה עדיין לא ברור: {initial?.unclear ?? "—"}</li>
        </ul>
      </div>
    );
  }

  const valid =
    clarity !== null && learning !== null && assistant !== null && compare !== "" && help !== "";

  return (
    <form
      className="space-y-7 rounded-3xl border border-border bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || submitting) return;
        onSubmit({
          clarity,
          learning,
          assistant,
          compare,
          help,
          unclear: unclear.trim() === "" ? null : unclear.trim(),
        });
      }}
    >
      <div>
        <h2 className="text-xl font-bold">משוב מסכם</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          עוד שש שאלות קצרות, ואז מגישים את המשימה.
        </p>
      </div>

      <Scale label={cfg.clarityLabel} value={clarity} onChange={setClarity} />
      <Scale label={cfg.learningLabel} value={learning} onChange={setLearning} />

      <div>
        <Label className="text-base">{cfg.compareLabel}</Label>
        <RadioGroup value={compare} onValueChange={setCompare} className="mt-2 space-y-2">
          {cfg.compareOptions.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border p-3"
            >
              <RadioGroupItem value={option} />
              <span className="text-base">{option}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-base">{cfg.helpLabel}</Label>
        <RadioGroup value={help} onValueChange={setHelp} className="mt-2 space-y-2">
          {cfg.helpOptions.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border p-3"
            >
              <RadioGroupItem value={option} />
              <span className="text-base">{option}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <Scale label={cfg.assistantLabel} value={assistant} onChange={setAssistant} />

      <div>
        <Label className="text-base" htmlFor="runner-unclear">
          {cfg.unclearLabel}
        </Label>
        <Textarea
          id="runner-unclear"
          value={unclear}
          onChange={(e) => setUnclear(e.target.value)}
          rows={3}
          className="mt-2"
        />
      </div>

      <Button type="submit" size="lg" disabled={!valid || submitting} className="w-full">
        {submitting ? "שולחים..." : "הגשה סופית של המשימה"}
      </Button>
      {!valid && (
        <p className="text-sm text-muted-foreground">
          כדי להגיש יש לענות על חמש השאלות הראשונות (השאלה הפתוחה לא חובה).
        </p>
      )}
    </form>
  );
}
