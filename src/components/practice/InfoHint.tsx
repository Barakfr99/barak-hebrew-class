import { useState } from "react";
import { Info, Lightbulb } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { QuestionNote } from "@/lib/practice";

/**
 * טיפ או הגדרת מושג: אייקון קטן שנפתח בהובר במחשב ובהקשה במובייל.
 * רכיב גנרי — מקבל כל טיפ/הגדרה מתוך נתוני השאלה.
 */
export function InfoHint({ note }: { note: QuestionNote }) {
  const [open, setOpen] = useState(false);
  const Icon = note.kind === "tip" ? Lightbulb : Info;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={note.title}
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-accent/60"
        >
          <Icon className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        dir="rtl"
        align="end"
        side="bottom"
        collisionPadding={12}
        className="w-[min(20rem,calc(100vw-2rem))] text-start"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <p className="text-sm font-bold text-primary">{note.title}</p>
        <p className="reading-text mt-1 font-bold">{note.body}</p>
      </PopoverContent>
    </Popover>
  );
}
