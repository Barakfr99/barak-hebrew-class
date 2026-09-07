import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const COMPARE_OPTIONS = [
  "מעניין הרבה יותר",
  "מעניין קצת יותר",
  "בערך אותו דבר",
  "שיעור רגיל מעניין יותר בשבילי",
];

const HELP_OPTIONS = [
  "לא נכנסתי לדף העזרה",
  "הצצתי בו פעם אחת",
  "השתמשתי בו כמה פעמים",
  "נעזרתי בו לאורך כל התרגול",
];

export function FeedbackForm({
  studentId,
  taskId,
  taskTitle,
  markFinished = true,
  onDone,
}: {
  studentId: string;
  taskId?: string | null;
  taskTitle?: string | null;
  markFinished?: boolean;
  onDone: () => Promise<void> | void;
}) {
  const [clarity, setClarity] = useState<number | null>(null);
  const [learning, setLearning] = useState<number | null>(null);
  const [compare, setCompare] = useState<string | null>(null);
  const [helpUsage, setHelpUsage] = useState<string | null>(null);
  const [unclear, setUnclear] = useState("");
  const [saving, setSaving] = useState(false);

  const valid = clarity && learning && compare && helpUsage;

  const submit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("feedback").upsert(
        {
          student_id: studentId,
          task_id: taskId ?? null,
          clarity_scale: clarity,
          learning_scale: learning,
          compare_lesson: compare,
          help_page_usage: helpUsage,
          still_unclear: unclear.trim(),
        },
        { onConflict: "student_id,task_id" },
      );
      if (error) throw error;
      if (markFinished) {
        await supabase
          .from("students")
          .update({ stage: "done", finished_at: new Date().toISOString() })
          .eq("id", studentId);
      }
      await onDone();
    } catch {
      toast.error("המשוב לא נשמר. נסו שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">משוב קצר — חמש שאלות בלבד</h2>
        {taskTitle && <p className="text-sm text-muted-foreground">על המשימה: {taskTitle}</p>}
        <p className="mt-1 text-muted-foreground">זה השלב האחרון, וזה לוקח פחות מדקה.</p>
      </div>

      <ScaleQuestion
        index={1}
        label="עד כמה המושגים המרכזיים שתרגלנו היו ברורים לך?"
        minLabel="בכלל לא ברורים"
        maxLabel="ברורים מאוד"
        value={clarity}
        onChange={setClarity}
      />
      <ScaleQuestion
        index={2}
        label="עד כמה הצלחת ללמוד ולהבין את החומר בעזרת התרגול הזה?"
        minLabel="לא הצלחתי"
        maxLabel="הצלחתי מאוד"
        value={learning}
        onChange={setLearning}
      />
      <ChoiceQuestion
        index={3}
        label="איך היה התרגול הזה בהשוואה לשיעור רגיל?"
        options={COMPARE_OPTIONS}
        value={compare}
        onChange={setCompare}
      />
      <ChoiceQuestion
        index={4}
        label="עד כמה השתמשת בדף העזרה?"
        options={HELP_OPTIONS}
        value={helpUsage}
        onChange={setHelpUsage}
      />

      <div className="rounded-3xl border border-border bg-card p-5">
        <Label htmlFor="unclear" className="reading-text font-medium">
          5. דבר אחד שעדיין לא ברור לי הוא...
        </Label>
        <Textarea
          id="unclear"
          value={unclear}
          onChange={(e) => setUnclear(e.target.value)}
          rows={3}
          className="mt-2 reading-text bg-background"
          placeholder="אפשר לכתוב בקצרה"
        />
      </div>

      <Button size="lg" disabled={!valid || saving} onClick={() => void submit()}>
        {saving ? "שולחים..." : "שליחת המשוב וסיום"}
      </Button>
      {!valid && (
        <p className="text-sm text-muted-foreground">
          כדי לסיים יש לענות על ארבע השאלות הראשונות.
        </p>
      )}
    </div>
  );
}

function ScaleQuestion({
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
      <div className="mt-3 flex items-center gap-2">
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

function ChoiceQuestion({
  index,
  label,
  options,
  value,
  onChange,
}: {
  index: number;
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="reading-text font-medium">
        {index}. {label}
      </p>
      <div className="mt-3 space-y-2">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
              value === option ? "border-primary bg-primary/8" : "border-border bg-background",
            )}
          >
            <input
              type="radio"
              name={`feedback-${index}`}
              className="size-4 accent-[var(--primary)]"
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span className="reading-text">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
