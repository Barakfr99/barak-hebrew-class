import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MIFeedbackValues } from "./data";

/** שאלון המשוב של המשימה — מוצג אחרי ההגשה. */
export function MIFeedbackStep({
  initial,
  submitting,
  onSubmit,
}: {
  initial: MIFeedbackValues | null;
  submitting: boolean;
  onSubmit: (values: MIFeedbackValues) => void;
}) {
  const [clarity, setClarity] = useState<number | null>(initial?.clarity_scale ?? null);
  const [learning, setLearning] = useState<number | null>(initial?.learning_scale ?? null);
  const [explanation, setExplanation] = useState<number | null>(initial?.explanation_scale ?? null);
  const [hardest, setHardest] = useState(initial?.hardest_part ?? "");
  const [unclear, setUnclear] = useState(initial?.still_unclear ?? "");

  const valid = clarity && learning && explanation;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-bold">משוב קצר — פחות מדקה</h3>
        <p className="mt-1 text-muted-foreground">
          התשובות שלכם עוזרות לי לבנות את התרגול הבא. המשימה כבר הוגשה ונשמרה.
        </p>
      </div>

      <Scale
        index={1}
        label="עד כמה ההבדל בין נושא למסר ברור לך עכשיו?"
        minLabel="בכלל לא ברור"
        maxLabel="ברור מאוד"
        value={clarity}
        onChange={setClarity}
      />
      <Scale
        index={2}
        label="עד כמה הרגשת שהתרגול הזה שיפר לך את ניסוח הרעיון המרכזי?"
        minLabel="לא שיפר"
        maxLabel="שיפר מאוד"
        value={learning}
        onChange={setLearning}
      />
      <Scale
        index={3}
        label="עד כמה ההסבר בעמוד הראשון (שלושת הצעדים) עזר לך?"
        minLabel="לא עזר"
        maxLabel="עזר מאוד"
        value={explanation}
        onChange={setExplanation}
      />

      <div className="rounded-3xl border border-border bg-card p-5">
        <Label htmlFor="mi-hardest" className="reading-text font-medium">
          4. מה היה החלק הקשה ביותר בתרגול?
        </Label>
        <Textarea
          id="mi-hardest"
          rows={2}
          className="mt-2 bg-background"
          value={hardest}
          onChange={(e) => setHardest(e.target.value)}
          placeholder="אפשר בקצרה"
        />
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <Label htmlFor="mi-unclear" className="reading-text font-medium">
          5. דבר אחד שעדיין לא ברור לי הוא...
        </Label>
        <Textarea
          id="mi-unclear"
          rows={2}
          className="mt-2 bg-background"
          value={unclear}
          onChange={(e) => setUnclear(e.target.value)}
          placeholder="אפשר בקצרה"
        />
      </div>

      <Button
        size="lg"
        disabled={!valid || submitting}
        onClick={() =>
          onSubmit({
            clarity_scale: clarity,
            learning_scale: learning,
            explanation_scale: explanation,
            hardest_part: hardest.trim(),
            still_unclear: unclear.trim(),
          })
        }
      >
        {submitting ? "שולחים..." : "שליחת המשוב"}
      </Button>
      {!valid && (
        <p className="text-sm text-muted-foreground">
          כדי לשלוח יש לדרג את שלוש השאלות הראשונות.
        </p>
      )}
    </div>
  );
}

function Scale({
  index,
  label,
  minLabel,
  maxLabel,
  value,
  onChange,
}: {
  index: number;
  label: string;
  minLabel: string;
  maxLabel: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="reading-text font-medium">
        {index}. {label}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "size-11 rounded-xl border text-lg font-semibold transition-colors",
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent/50",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-sm text-muted-foreground">
        <span>1 — {minLabel}</span>
        <span>5 — {maxLabel}</span>
      </div>
    </div>
  );
}
