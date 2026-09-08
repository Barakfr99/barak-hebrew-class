import { useEffect, useState } from "react";
import { Info, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MI_GATE_SECONDS } from "./content";

/**
 * חלון הוראות (פופ-אפ) שנפתח בכניסה לעמוד התרגיל.
 * נסגר רק בלחיצה על "קראתי והבנתי את ההוראות" — אין סגירה בלחיצה בחוץ או ב-Esc.
 */
export function InstructionsGate({
  open,
  title,
  lines,
  onConfirm,
}: {
  open: boolean;
  title: string;
  lines: string[];
  onConfirm: () => void;
}) {
  const [left, setLeft] = useState(MI_GATE_SECONDS);

  useEffect(() => {
    if (!open) return;
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, open]);

  return (
    <Dialog open={open}>
      <DialogContent
        dir="rtl"
        className="max-w-lg text-right [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Info className="size-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <ul className="space-y-3">
          {lines.map((line) => (
            <li key={line} className="reading-text flex gap-2">
              <span className="text-primary">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button size="lg" disabled={left > 0} onClick={onConfirm}>
            קראתי והבנתי את ההוראות
          </Button>
          {left > 0 && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Timer className="size-4" /> הכפתור ייפתח בעוד {left} שניות
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
