import { useEffect, useState } from "react";
import { Info, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MI_GATE_SECONDS } from "./content";

/**
 * מסך הוראות עם טיימר: הכפתור נפתח רק אחרי שחלפו השניות שנקבעו.
 * רק לאחר האישור נחשף התרגול שמתחתיו.
 */
export function InstructionsGate({
  title,
  lines,
  onConfirm,
}: {
  title: string;
  lines: string[];
  onConfirm: () => void;
}) {
  const [left, setLeft] = useState(MI_GATE_SECONDS);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  return (
    <div className="rounded-3xl border border-primary/40 bg-accent/40 p-6">
      <div className="flex items-center gap-2 text-primary">
        <Info className="size-5" />
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <ul className="mt-4 space-y-3">
        {lines.map((line) => (
          <li key={line} className="reading-text flex gap-2">
            <span className="text-primary">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={left > 0} onClick={onConfirm}>
          קראתי והבנתי את ההוראות
        </Button>
        {left > 0 && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Timer className="size-4" /> הכפתור ייפתח בעוד {left} שניות
          </span>
        )}
      </div>
    </div>
  );
}
