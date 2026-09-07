import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** ערך אחיד של הערה לתשובה בודדת: טקסט חופשי + ניקוד אופציונלי. */
export type AnswerNoteValue = {
  note: string;
  score: number | null;
};

/**
 * תיבת "הערה לתשובה" אחידה לכל משימות האתר.
 * הרכיב לא ניגש לבסיס הנתונים — כל משימה שומרת לטבלה שלה דרך onSave,
 * כך שהעיצוב וההתנהגות אחידים בעוד הנתונים נשארים מופרדים בין משימות.
 */
export function AnswerNoteBox({
  id,
  value,
  onSave,
  label = "הערה לתשובה (התלמיד/ה יראה אותה רק אם תמלאו כאן משהו)",
  maxScore,
}: {
  id: string;
  value: AnswerNoteValue;
  onSave: (next: AnswerNoteValue) => Promise<void> | void;
  label?: string;
  maxScore?: number;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [score, setScore] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const noteValue = note ?? value.note;
  const scoreValue = score ?? (value.score != null ? String(value.score) : "");

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const schedule = (nextNote: string, nextScore: string) => {
    if (timer.current) clearTimeout(timer.current);
    setStatus("saving");
    timer.current = setTimeout(() => {
      const trimmed = nextScore.trim();
      const parsed = trimmed === "" ? null : Number(trimmed);
      void Promise.resolve(
        onSave({
          note: nextNote,
          score: parsed != null && Number.isFinite(parsed) ? parsed : null,
        }),
      )
        .then(() => setStatus("saved"))
        .catch(() => setStatus("idle"));
    }, 700);
  };

  return (
    <div className="mt-3 rounded-xl bg-secondary/50 p-3">
      <Label htmlFor={`answer-note-${id}`} className="text-xs">
        {label}
      </Label>
      <Textarea
        id={`answer-note-${id}`}
        rows={2}
        className="mt-1 bg-background"
        value={noteValue}
        onChange={(e) => {
          setNote(e.target.value);
          schedule(e.target.value, scoreValue);
        }}
      />
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div className="w-28">
          <Label htmlFor={`answer-score-${id}`} className="text-xs">
            ניקוד {maxScore != null ? `(מתוך ${maxScore})` : "(לא חובה)"}
          </Label>
          <Input
            id={`answer-score-${id}`}
            className="mt-1 bg-background"
            inputMode="numeric"
            value={scoreValue}
            onChange={(e) => {
              setScore(e.target.value);
              schedule(noteValue, e.target.value);
            }}
          />
        </div>
        <p className="pb-2 text-xs text-muted-foreground">
          {status === "saving" ? "שומרים..." : status === "saved" ? "נשמר" : "נשמר אוטומטית"}
        </p>
      </div>
    </div>
  );
}
