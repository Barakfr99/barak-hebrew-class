import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

export type NB10FeedbackValues = {
  clarity_scale: number | null;
  learning_scale: number | null;
  assistant_scale: number | null;
  compare_lesson: string | null;
  help_page_usage: string | null;
  still_unclear: string | null;
};

const COMPARE_OPTIONS = [
  "הבנתי יותר טוב מבשיעור רגיל",
  "בערך אותו דבר",
  "הבנתי פחות טוב מבשיעור רגיל",
];

const HELP_OPTIONS = ["השתמשתי בו הרבה", "השתמשתי בו קצת", "לא השתמשתי בו בכלל"];

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

/** משוב מסכם למשימה "התחלות חדשות (מותאם)" — שש שאלות. */
export function NB10FeedbackStep({
  readOnly,
  initial,
  submitting,
  onSubmit,
}: {
  readOnly: boolean;
  initial?: NB10FeedbackValues | null;
  submitting: boolean;
  onSubmit: (values: NB10FeedbackValues) => void;
}) {
  const [clarity, setClarity] = useState<number | null>(initial?.clarity_scale ?? null);
  const [learning, setLearning] = useState<number | null>(initial?.learning_scale ?? null);
  const [assistant, setAssistant] = useState<number | null>(initial?.assistant_scale ?? null);
  const [compare, setCompare] = useState(initial?.compare_lesson ?? "");
  const [help, setHelp] = useState(initial?.help_page_usage ?? "");
  const [unclear, setUnclear] = useState(initial?.still_unclear ?? "");

  if (readOnly) {
    return (
      <div className="space-y-3 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold">המשוב שלך נשמר</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>בהירות המושגים: {initial?.clarity_scale ?? "—"}</li>
          <li>תחושת הצלחה בלמידה: {initial?.learning_scale ?? "—"}</li>
          <li>העוזר סייע: {initial?.assistant_scale ?? "—"}</li>
          <li>בהשוואה לשיעור רגיל: {initial?.compare_lesson ?? "—"}</li>
          <li>שימוש בדף העזרה: {initial?.help_page_usage ?? "—"}</li>
          <li>מה עדיין לא ברור: {initial?.still_unclear ?? "—"}</li>
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
          clarity_scale: clarity,
          learning_scale: learning,
          assistant_scale: assistant,
          compare_lesson: compare,
          help_page_usage: help,
          still_unclear: unclear.trim() === "" ? null : unclear.trim(),
        });
      }}
    >
      <div>
        <h2 className="text-xl font-bold">משוב מסכם</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          עוד שש שאלות קצרות, ואז מגישים את המשימה.
        </p>
      </div>

      <Scale label="עד כמה המושגים בפעילות היו ברורים לך?" value={clarity} onChange={setClarity} />
      <Scale
        label="עד כמה הרגשת שהצלחת ללמוד מהפעילות?"
        value={learning}
        onChange={setLearning}
      />

      <div>
        <Label className="text-base">בהשוואה לשיעור רגיל בכיתה, איך היה לך?</Label>
        <RadioGroup value={compare} onValueChange={setCompare} className="mt-2 space-y-2">
          {COMPARE_OPTIONS.map((option) => (
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
        <Label className="text-base">האם השתמשת בדף העזרה במהלך הפעילות?</Label>
        <RadioGroup value={help} onValueChange={setHelp} className="mt-2 space-y-2">
          {HELP_OPTIONS.map((option) => (
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

      <Scale
        label="עד כמה העוזר (הצ'אט המלווה) סייע לך להתקדם בפתרון המשימה?"
        value={assistant}
        onChange={setAssistant}
      />

      <div>
        <Label className="text-base" htmlFor="nb10-unclear">
          דבר אחד שעדיין לא ברור לי הוא...
        </Label>
        <Textarea
          id="nb10-unclear"
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
